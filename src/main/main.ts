import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import Store from 'electron-store';
import * as yaml from 'js-yaml';
import type { Project, Settings, QuickNote, EnvVariable, VirtualProject, ProjectStatus } from '../shared/types.js';
import { WBS_TEMPLATE } from '../shared/constants.js';
import { ProcessRegistry, killProcess, findProcessByPort, findTerminalProcess, scanProjectProcesses } from './processManager.js';

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

// Initialize electron-store for persistent configuration
interface StoreSchema {
  rootDirectory?: string;
  settings?: Settings;
  quickNotes?: QuickNote[];
  virtualProjects?: VirtualProject[];
  projectStatuses?: Record<string, ProjectStatus>;
}

const store = new Store<StoreSchema>({
  name: 'fulcrum-config',
});

// Initialize process registry
const processRegistry = new ProcessRegistry();

// Default settings
const DEFAULT_SETTINGS: Settings = {
  editorCommand: 'antigravity',
  terminalCommand: undefined,
};

/**
 * Get settings with defaults
 */
function getSettings(): Settings {
  const settings = store.get('settings');
  if (!settings) {
    store.set('settings', DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return settings;
}

/**
 * Detect project type by checking for marker files
 */
async function detectProjectType(projectPath: string): Promise<Project['type']> {
  try {
    const files = await fs.readdir(projectPath);

    // Check for Node.js
    if (files.includes('package.json')) {
      return 'node';
    }

    // Check for Python
    if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('venv')) {
      return 'python';
    }

    // Check for Rust
    if (files.includes('Cargo.toml')) {
      return 'rust';
    }

    // Check for Git (fallback)
    if (files.includes('.git')) {
      return 'unknown';
    }

    return 'unknown';
  } catch (error) {
    console.error(`Error detecting project type for ${projectPath}:`, error);
    return 'unknown';
  }
}

/**
 * Parse wbs.yaml and extract project metadata
 */
async function parseWbsMetadata(projectPath: string, lastModified: number): Promise<Project['meta'] | undefined> {
  try {
    const wbsPath = path.join(projectPath, 'wbs.yaml');

    // Check if wbs.yaml exists
    try {
      await fs.access(wbsPath);
    } catch {
      return undefined; // No wbs.yaml, return undefined
    }

    // Read and parse wbs.yaml
    const wbsContent = await fs.readFile(wbsPath, 'utf-8');
    const wbsData = yaml.load(wbsContent) as any;

    if (!wbsData) {
      return undefined;
    }

    // Extract tech stack - ensure it's always an array
    let techStack: string[] = [];
    const rawTechStack = wbsData.project_info?.tech_stack;

    if (Array.isArray(rawTechStack)) {
      techStack = rawTechStack.filter((item: any) => typeof item === 'string');
    } else if (typeof rawTechStack === 'string') {
      // Handle case where tech_stack is a comma-separated string
      techStack = rawTechStack.split(',').map((s: string) => s.trim()).filter(Boolean);
    } else if (typeof rawTechStack === 'object' && rawTechStack !== null) {
      // Handle nested object structure like: { frontend: ["React"], backend: ["Node"] }
      techStack = Object.values(rawTechStack)
        .flat()
        .filter((item: any) => typeof item === 'string');
    }

    // Extract current phase (first phase that has incomplete tasks)
    let currentPhase: string | undefined;
    if (wbsData.phases && Array.isArray(wbsData.phases)) {
      const activePhase = wbsData.phases.find((phase: any) => {
        // Check if phase has tasks
        if (!phase.tasks || !Array.isArray(phase.tasks) || phase.tasks.length === 0) {
          return false; // Skip phases with no tasks
        }
        // Phase is active if it has at least one task that is not "Done"
        return phase.tasks.some((task: any) => task.status !== 'Done');
      });

      if (activePhase && activePhase.name) {
        currentPhase = activePhase.name;
      } else if (wbsData.phases.length > 0) {
        // All phases have all tasks done
        currentPhase = 'All Phases Complete';
      }
    }

    // Calculate if project is a zombie (not modified in 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const isZombie = lastModified < thirtyDaysAgo;

    // Extract project status from wbs.yaml (if present)
    let projectStatus: ProjectStatus | undefined;
    if (wbsData.project_info?.status) {
      const statusFromYaml = wbsData.project_info.status.toLowerCase();
      if (['active', 'maintenance', 'archive', 'idea'].includes(statusFromYaml)) {
        projectStatus = statusFromYaml as ProjectStatus;
      }
    }

    return {
      techStack,
      currentPhase,
      isZombie,
      projectStatus,
    };
  } catch (error) {
    console.error(`Error parsing WBS metadata for ${projectPath}:`, error);
    return undefined; // Return undefined on error, don't crash
  }
}

/**
 * Scan a directory for software projects
 */
async function scanProjects(rootPath: string): Promise<Project[]> {
  try {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    const projects: Project[] = [];

    // Load stored project statuses from electron-store
    const storedStatuses = store.get('projectStatuses') || {};

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(rootPath, entry.name);
        const type = await detectProjectType(projectPath);

        // Only include directories that are identified as projects
        if (type !== 'unknown' || (await fs.readdir(projectPath)).includes('.git')) {
          const stats = await fs.stat(projectPath);

          // Parse wbs.yaml metadata
          const meta = await parseWbsMetadata(projectPath, stats.mtimeMs);

          // Merge status: YAML > electron-store > undefined
          const status = meta?.projectStatus || storedStatuses[projectPath];

          projects.push({
            name: entry.name,
            path: projectPath,
            type,
            lastModified: stats.mtimeMs,
            status,
            meta,
          });
        }
      }
    }

    return projects;
  } catch (error) {
    console.error('Error scanning projects:', error);
    throw error;
  }
}

/**
 * Launch a project in editor and terminal
 */
async function launchProject(projectPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = getSettings();
    const { editorCommand } = settings;
    const projectName = path.basename(projectPath);

    // Launch Editor
    try {
      const editorProcess = spawn(editorCommand, [projectPath], {
        detached: true,
        stdio: 'ignore',
      });

      if (editorProcess.pid) {
        // Register the editor process
        processRegistry.register({
          pid: editorProcess.pid,
          projectPath,
          projectName,
          type: 'editor',
          command: editorCommand,
          launchTime: Date.now(),
        });

        // Listen for process exit
        editorProcess.on('exit', () => {
          processRegistry.unregister(editorProcess.pid!);
        });
      }

      editorProcess.unref();
    } catch (error) {
      console.error('Error launching editor:', error);
      return {
        success: false,
        error: `Failed to launch editor "${editorCommand}". Please check your Settings.`,
      };
    }

    // Launch Terminal (OS-specific)
    try {
      let terminalCommand: string;

      switch (process.platform) {
        case 'darwin': // macOS
          terminalCommand = `open -a Terminal "${projectPath}"`;
          break;
        case 'win32': // Windows
          terminalCommand = `start cmd /k "cd /d ${projectPath}"`;
          break;
        case 'linux': // Linux
          terminalCommand = `gnome-terminal --working-directory="${projectPath}"`;
          break;
        default:
          console.warn('Unsupported platform for terminal launch');
          return { success: true }; // Editor launched successfully, terminal skipped
      }

      await execAsync(terminalCommand);

      // Try to find the terminal process PID (best effort)
      setTimeout(async () => {
        const terminalPid = await findTerminalProcess(projectPath);
        if (terminalPid) {
          processRegistry.register({
            pid: terminalPid,
            projectPath,
            projectName,
            type: 'terminal',
            command: terminalCommand,
            launchTime: Date.now(),
          });
        }
      }, 1000); // Wait 1 second for terminal to start
    } catch (error) {
      console.warn('Failed to launch terminal (non-critical):', error);
      // Terminal launch failure is non-critical, editor is primary
    }

    return { success: true };
  } catch (error) {
    console.error('Error in launchProject:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Parse a single .env file and extract environment variables
 */
async function parseEnvFile(projectPath: string, filename: string): Promise<EnvVariable[]> {
  try {
    const envPath = path.join(projectPath, filename);

    // Check if file exists
    try {
      await fs.access(envPath);
    } catch {
      return []; // File doesn't exist
    }

    // Read and parse .env file
    const content = await fs.readFile(envPath, 'utf-8');
    const variables: EnvVariable[] = [];

    content.split('\n').forEach((line) => {
      line = line.trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) return;

      // Parse KEY=VALUE format
      const equalIndex = line.indexOf('=');
      if (equalIndex === -1) return;

      const key = line.substring(0, equalIndex).trim();
      const value = line.substring(equalIndex + 1).trim();

      if (key && value) {
        variables.push({
          key,
          value,
          // Detect sensitive keys
          isSecret: /KEY|SECRET|PASSWORD|TOKEN|CREDENTIAL|AUTH/i.test(key),
          source: filename,
        });
      }
    });

    return variables;
  } catch (error) {
    console.error(`Error parsing ${filename} for ${projectPath}:`, error);
    return [];
  }
}

/**
 * Load and merge all .env files with priority order
 */
async function loadAllEnvVars(projectPath: string): Promise<EnvVariable[]> {
  // Priority order (low to high)
  const envFiles = [
    '.env',
    '.env.test',
    '.env.test.local',
    '.env.production',
    '.env.production.local',
    '.env.development',
    '.env.development.local',
    '.env.local',
  ];

  const mergedVars = new Map<string, EnvVariable>();

  // Read files in priority order (low to high)
  for (const filename of envFiles) {
    const vars = await parseEnvFile(projectPath, filename);
    vars.forEach((v) => {
      // Higher priority files override lower priority ones
      mergedVars.set(v.key, v);
    });
  }

  return Array.from(mergedVars.values());
}

/**
 * WBS File Operations
 */

/**
 * Check if wbs.yaml exists in project root
 */
async function checkWbsExists(projectPath: string): Promise<boolean> {
  try {
    const wbsPath = path.join(projectPath, 'wbs.yaml');
    await fs.access(wbsPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create wbs.yaml with default template
 */
async function createWbsTemplate(projectPath: string): Promise<void> {
  try {
    const wbsPath = path.join(projectPath, 'wbs.yaml');
    await fs.writeFile(wbsPath, WBS_TEMPLATE, 'utf-8');
  } catch (error) {
    console.error('Error creating WBS template:', error);
    throw error;
  }
}

/**
 * Read wbs.yaml content
 */
async function readWbs(projectPath: string): Promise<string> {
  try {
    const wbsPath = path.join(projectPath, 'wbs.yaml');
    const content = await fs.readFile(wbsPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading WBS:', error);
    throw error;
  }
}

/**
 * Save wbs.yaml content
 */
async function saveWbs(projectPath: string, content: string): Promise<void> {
  try {
    const wbsPath = path.join(projectPath, 'wbs.yaml');
    await fs.writeFile(wbsPath, content, 'utf-8');
  } catch (error) {
    console.error('Error saving WBS:', error);
    throw error;
  }
}

/**
 * Set up IPC handlers for communication with renderer process
 */
function setupIpcHandlers(): void {
  // Handler: Get the stored root directory
  ipcMain.handle('get-root-directory', async () => {
    try {
      const rootDirectory = store.get('rootDirectory');
      return rootDirectory || null;
    } catch (error) {
      console.error('Error getting root directory:', error);
      return null;
    }
  });

  // Handler: Open directory selection dialog
  ipcMain.handle('select-directory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Workspace Folder',
        buttonLabel: 'Select Folder',
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const selectedPath = result.filePaths[0];
      store.set('rootDirectory', selectedPath);
      return selectedPath;
    } catch (error) {
      console.error('Error selecting directory:', error);
      throw error;
    }
  });

  // Handler: Get all projects from the root directory
  ipcMain.handle('get-projects', async () => {
    try {
      const rootDirectory = store.get('rootDirectory');

      if (!rootDirectory) {
        throw new Error('No root directory configured');
      }

      // Check if directory exists
      try {
        await fs.access(rootDirectory);
      } catch {
        throw new Error('Root directory does not exist or is not accessible');
      }

      const projects = await scanProjects(rootDirectory);
      return projects;
    } catch (error) {
      console.error('Error getting projects:', error);
      throw error;
    }
  });

  // Handler: Get settings
  ipcMain.handle('get-settings', async () => {
    try {
      return getSettings();
    } catch (error) {
      console.error('Error getting settings:', error);
      return DEFAULT_SETTINGS;
    }
  });

  // Handler: Save settings
  ipcMain.handle('save-settings', async (_event, settings: Settings) => {
    try {
      store.set('settings', settings);
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  });

  // Handler: Launch project
  ipcMain.handle('launch-project', async (_event, projectPath: string) => {
    try {
      return await launchProject(projectPath);
    } catch (error) {
      console.error('Error launching project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to launch project',
      };
    }
  });

  // Handler: Check if WBS exists
  ipcMain.handle('check-wbs-exists', async (_event, projectPath: string) => {
    try {
      return await checkWbsExists(projectPath);
    } catch (error) {
      console.error('Error checking WBS exists:', error);
      return false;
    }
  });

  // Handler: Create WBS template
  ipcMain.handle('create-wbs-template', async (_event, projectPath: string) => {
    try {
      await createWbsTemplate(projectPath);
      return { success: true };
    } catch (error) {
      console.error('Error creating WBS template:', error);
      throw error;
    }
  });

  // Handler: Read WBS
  ipcMain.handle('read-wbs', async (_event, projectPath: string) => {
    try {
      return await readWbs(projectPath);
    } catch (error) {
      console.error('Error reading WBS:', error);
      throw error;
    }
  });

  // Handler: Save WBS
  ipcMain.handle('save-wbs', async (_event, projectPath: string, content: string) => {
    try {
      await saveWbs(projectPath, content);
      return { success: true };
    } catch (error) {
      console.error('Error saving WBS:', error);
      throw error;
    }
  });

  // Handler: Get quick notes
  ipcMain.handle('get-quick-notes', async () => {
    try {
      const notes = store.get('quickNotes', []);
      // Return most recent 10 notes, sorted by timestamp descending
      return notes
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting quick notes:', error);
      return [];
    }
  });

  // Handler: Save quick note
  ipcMain.handle('save-quick-note', async (_event, note: Omit<QuickNote, 'id' | 'timestamp'>) => {
    try {
      const notes = store.get('quickNotes', []);

      const newNote: QuickNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        ...note,
      };

      // Add new note and keep only most recent 100
      const updatedNotes = [newNote, ...notes].slice(0, 100);
      store.set('quickNotes', updatedNotes);

      return newNote;
    } catch (error) {
      console.error('Error saving quick note:', error);
      throw error;
    }
  });

  // Handler: Delete quick note
  ipcMain.handle('delete-quick-note', async (_event, noteId: string) => {
    try {
      const notes = store.get('quickNotes', []);
      const updatedNotes = notes.filter(note => note.id !== noteId);
      store.set('quickNotes', updatedNotes);
      return { success: true };
    } catch (error) {
      console.error('Error deleting quick note:', error);
      throw error;
    }
  });

  // Handler: Read .env files
  ipcMain.handle('read-env', async (_event, projectPath: string) => {
    try {
      return await loadAllEnvVars(projectPath);
    } catch (error) {
      console.error('Error reading .env files:', error);
      return [];
    }
  });

  // Handler: Update project status
  ipcMain.handle('update-project-status', async (_event, projectPath: string, status: ProjectStatus | null) => {
    try {
      const statuses = store.get('projectStatuses') || {};

      if (status === null) {
        // Remove status
        delete statuses[projectPath];
      } else {
        statuses[projectPath] = status;
      }

      store.set('projectStatuses', statuses);

      // Optional: Also save to wbs.yaml if it exists
      const wbsPath = path.join(projectPath, 'wbs.yaml');
      try {
        await fs.access(wbsPath);
        const wbsContent = await fs.readFile(wbsPath, 'utf-8');
        const wbsData = yaml.load(wbsContent) as any;

        if (wbsData?.project_info) {
          if (status === null) {
            delete wbsData.project_info.status;
          } else {
            wbsData.project_info.status = status;
          }
          await fs.writeFile(wbsPath, yaml.dump(wbsData), 'utf-8');
        }
      } catch (yamlError) {
        // wbs.yaml doesn't exist or error, ignore (electron-store only)
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating project status:', error);
      throw error;
    }
  });

  // Handler: Get all project statuses
  ipcMain.handle('get-project-statuses', async () => {
    try {
      return store.get('projectStatuses') || {};
    } catch (error) {
      console.error('Error getting project statuses:', error);
      return {};
    }
  });

  // Handler: Get virtual projects
  ipcMain.handle('get-virtual-projects', async () => {
    try {
      const virtualProjects = store.get('virtualProjects', []);
      return virtualProjects.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Error getting virtual projects:', error);
      return [];
    }
  });

  // Handler: Save virtual project (create or update)
  ipcMain.handle('save-virtual-project', async (_event, vp: Omit<VirtualProject, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    try {
      const virtualProjects = store.get('virtualProjects', []);
      const now = Date.now();

      let savedProject: VirtualProject;

      if (vp.id) {
        // Update existing project
        const index = virtualProjects.findIndex(p => p.id === vp.id);
        if (index === -1) {
          throw new Error('Virtual project not found');
        }
        savedProject = {
          ...virtualProjects[index],
          ...vp,
          updatedAt: now,
        };
        virtualProjects[index] = savedProject;
      } else {
        // Create new project
        savedProject = {
          ...vp,
          id: `vp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        } as VirtualProject;
        virtualProjects.push(savedProject);
      }

      store.set('virtualProjects', virtualProjects);
      return savedProject;
    } catch (error) {
      console.error('Error saving virtual project:', error);
      throw error;
    }
  });

  // Handler: Delete virtual project
  ipcMain.handle('delete-virtual-project', async (_event, vpId: string) => {
    try {
      const virtualProjects = store.get('virtualProjects', []);
      const updatedProjects = virtualProjects.filter(vp => vp.id !== vpId);
      store.set('virtualProjects', updatedProjects);
      return { success: true };
    } catch (error) {
      console.error('Error deleting virtual project:', error);
      throw error;
    }
  });

  // Handler: Materialize virtual project (convert to real project)
  ipcMain.handle('materialize-virtual-project', async (_event, vpId: string, targetDirectory: string, folderName: string) => {
    try {
      const virtualProjects = store.get('virtualProjects', []);
      const vp = virtualProjects.find(p => p.id === vpId);

      if (!vp) {
        throw new Error('Virtual project not found');
      }

      // Create project directory
      const projectPath = path.join(targetDirectory, folderName);
      await fs.mkdir(projectPath, { recursive: true });

      // Generate wbs.yaml from virtual project metadata
      const wbsData = {
        project_info: {
          name: vp.name,
          description: vp.description,
          tech_stack: vp.targetTechStack,
          problem: vp.problem,
          solution: vp.solution,
          target_users: vp.targetUsers,
        },
        milestones: [
          {
            title: 'v0.1: MVP',
            due_date: '',
            status: 'Pending',
          },
        ],
        phases: [
          {
            name: 'Phase 1: Setup',
            tasks: [
              {
                id: 'SETUP-001',
                title: 'Project scaffolding',
                status: 'Pending',
                priority: 'P0',
                spec: 'Initialize project structure and dependencies',
              },
            ],
          },
        ],
      };

      const wbsContent = yaml.dump(wbsData, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });

      const wbsPath = path.join(projectPath, 'wbs.yaml');
      await fs.writeFile(wbsPath, wbsContent, 'utf-8');

      // Create README.md with project info
      const readmeContent = `# ${vp.name}

${vp.description}

## Problem
${vp.problem}

## Solution
${vp.solution}

## Target Users
${vp.targetUsers}

## Tech Stack
${vp.targetTechStack.join(', ')}

${vp.inspiration ? `## Inspiration\n${vp.inspiration}\n` : ''}
${vp.links.length > 0 ? `## References\n${vp.links.map(l => `- ${l}`).join('\n')}\n` : ''}
`;

      const readmePath = path.join(projectPath, 'README.md');
      await fs.writeFile(readmePath, readmeContent, 'utf-8');

      // Delete virtual project from store
      const updatedProjects = virtualProjects.filter(p => p.id !== vpId);
      store.set('virtualProjects', updatedProjects);

      return {
        success: true,
        projectPath,
      };
    } catch (error) {
      console.error('Error materializing virtual project:', error);
      throw error;
    }
  });

  // ========================================
  // Process Management Handlers (Phase 9)
  // ========================================

  // Handler: Get all processes for a specific project
  ipcMain.handle('get-project-processes', async (_event, projectPath: string, projectName: string) => {
    try {
      // Get tracked processes
      const trackedProcesses = processRegistry.getByProject(projectPath);

      // Filter out dead tracked processes
      const aliveTracked = await Promise.all(
        trackedProcesses.map(async (p) => ({
          process: p,
          isAlive: await processRegistry.isProcessAlive(p.pid),
        }))
      );
      const aliveTrackedList = aliveTracked
        .filter((p) => p.isAlive)
        .map((p) => p.process);

      // Scan for untracked processes related to this project
      const scannedProcesses = await scanProjectProcesses(projectPath, projectName);

      // Merge, avoiding duplicates by PID
      const trackedPids = new Set(aliveTrackedList.map((p) => p.pid));
      const untrackedProcesses = scannedProcesses.filter((p) => !trackedPids.has(p.pid));

      return [...aliveTrackedList, ...untrackedProcesses];
    } catch (error) {
      console.error('Error getting project processes:', error);
      throw error;
    }
  });

  // Handler: Get all tracked processes
  ipcMain.handle('get-all-processes', async () => {
    try {
      // Get tracked processes from registry
      const trackedProcesses = processRegistry.getAll();

      // Filter out dead tracked processes
      const aliveTracked = await Promise.all(
        trackedProcesses.map(async (p) => ({
          process: p,
          isAlive: await processRegistry.isProcessAlive(p.pid),
        }))
      );
      const aliveTrackedList = aliveTracked
        .filter((p) => p.isAlive)
        .map((p) => p.process);

      // Clean up dead processes from registry
      aliveTracked
        .filter((p) => !p.isAlive)
        .forEach((p) => processRegistry.unregister(p.process.pid));

      // Scan all projects for untracked processes
      const rootDirectory = store.get('rootDirectory');
      if (rootDirectory) {
        try {
          const projects = await scanProjects(rootDirectory);
          const scannedProcesses = await Promise.all(
            projects.map(p => scanProjectProcesses(p.path, p.name))
          );

          // Flatten scanned processes
          const allScanned = scannedProcesses.flat();

          // Merge, avoiding duplicates by PID
          const trackedPids = new Set(aliveTrackedList.map((p) => p.pid));
          const untrackedProcesses = allScanned.filter((p) => !trackedPids.has(p.pid));

          return [...aliveTrackedList, ...untrackedProcesses];
        } catch (scanError) {
          console.warn('Error scanning projects for processes:', scanError);
          // Fall back to tracked processes only
          return aliveTrackedList;
        }
      }

      return aliveTrackedList;
    } catch (error) {
      console.error('Error getting all processes:', error);
      throw error;
    }
  });

  // Handler: Kill a specific process
  ipcMain.handle('kill-process', async (_event, pid: number, force = false) => {
    try {
      const success = await killProcess(pid, force);
      if (success) {
        processRegistry.unregister(pid);
      }
      return { success, pid };
    } catch (error) {
      console.error(`Error killing process ${pid}:`, error);
      return {
        success: false,
        pid,
        error: error instanceof Error ? error.message : 'Failed to kill process',
      };
    }
  });

  // Handler: Kill all processes for a project
  ipcMain.handle('kill-project-processes', async (_event, projectPath: string) => {
    try {
      const processes = processRegistry.getByProject(projectPath);
      const results = await Promise.allSettled(
        processes.map(async (p) => {
          const success = await killProcess(p.pid);
          if (success) {
            processRegistry.unregister(p.pid);
          }
          return { success, pid: p.pid };
        })
      );
      return results.map((r, i) =>
        r.status === 'fulfilled'
          ? r.value
          : { success: false, pid: processes[i].pid, error: 'Failed to kill' }
      );
    } catch (error) {
      console.error('Error killing project processes:', error);
      throw error;
    }
  });

  // Handler: Find processes using a specific port
  ipcMain.handle('find-process-by-port', async (_event, port: number) => {
    try {
      const processes = await findProcessByPort(port);
      return processes;
    } catch (error) {
      console.error(`Error finding process on port ${port}:`, error);
      throw error;
    }
  });
}

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, './preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // In development, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools(); // Disabled: Open manually with Cmd+Option+I when needed

    // Explicitly close DevTools if it was opened in a previous session
    mainWindow.webContents.once('did-finish-load', () => {
      if (mainWindow && mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      }
    });
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  // Set up IPC handlers
  setupIpcHandlers();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

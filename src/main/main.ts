import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import Store from 'electron-store';
import * as yaml from 'js-yaml';
import type { Project, Settings, QuickNote, EnvVariable } from '../shared/types.js';
import { WBS_TEMPLATE } from '../shared/constants.js';

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

// Initialize electron-store for persistent configuration
interface StoreSchema {
  rootDirectory?: string;
  settings?: Settings;
  quickNotes?: QuickNote[];
}

const store = new Store<StoreSchema>({
  name: 'fulcrum-config',
});

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

    // Extract current phase (first phase that is not "Done")
    let currentPhase: string | undefined;
    if (wbsData.phases && Array.isArray(wbsData.phases)) {
      const activePhase = wbsData.phases.find((phase: any) =>
        phase.status && phase.status.toLowerCase() !== 'done'
      );

      if (activePhase && activePhase.name) {
        currentPhase = activePhase.name;
      } else if (wbsData.phases.length > 0) {
        // All phases are done
        currentPhase = 'All Phases Complete';
      }
    }

    // Calculate if project is a zombie (not modified in 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const isZombie = lastModified < thirtyDaysAgo;

    return {
      techStack,
      currentPhase,
      isZombie,
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

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(rootPath, entry.name);
        const type = await detectProjectType(projectPath);

        // Only include directories that are identified as projects
        if (type !== 'unknown' || (await fs.readdir(projectPath)).includes('.git')) {
          const stats = await fs.stat(projectPath);

          // Parse wbs.yaml metadata
          const meta = await parseWbsMetadata(projectPath, stats.mtimeMs);

          projects.push({
            name: entry.name,
            path: projectPath,
            type,
            lastModified: stats.mtimeMs,
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

    // Launch Editor
    try {
      const editorProcess = spawn(editorCommand, [projectPath], {
        detached: true,
        stdio: 'ignore',
      });
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

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import Store from 'electron-store';
import type { Project, Settings } from '../shared/types.js';
import { WBS_TEMPLATE } from '../shared/constants.js';

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

// Initialize electron-store for persistent configuration
interface StoreSchema {
  rootDirectory?: string;
  settings?: Settings;
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
          projects.push({
            name: entry.name,
            path: projectPath,
            type,
            lastModified: stats.mtimeMs,
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

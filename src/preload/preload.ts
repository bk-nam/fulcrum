import { contextBridge, ipcRenderer } from 'electron';
import type { Project, Settings, QuickNote, EnvVariable } from '../shared/types.js';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Get the stored root directory
  getRootDirectory: (): Promise<string | null> => {
    return ipcRenderer.invoke('get-root-directory');
  },

  // Open directory selection dialog
  selectDirectory: (): Promise<string | null> => {
    return ipcRenderer.invoke('select-directory');
  },

  // Get all projects from the root directory
  getProjects: (): Promise<Project[]> => {
    return ipcRenderer.invoke('get-projects');
  },

  // Get settings
  getSettings: (): Promise<Settings> => {
    return ipcRenderer.invoke('get-settings');
  },

  // Save settings
  saveSettings: (settings: Settings): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('save-settings', settings);
  },

  // Launch project
  launchProject: (projectPath: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('launch-project', projectPath);
  },

  // WBS operations
  checkWbsExists: (projectPath: string): Promise<boolean> => {
    return ipcRenderer.invoke('check-wbs-exists', projectPath);
  },

  createWbsTemplate: (projectPath: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('create-wbs-template', projectPath);
  },

  readWbs: (projectPath: string): Promise<string> => {
    return ipcRenderer.invoke('read-wbs', projectPath);
  },

  saveWbs: (projectPath: string, content: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('save-wbs', projectPath, content);
  },

  // Quick Notes operations
  getQuickNotes: (): Promise<QuickNote[]> => {
    return ipcRenderer.invoke('get-quick-notes');
  },

  saveQuickNote: (note: Omit<QuickNote, 'id' | 'timestamp'>): Promise<QuickNote> => {
    return ipcRenderer.invoke('save-quick-note', note);
  },

  deleteQuickNote: (noteId: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('delete-quick-note', noteId);
  },

  // Env file operations
  readEnv: (projectPath: string): Promise<EnvVariable[]> => {
    return ipcRenderer.invoke('read-env', projectPath);
  },
});

// Type definitions for TypeScript
export interface ElectronAPI {
  getRootDirectory: () => Promise<string | null>;
  selectDirectory: () => Promise<string | null>;
  getProjects: () => Promise<Project[]>;
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<{ success: boolean }>;
  launchProject: (projectPath: string) => Promise<{ success: boolean; error?: string }>;
  checkWbsExists: (projectPath: string) => Promise<boolean>;
  createWbsTemplate: (projectPath: string) => Promise<{ success: boolean }>;
  readWbs: (projectPath: string) => Promise<string>;
  saveWbs: (projectPath: string, content: string) => Promise<{ success: boolean }>;
  getQuickNotes: () => Promise<QuickNote[]>;
  saveQuickNote: (note: Omit<QuickNote, 'id' | 'timestamp'>) => Promise<QuickNote>;
  deleteQuickNote: (noteId: string) => Promise<{ success: boolean }>;
  readEnv: (projectPath: string) => Promise<EnvVariable[]>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

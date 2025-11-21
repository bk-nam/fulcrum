import { contextBridge, ipcRenderer } from 'electron';
import type { Project, Settings, QuickNote, EnvVariable, VirtualProject, ProjectStatus, ProcessInfo, ProcessKillResult, ProjectActivity, WorkSession, ProjectTimeStats, TimeTrackingSummary } from '../shared/types.js';

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

  // Project Status operations
  updateProjectStatus: (projectPath: string, status: ProjectStatus | null): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('update-project-status', projectPath, status);
  },

  getProjectStatuses: (): Promise<Record<string, ProjectStatus>> => {
    return ipcRenderer.invoke('get-project-statuses');
  },

  // Virtual Project operations
  getVirtualProjects: (): Promise<VirtualProject[]> => {
    return ipcRenderer.invoke('get-virtual-projects');
  },

  saveVirtualProject: (vp: Omit<VirtualProject, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<VirtualProject> => {
    return ipcRenderer.invoke('save-virtual-project', vp);
  },

  deleteVirtualProject: (vpId: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('delete-virtual-project', vpId);
  },

  materializeVirtualProject: (vpId: string, targetDirectory: string, folderName: string): Promise<{ success: boolean; projectPath: string }> => {
    return ipcRenderer.invoke('materialize-virtual-project', vpId, targetDirectory, folderName);
  },

  // Process Management operations (Phase 9)
  getProjectProcesses: (projectPath: string, projectName: string): Promise<ProcessInfo[]> => {
    return ipcRenderer.invoke('get-project-processes', projectPath, projectName);
  },

  getAllProcesses: (): Promise<ProcessInfo[]> => {
    return ipcRenderer.invoke('get-all-processes');
  },

  killProcess: (pid: number, force?: boolean): Promise<ProcessKillResult> => {
    return ipcRenderer.invoke('kill-process', pid, force);
  },

  killProjectProcesses: (projectPath: string): Promise<ProcessKillResult[]> => {
    return ipcRenderer.invoke('kill-project-processes', projectPath);
  },

  findProcessByPort: (port: number): Promise<ProcessInfo[]> => {
    return ipcRenderer.invoke('find-process-by-port', port);
  },

  // Current Focus Phase operations
  getCurrentFocusPhase: (projectPath: string): Promise<string | null> => {
    return ipcRenderer.invoke('get-current-focus-phase', projectPath);
  },

  setCurrentFocusPhase: (projectPath: string, phaseName: string | null): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('set-current-focus-phase', projectPath, phaseName);
  },

  // Activity Tracking operations (Phase 10: TIME-003)
  getProjectActivity: (projectPath: string): Promise<ProjectActivity | null> => {
    return ipcRenderer.invoke('get-project-activity', projectPath);
  },

  getAllActivities: (): Promise<Record<string, ProjectActivity>> => {
    return ipcRenderer.invoke('get-all-activities');
  },

  // Time Tracking operations (Phase 10: TIME-002)
  endTimeSession: (projectPath: string): Promise<WorkSession | null> => {
    return ipcRenderer.invoke('end-time-session', projectPath);
  },

  getProjectTimeStats: (projectPath: string): Promise<ProjectTimeStats | null> => {
    return ipcRenderer.invoke('get-project-time-stats', projectPath);
  },

  getTimeTrackingSummary: (): Promise<TimeTrackingSummary> => {
    return ipcRenderer.invoke('get-time-tracking-summary');
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
  updateProjectStatus: (projectPath: string, status: ProjectStatus | null) => Promise<{ success: boolean }>;
  getProjectStatuses: () => Promise<Record<string, ProjectStatus>>;
  getVirtualProjects: () => Promise<VirtualProject[]>;
  saveVirtualProject: (vp: Omit<VirtualProject, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<VirtualProject>;
  deleteVirtualProject: (vpId: string) => Promise<{ success: boolean }>;
  materializeVirtualProject: (vpId: string, targetDirectory: string, folderName: string) => Promise<{ success: boolean; projectPath: string }>;
  getProjectProcesses: (projectPath: string, projectName: string) => Promise<ProcessInfo[]>;
  getAllProcesses: () => Promise<ProcessInfo[]>;
  killProcess: (pid: number, force?: boolean) => Promise<ProcessKillResult>;
  killProjectProcesses: (projectPath: string) => Promise<ProcessKillResult[]>;
  findProcessByPort: (port: number) => Promise<ProcessInfo[]>;
  getCurrentFocusPhase: (projectPath: string) => Promise<string | null>;
  setCurrentFocusPhase: (projectPath: string, phaseName: string | null) => Promise<{ success: boolean }>;
  getProjectActivity: (projectPath: string) => Promise<ProjectActivity | null>;
  getAllActivities: () => Promise<Record<string, ProjectActivity>>;
  endTimeSession: (projectPath: string) => Promise<WorkSession | null>;
  getProjectTimeStats: (projectPath: string) => Promise<ProjectTimeStats | null>;
  getTimeTrackingSummary: () => Promise<TimeTrackingSummary>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

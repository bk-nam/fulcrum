"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  // Get the stored root directory
  getRootDirectory: () => {
    return electron.ipcRenderer.invoke("get-root-directory");
  },
  // Open directory selection dialog
  selectDirectory: () => {
    return electron.ipcRenderer.invoke("select-directory");
  },
  // Get all projects from the root directory
  getProjects: () => {
    return electron.ipcRenderer.invoke("get-projects");
  },
  // Get settings
  getSettings: () => {
    return electron.ipcRenderer.invoke("get-settings");
  },
  // Save settings
  saveSettings: (settings) => {
    return electron.ipcRenderer.invoke("save-settings", settings);
  },
  // Launch project
  launchProject: (projectPath) => {
    return electron.ipcRenderer.invoke("launch-project", projectPath);
  },
  // WBS operations
  checkWbsExists: (projectPath) => {
    return electron.ipcRenderer.invoke("check-wbs-exists", projectPath);
  },
  createWbsTemplate: (projectPath) => {
    return electron.ipcRenderer.invoke("create-wbs-template", projectPath);
  },
  readWbs: (projectPath) => {
    return electron.ipcRenderer.invoke("read-wbs", projectPath);
  },
  saveWbs: (projectPath, content) => {
    return electron.ipcRenderer.invoke("save-wbs", projectPath, content);
  },
  // Quick Notes operations
  getQuickNotes: () => {
    return electron.ipcRenderer.invoke("get-quick-notes");
  },
  saveQuickNote: (note) => {
    return electron.ipcRenderer.invoke("save-quick-note", note);
  },
  deleteQuickNote: (noteId) => {
    return electron.ipcRenderer.invoke("delete-quick-note", noteId);
  },
  // Env file operations
  readEnv: (projectPath) => {
    return electron.ipcRenderer.invoke("read-env", projectPath);
  },
  // Project Status operations
  updateProjectStatus: (projectPath, status) => {
    return electron.ipcRenderer.invoke("update-project-status", projectPath, status);
  },
  getProjectStatuses: () => {
    return electron.ipcRenderer.invoke("get-project-statuses");
  },
  // Virtual Project operations
  getVirtualProjects: () => {
    return electron.ipcRenderer.invoke("get-virtual-projects");
  },
  saveVirtualProject: (vp) => {
    return electron.ipcRenderer.invoke("save-virtual-project", vp);
  },
  deleteVirtualProject: (vpId) => {
    return electron.ipcRenderer.invoke("delete-virtual-project", vpId);
  },
  materializeVirtualProject: (vpId, targetDirectory, folderName) => {
    return electron.ipcRenderer.invoke("materialize-virtual-project", vpId, targetDirectory, folderName);
  },
  // Process Management operations (Phase 9)
  getProjectProcesses: (projectPath, projectName) => {
    return electron.ipcRenderer.invoke("get-project-processes", projectPath, projectName);
  },
  getAllProcesses: () => {
    return electron.ipcRenderer.invoke("get-all-processes");
  },
  killProcess: (pid, force) => {
    return electron.ipcRenderer.invoke("kill-process", pid, force);
  },
  killProjectProcesses: (projectPath) => {
    return electron.ipcRenderer.invoke("kill-project-processes", projectPath);
  },
  findProcessByPort: (port) => {
    return electron.ipcRenderer.invoke("find-process-by-port", port);
  },
  // Current Focus Phase operations
  getCurrentFocusPhase: (projectPath) => {
    return electron.ipcRenderer.invoke("get-current-focus-phase", projectPath);
  },
  setCurrentFocusPhase: (projectPath, phaseName) => {
    return electron.ipcRenderer.invoke("set-current-focus-phase", projectPath, phaseName);
  },
  // Activity Tracking operations (Phase 10: TIME-003)
  getProjectActivity: (projectPath) => {
    return electron.ipcRenderer.invoke("get-project-activity", projectPath);
  },
  getAllActivities: () => {
    return electron.ipcRenderer.invoke("get-all-activities");
  },
  // Time Tracking operations (Phase 10: TIME-002)
  endTimeSession: (projectPath) => {
    return electron.ipcRenderer.invoke("end-time-session", projectPath);
  },
  getProjectTimeStats: (projectPath) => {
    return electron.ipcRenderer.invoke("get-project-time-stats", projectPath);
  },
  getTimeTrackingSummary: () => {
    return electron.ipcRenderer.invoke("get-time-tracking-summary");
  }
});

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
  }
});

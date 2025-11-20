import { useState, useEffect } from 'react';
import { FolderOpen, RefreshCw, Settings, X, StickyNote } from 'lucide-react';
import ProjectCard from './components/ProjectCard';
import SettingsModal from './components/SettingsModal';
import ProjectDetailModal from './components/ProjectDetailModal';
import NotesWidget from './components/NotesWidget';
import type { Project, Settings as SettingsType } from '../shared/types';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showNotesWidget, setShowNotesWidget] = useState<boolean>(false);

  // Load root directory and projects on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if root directory is configured
      const storedRootPath = await window.electron.getRootDirectory();
      setRootPath(storedRootPath);

      // If root directory exists, load projects
      if (storedRootPath) {
        await loadProjects();
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectList = await window.electron.getProjects();
      setProjects(projectList);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDirectory = async () => {
    try {
      setError(null);
      const selectedPath = await window.electron.selectDirectory();

      if (selectedPath) {
        setRootPath(selectedPath);
        await loadProjects();
      }
    } catch (err) {
      console.error('Error selecting directory:', err);
      setError(err instanceof Error ? err.message : 'Failed to select directory');
    }
  };

  // Toast effect - auto dismiss after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const handleLaunch = async (project: Project) => {
    try {
      const result = await window.electron.launchProject(project.path);

      if (result.success) {
        showToast(`Launching ${project.name}...`, 'success');
      } else {
        showToast(result.error || 'Failed to launch project', 'error');
      }
    } catch (err) {
      console.error('Error launching project:', err);
      showToast('Failed to launch project', 'error');
    }
  };

  const handleSettingsSave = (newSettings: SettingsType) => {
    setSettings(newSettings);
    showToast('Settings saved successfully', 'success');
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedProject(null);
  };

  const handleOpenProjectFromNote = (projectPath: string) => {
    const project = projects.find((p) => p.path === projectPath);
    if (project) {
      handleProjectClick(project);
      setShowNotesWidget(false);
    }
  };

  // Scenario A: Welcome screen (no root directory configured)
  if (!rootPath && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Fulcrum
          </h1>
          <p className="text-gray-600 mb-8 max-w-md">
            Your personal developer platform. Get started by selecting a workspace folder where you keep your projects.
          </p>
          <button
            onClick={handleSelectDirectory}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <FolderOpen className="w-5 h-5" />
            Select Workspace Folder
          </button>
          {error && (
            <p className="mt-4 text-red-600 text-sm">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Scenario B: Project grid (root directory configured)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fulcrum</h1>
              <p className="text-sm text-gray-500 mt-1">{rootPath}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadProjects}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleSelectDirectory}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                <FolderOpen className="w-4 h-4" />
                Change Folder
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors duration-200"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={() => setShowNotesWidget(!showNotesWidget)}
                className={`inline-flex items-center gap-2 font-medium py-2 px-4 rounded-lg border transition-colors duration-200 ${
                  showNotesWidget
                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                }`}
                title="Quick Notes"
              >
                <StickyNote className="w-4 h-4" />
                Notes
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadProjects}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No projects found in this workspace</p>
            <p className="text-gray-500 text-sm mt-2">
              Make sure your projects contain marker files like package.json, requirements.txt, or Cargo.toml
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Projects ({projects.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.path}
                  project={project}
                  onLaunch={handleLaunch}
                  onClick={handleProjectClick}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
      />

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={selectedProject}
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        onLaunch={handleLaunch}
      />

      {/* Notes Widget */}
      <NotesWidget
        isOpen={showNotesWidget}
        onClose={() => setShowNotesWidget(false)}
        selectedProject={selectedProject}
        onOpenProject={handleOpenProjectFromNote}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

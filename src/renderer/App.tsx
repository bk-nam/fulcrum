import { useState, useEffect } from 'react';
import { FolderOpen, RefreshCw, Settings, X, StickyNote, Lightbulb, Plus } from 'lucide-react';
import ProjectCard from './components/ProjectCard';
import VirtualProjectCard from './components/VirtualProjectCard';
import VirtualProjectModal from './components/VirtualProjectModal';
import SettingsModal from './components/SettingsModal';
import ProjectDetailModal from './components/ProjectDetailModal';
import NotesWidget from './components/NotesWidget';
import type { Project, Settings as SettingsType, VirtualProject, ProjectStatus } from '../shared/types';
import { PROJECT_STATUSES } from '../shared/constants';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [virtualProjects, setVirtualProjects] = useState<VirtualProject[]>([]);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showNotesWidget, setShowNotesWidget] = useState<boolean>(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'real' | 'ideas'>('all');
  const [selectedVirtualProject, setSelectedVirtualProject] = useState<VirtualProject | null>(null);
  const [showVirtualProjectModal, setShowVirtualProjectModal] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all' | 'untagged'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'freshness'>('freshness');

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

      // Load virtual projects (always available)
      await loadVirtualProjects();

      // If root directory exists, load real projects
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

  const loadVirtualProjects = async () => {
    try {
      const vpList = await window.electron.getVirtualProjects();
      setVirtualProjects(vpList);
    } catch (err) {
      console.error('Error loading virtual projects:', err);
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

  const handleSettingsSave = (_newSettings: SettingsType) => {
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

  // Virtual Project handlers
  const handleNewIdea = () => {
    setSelectedVirtualProject(null);
    setShowVirtualProjectModal(true);
  };

  const handleEditVirtualProject = (vp: VirtualProject) => {
    setSelectedVirtualProject(vp);
    setShowVirtualProjectModal(true);
  };

  const handleSaveVirtualProject = async (vp: Omit<VirtualProject, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    try {
      await window.electron.saveVirtualProject(vp);
      await loadVirtualProjects();
      setShowVirtualProjectModal(false);
      setSelectedVirtualProject(null);
      showToast(vp.id ? 'Idea updated' : 'Idea created', 'success');
    } catch (err) {
      console.error('Error saving virtual project:', err);
      showToast('Failed to save idea', 'error');
    }
  };

  const handleDeleteVirtualProject = async (vpId: string) => {
    try {
      await window.electron.deleteVirtualProject(vpId);
      await loadVirtualProjects();
      setShowVirtualProjectModal(false);
      setSelectedVirtualProject(null);
      showToast('Idea deleted', 'success');
    } catch (err) {
      console.error('Error deleting virtual project:', err);
      showToast('Failed to delete idea', 'error');
    }
  };

  const handleConvertVirtualProject = async (vp: VirtualProject) => {
    try {
      if (!rootPath) {
        showToast('Please select a workspace folder first', 'error');
        return;
      }

      const folderName = prompt(
        `Enter folder name for "${vp.name}":`,
        vp.name.toLowerCase().replace(/\s+/g, '-')
      );

      if (!folderName) return;

      const result = await window.electron.materializeVirtualProject(vp.id, rootPath, folderName);

      if (result.success) {
        await loadVirtualProjects();
        await loadProjects();
        showToast(`"${vp.name}" converted to real project!`, 'success');
      }
    } catch (err) {
      console.error('Error converting virtual project:', err);
      showToast('Failed to convert idea to project', 'error');
    }
  };

  // Filter and sort logic
  const filteredProjects = projects.filter(project => {
    // View filter (real/ideas)
    if (viewFilter === 'ideas') return false;

    // Status filter
    if (statusFilter === 'all') return true;
    if (statusFilter === 'untagged') return !project.status;
    return project.status === statusFilter;
  });

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);

      case 'status': {
        // Active > Maintenance > Idea > Archive > Untagged
        const statusOrder: Record<string, number> = {
          active: 1,
          maintenance: 2,
          idea: 3,
          archive: 4,
          undefined: 5,
        };
        return (statusOrder[a.status || 'undefined'] || 5) - (statusOrder[b.status || 'undefined'] || 5);
      }

      case 'freshness':
      default:
        return b.lastModified - a.lastModified;
    }
  });

  const filteredVirtualProjects = virtualProjects;
  const displayProjects = sortedProjects;
  const displayVirtualProjects = viewFilter === 'real' ? [] : filteredVirtualProjects;

  // Calculate statistics
  const projectStats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    maintenance: projects.filter(p => p.status === 'maintenance').length,
    archive: projects.filter(p => p.status === 'archive').length,
    idea: projects.filter(p => p.status === 'idea').length,
    untagged: projects.filter(p => !p.status).length,
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
            Your personal developer platform. Get started by selecting a workspace folder or capture your ideas first.
          </p>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={handleSelectDirectory}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              <FolderOpen className="w-5 h-5" />
              Select Workspace
            </button>
            <span className="text-gray-400">or</span>
            <button
              onClick={handleNewIdea}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              <Lightbulb className="w-5 h-5" />
              Start with an Idea
            </button>
          </div>
          {error && (
            <p className="mt-4 text-red-600 text-sm">{error}</p>
          )}

          {/* Show existing ideas if any */}
          {virtualProjects.length > 0 && (
            <div className="mt-12 max-w-4xl mx-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Ideas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {virtualProjects.map((vp) => (
                  <VirtualProjectCard
                    key={vp.id}
                    virtualProject={vp}
                    onEdit={handleEditVirtualProject}
                    onConvert={handleConvertVirtualProject}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Virtual Project Modal (available even without workspace) */}
        <VirtualProjectModal
          virtualProject={selectedVirtualProject}
          isOpen={showVirtualProjectModal}
          onClose={() => {
            setShowVirtualProjectModal(false);
            setSelectedVirtualProject(null);
          }}
          onSave={handleSaveVirtualProject}
          onDelete={handleDeleteVirtualProject}
        />
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
        ) : projects.length === 0 && virtualProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No projects or ideas yet</p>
            <p className="text-gray-500 text-sm mt-2 mb-4">
              Start by creating an idea or adding projects to your workspace
            </p>
            <button
              onClick={handleNewIdea}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <Lightbulb className="w-4 h-4" />
              New Idea
            </button>
          </div>
        ) : (
          <div>
            {/* Statistics Bar */}
            <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">Total: {projectStats.total}</span>
              {projectStats.active > 0 && <span className="text-green-600">🟢 Active: {projectStats.active}</span>}
              {projectStats.maintenance > 0 && <span className="text-blue-600">🔵 Maintenance: {projectStats.maintenance}</span>}
              {projectStats.idea > 0 && <span className="text-yellow-600">💡 Idea: {projectStats.idea}</span>}
              {projectStats.archive > 0 && <span className="text-gray-500">⚫ Archive: {projectStats.archive}</span>}
              {projectStats.untagged > 0 && <span className="text-gray-400">Untagged: {projectStats.untagged}</span>}
            </div>

            {/* Filter and Sort Controls */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    All
                  </button>
                  {(Object.keys(PROJECT_STATUSES) as ProjectStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        statusFilter === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {PROJECT_STATUSES[status].icon} {PROJECT_STATUSES[status].label}
                    </button>
                  ))}
                  <button
                    onClick={() => setStatusFilter('untagged')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      statusFilter === 'untagged'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Untagged
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="freshness">Freshness</option>
                  <option value="status">Status</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 p-1 rounded-lg border border-slate-300 bg-white">
                <button
                  onClick={() => setViewFilter('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                    viewFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  All <span className="opacity-75">({projects.length + virtualProjects.length})</span>
                </button>
                <button
                  onClick={() => setViewFilter('real')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                    viewFilter === 'real'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Projects <span className="opacity-75">({projects.length})</span>
                </button>
                <button
                  onClick={() => setViewFilter('ideas')}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                    viewFilter === 'ideas'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Lightbulb className="w-4 h-4" />
                  Ideas <span className="opacity-75">({virtualProjects.length})</span>
                </button>
              </div>

              <button
                onClick={handleNewIdea}
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                New Idea
              </button>
            </div>

            {/* Grid Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Virtual Projects */}
              {displayVirtualProjects.map((vp) => (
                <VirtualProjectCard
                  key={vp.id}
                  virtualProject={vp}
                  onEdit={handleEditVirtualProject}
                  onConvert={handleConvertVirtualProject}
                />
              ))}

              {/* Real Projects */}
              {displayProjects.map((project) => (
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
        onStatusChange={loadProjects}
      />

      {/* Notes Widget */}
      <NotesWidget
        isOpen={showNotesWidget}
        onClose={() => setShowNotesWidget(false)}
        selectedProject={selectedProject}
        onOpenProject={handleOpenProjectFromNote}
      />

      {/* Virtual Project Modal */}
      <VirtualProjectModal
        virtualProject={selectedVirtualProject}
        isOpen={showVirtualProjectModal}
        onClose={() => {
          setShowVirtualProjectModal(false);
          setSelectedVirtualProject(null);
        }}
        onSave={handleSaveVirtualProject}
        onDelete={handleDeleteVirtualProject}
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

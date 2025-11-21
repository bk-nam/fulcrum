import React, { useState, useEffect, useRef } from 'react';
import { X, Rocket, Copy, CheckCircle, Layout, Code, KeyRound, Eye, EyeOff } from 'lucide-react';
import * as yaml from 'js-yaml';
import type { Project, EnvVariable, ProjectStatus } from '../../shared/types';
import { AI_CONTEXT_PROMPT_TEMPLATE } from '../../shared/constants';
import GuiEditor from './GuiEditor';
import { StatusSelector } from './StatusSelector';

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (project: Project) => void;
  onStatusChange?: () => void;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  isOpen,
  onClose,
  onLaunch,
  onStatusChange,
}) => {
  const [wbsContent, setWbsContent] = useState('');
  const [wbsExists, setWbsExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // GUI Mode state
  const [viewMode, setViewMode] = useState<'gui' | 'code' | 'env'>('gui');
  const [parsedWbs, setParsedWbs] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Env Mode state
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  // Status management - local state for immediate UI update
  const [currentStatus, setCurrentStatus] = useState<ProjectStatus | undefined>(project?.status);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialContentRef = useRef<string>('');

  // Load WBS content when modal opens
  useEffect(() => {
    if (isOpen && project) {
      loadWbsContent();
      setCurrentStatus(project.status); // Initialize status
    }
  }, [isOpen, project]);

  // Auto-save with debounce
  useEffect(() => {
    if (!isOpen || !project || !wbsExists) return;

    // Don't save if content hasn't changed from initial load
    if (wbsContent === initialContentRef.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      await saveWbsContent();
    }, 1000); // 1 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [wbsContent, isOpen, project, wbsExists]);

  const loadWbsContent = async () => {
    if (!project) return;

    try {
      setIsLoading(true);
      const exists = await window.electron.checkWbsExists(project.path);
      setWbsExists(exists);

      if (exists) {
        const content = await window.electron.readWbs(project.path);
        setWbsContent(content);
        initialContentRef.current = content;
      } else {
        setWbsContent('');
        initialContentRef.current = '';
      }
    } catch (error) {
      console.error('Error loading WBS:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWbsContent = async () => {
    if (!project || !wbsContent) return;

    try {
      setIsSaving(true);
      await window.electron.saveWbs(project.path, wbsContent);
      setLastSaved(new Date());
      initialContentRef.current = wbsContent;
    } catch (error) {
      console.error('Error saving WBS:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInitializeWbs = async () => {
    if (!project) return;

    try {
      setIsLoading(true);
      await window.electron.createWbsTemplate(project.path);
      await loadWbsContent();
    } catch (error) {
      console.error('Error initializing WBS:', error);
      alert('Failed to initialize WBS');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyContext = async () => {
    if (!wbsContent) return;

    try {
      const prompt = AI_CONTEXT_PROMPT_TEMPLATE(wbsContent);
      await navigator.clipboard.writeText(prompt);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleLaunchClick = () => {
    if (project) {
      onLaunch(project);
    }
  };

  const handleStatusChange = async (status: ProjectStatus | null) => {
    if (!project) return;

    const newStatus = status || undefined;

    try {
      // 1. Optimistic update - immediately reflect in UI
      setCurrentStatus(newStatus);

      // 2. Persist to backend
      await window.electron.updateProjectStatus(project.path, status);

      // 3. Refresh project list in parent
      onStatusChange?.();
    } catch (error) {
      console.error('Failed to update status:', error);
      // Rollback on error
      setCurrentStatus(project.status);
    }
  };

  // Parse YAML to object for GUI mode
  const parseYaml = (content: string): boolean => {
    try {
      const parsed = yaml.load(content);
      setParsedWbs(parsed);
      setParseError(null);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid YAML';
      setParseError(errorMessage);
      setViewMode('code'); // Force code mode on parse error
      return false;
    }
  };

  // Update from GUI mode
  const handleGuiUpdate = (updatedData: any) => {
    try {
      setParsedWbs(updatedData);
      const yamlString = yaml.dump(updatedData, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });
      setWbsContent(yamlString); // Triggers auto-save
    } catch (error) {
      console.error('Error dumping YAML:', error);
    }
  };

  // Parse YAML when switching to GUI mode or loading content
  useEffect(() => {
    if (viewMode === 'gui' && wbsContent && wbsExists) {
      parseYaml(wbsContent);
    }
  }, [viewMode, wbsContent, wbsExists]);

  // Load env variables when switching to Env mode
  useEffect(() => {
    if (viewMode === 'env' && project && isOpen) {
      loadEnvVars();
    }
  }, [viewMode, project, isOpen]);

  const loadEnvVars = async () => {
    if (!project) return;

    try {
      const vars = await window.electron.readEnv(project.path);
      setEnvVars(vars);
    } catch (error) {
      console.error('Error loading env vars:', error);
      setEnvVars([]);
    }
  };

  const toggleShowValue = (key: string) => {
    setShowValues(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const formatLastSaved = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[90vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{project.path}</p>

            {/* Status Management */}
            <div className="mt-3">
              <StatusSelector
                currentStatus={currentStatus}
                projectPath={project.path}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLaunchClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
              title="Launch project"
            >
              <Rocket className="w-4 h-4" />
              Launch
            </button>

            {wbsExists && (
              <>
                <button
                  onClick={handleCopyContext}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors shadow-sm"
                  title="Copy context for AI"
                >
                  {copySuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Context
                    </>
                  )}
                </button>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 p-1 rounded-lg border border-slate-300 bg-white">
                  <button
                    onClick={() => setViewMode('gui')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-300 text-sm font-medium ${
                      viewMode === 'gui'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Visual Editor"
                  >
                    <Layout className="w-4 h-4" />
                    Visual
                  </button>
                  <button
                    onClick={() => setViewMode('code')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-300 text-sm font-medium ${
                      viewMode === 'code'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Code Editor"
                  >
                    <Code className="w-4 h-4" />
                    Code
                  </button>
                  <button
                    onClick={() => setViewMode('env')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-300 text-sm font-medium ${
                      viewMode === 'env'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Environment Variables"
                  >
                    <KeyRound className="w-4 h-4" />
                    Env
                  </button>
                </div>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-all duration-300"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : !wbsExists ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-gray-600 text-lg">
                No WBS file found for this project
              </p>
              <button
                onClick={handleInitializeWbs}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Initialize Structured WBS
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full gap-3">
              {/* Status Bar */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">wbs.yaml</span>
                <div className="flex items-center gap-2">
                  {isSaving ? (
                    <span className="text-yellow-600">Saving...</span>
                  ) : lastSaved ? (
                    <span className="text-green-600">
                      Saved at {formatLastSaved(lastSaved)}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Parse Error Warning */}
              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <span className="text-red-600 text-sm">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">Invalid YAML</p>
                    <p className="text-xs text-red-600 mt-1">{parseError}</p>
                    <p className="text-xs text-red-600 mt-1">Please fix the syntax in Code mode.</p>
                  </div>
                </div>
              )}

              {/* Editor: GUI, Code, or Env */}
              <div className="flex-1 overflow-hidden">
                {viewMode === 'gui' && parsedWbs ? (
                  <GuiEditor parsedWbs={parsedWbs} onUpdate={handleGuiUpdate} />
                ) : viewMode === 'code' ? (
                  <textarea
                    value={wbsContent}
                    onChange={(e) => setWbsContent(e.target.value)}
                    className="w-full h-full p-4 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm resize-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your WBS YAML content here..."
                    spellCheck={false}
                    style={{
                      tabSize: 2,
                      lineHeight: '1.6',
                    }}
                  />
                ) : (
                  /* Env Mode */
                  <div className="h-full overflow-y-auto p-6">
                    {envVars.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <KeyRound className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium">No .env files found</p>
                        <p className="text-sm mt-2">Create .env, .env.local, or other environment files in your project root</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* File Summary */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 mb-1">
                            Loaded from {new Set(envVars.map(v => v.source)).size} file(s)
                          </p>
                          <p className="text-xs text-blue-700">
                            {Array.from(new Set(envVars.map(v => v.source))).join(', ')}
                          </p>
                        </div>

                        {/* Variables List */}
                        <div className="space-y-3">
                        {envVars.map((env) => (
                          <div
                            key={env.key}
                            className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm font-semibold text-slate-700">
                                  {env.key}
                                </span>
                                {env.isSecret && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                                    Secret
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-sm text-slate-600 break-all">
                                {showValues[env.key] ? env.value : '••••••••••••••••'}
                              </span>
                              <p className="text-xs text-slate-400 mt-1">
                                from {env.source}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => toggleShowValue(env.key)}
                                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                title={showValues[env.key] ? 'Hide value' : 'Show value'}
                              >
                                {showValues[env.key] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => copyToClipboard(env.value)}
                                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                title="Copy value"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailModal;

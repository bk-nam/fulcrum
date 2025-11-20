import React, { useState, useEffect, useRef } from 'react';
import { X, Rocket, Copy, CheckCircle, Layout, Code } from 'lucide-react';
import * as yaml from 'js-yaml';
import type { Project } from '../../shared/types';
import { AI_CONTEXT_PROMPT_TEMPLATE } from '../../shared/constants';
import GuiEditor from './GuiEditor';

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (project: Project) => void;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  isOpen,
  onClose,
  onLaunch,
}) => {
  const [wbsContent, setWbsContent] = useState('');
  const [wbsExists, setWbsExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // GUI Mode state
  const [viewMode, setViewMode] = useState<'gui' | 'code'>('gui');
  const [parsedWbs, setParsedWbs] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialContentRef = useRef<string>('');

  // Load WBS content when modal opens
  useEffect(() => {
    if (isOpen && project) {
      loadWbsContent();
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
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLaunchClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              title="Launch project"
            >
              <Rocket className="w-4 h-4" />
              Launch
            </button>

            {wbsExists && (
              <>
                <button
                  onClick={handleCopyContext}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
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
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('gui')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors text-sm font-medium ${
                      viewMode === 'gui'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Visual Editor"
                  >
                    <Layout className="w-4 h-4" />
                    Visual
                  </button>
                  <button
                    onClick={() => setViewMode('code')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors text-sm font-medium ${
                      viewMode === 'code'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Code Editor"
                  >
                    <Code className="w-4 h-4" />
                    Code
                  </button>
                </div>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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

              {/* Editor: GUI or Code */}
              <div className="flex-1 overflow-hidden">
                {viewMode === 'gui' && parsedWbs ? (
                  <GuiEditor parsedWbs={parsedWbs} onUpdate={handleGuiUpdate} />
                ) : (
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

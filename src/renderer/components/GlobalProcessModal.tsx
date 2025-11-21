import { useState, useEffect } from 'react';
import { X, RefreshCw, XCircle, FolderOpen } from 'lucide-react';
import type { ProcessInfo } from '../../shared/types';
import { ProcessCard } from './ProcessCard';

interface GlobalProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalProcessModal({ isOpen, onClose }: GlobalProcessModalProps) {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [killingPids, setKillingPids] = useState<Set<number>>(new Set());
  const [killingAll, setKillingAll] = useState(false);

  const loadProcesses = async () => {
    try {
      setLoading(true);
      const procs = await window.electron.getAllProcesses();
      setProcesses(procs);
    } catch (error) {
      console.error('Error loading all processes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProcesses();
      // Poll every 5 seconds
      const interval = setInterval(loadProcesses, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleKill = async (pid: number) => {
    setKillingPids(prev => new Set(prev).add(pid));
    try {
      await window.electron.killProcess(pid);
      // Reload after a short delay
      setTimeout(loadProcesses, 500);
    } catch (error) {
      console.error('Error killing process:', error);
    } finally {
      setKillingPids(prev => {
        const next = new Set(prev);
        next.delete(pid);
        return next;
      });
    }
  };

  const handleKillAll = async () => {
    if (!confirm(`Kill all ${processes.length} processes?`)) return;

    setKillingAll(true);
    try {
      // Kill each process individually
      await Promise.all(
        processes.map(p => window.electron.killProcess(p.pid))
      );
      // Reload after a short delay
      setTimeout(loadProcesses, 500);
    } catch (error) {
      console.error('Error killing all processes:', error);
    } finally {
      setKillingAll(false);
    }
  };

  if (!isOpen) return null;

  // Group processes by project
  const processByProject = processes.reduce((acc, proc) => {
    if (!acc[proc.projectPath]) {
      acc[proc.projectPath] = [];
    }
    acc[proc.projectPath].push(proc);
    return acc;
  }, {} as Record<string, ProcessInfo[]>);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">All Processes</h2>
            <p className="text-sm text-slate-500 mt-1">
              Manage all tracked processes across projects
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-all"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              Total Processes:
            </span>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-full">
              {processes.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadProcesses}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {processes.length > 0 && (
              <button
                onClick={handleKillAll}
                disabled={killingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4" />
                Kill All
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && processes.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : processes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <FolderOpen className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No active processes</p>
              <p className="text-sm mt-2">Launch a project to see processes here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(processByProject).map(([projectPath, procs]) => (
                <div key={projectPath} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-700">
                      {procs[0].projectName}
                    </h3>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                      {procs.length}
                    </span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {procs.map(proc => (
                      <ProcessCard
                        key={proc.pid}
                        process={proc}
                        onKill={handleKill}
                        isKilling={killingPids.has(proc.pid)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

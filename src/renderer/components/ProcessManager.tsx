import { useState, useEffect } from 'react';
import type { ProcessInfo } from '../../shared/types';
import { ProcessCard } from './ProcessCard';
import { RefreshCw, XCircle } from 'lucide-react';

interface ProcessManagerProps {
  projectPath: string;
  projectName: string;
}

export function ProcessManager({ projectPath, projectName }: ProcessManagerProps) {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [killingPids, setKillingPids] = useState<Set<number>>(new Set());
  const [killingAll, setKillingAll] = useState(false);

  const loadProcesses = async () => {
    try {
      setLoading(true);
      const procs = await window.electron.getProjectProcesses(projectPath, projectName);
      setProcesses(procs);
    } catch (error) {
      console.error('Error loading processes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcesses();
    // Poll every 5 seconds
    const interval = setInterval(loadProcesses, 5000);
    return () => clearInterval(interval);
  }, [projectPath, projectName]);

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
    if (!confirm('Kill all processes for this project?')) return;

    setKillingAll(true);
    try {
      await window.electron.killProjectProcesses(projectPath);
      // Reload after a short delay
      setTimeout(loadProcesses, 500);
    } catch (error) {
      console.error('Error killing all processes:', error);
    } finally {
      setKillingAll(false);
    }
  };

  if (loading && processes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500 text-sm">No active processes</p>
        <p className="text-slate-400 text-xs mt-1">
          Launch this project to see processes here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-700">
            Running Processes
          </h3>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
            {processes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadProcesses}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {processes.length > 0 && (
            <button
              onClick={handleKillAll}
              disabled={killingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-4 h-4" />
              Kill All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {processes.map(proc => (
          <ProcessCard
            key={proc.pid}
            process={proc}
            onKill={handleKill}
            isKilling={killingPids.has(proc.pid)}
          />
        ))}
      </div>
    </div>
  );
}

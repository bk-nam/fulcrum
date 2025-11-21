import type { ProcessInfo } from '../../shared/types';
import { X, Terminal, Code } from 'lucide-react';

interface ProcessCardProps {
  process: ProcessInfo;
  onKill: (pid: number) => void;
  isKilling?: boolean;
}

export function ProcessCard({ process, onKill, isKilling }: ProcessCardProps) {
  const getTimeSince = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const Icon = process.type === 'editor' ? Code : Terminal;

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div className={`p-2 rounded-lg ${process.type === 'editor' ? 'bg-indigo-100' : 'bg-green-100'}`}>
          <Icon className={`w-4 h-4 ${process.type === 'editor' ? 'text-indigo-600' : 'text-green-600'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-slate-700 capitalize">
              {process.type}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-mono">PID {process.pid}</span>
            {process.port && (
              <>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  :{process.port}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-500 truncate">
              {process.command}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {getTimeSince(process.launchTime)}
          </span>

          <button
            onClick={() => onKill(process.pid)}
            disabled={isKilling}
            className="p-1.5 rounded-md hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Kill process"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

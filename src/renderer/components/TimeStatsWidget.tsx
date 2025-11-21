import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Calendar, X } from 'lucide-react';
import type { TimeTrackingSummary } from '../../shared/types';
import { formatDuration } from '../utils/timeFormat';

interface TimeStatsWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

const TimeStatsWidget: React.FC<TimeStatsWidgetProps> = ({ isOpen, onClose }) => {
  const [summary, setSummary] = useState<TimeTrackingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadSummary();
    }
  }, [isOpen]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await window.electron.getTimeTrackingSummary();
      setSummary(data);
    } catch (error) {
      console.error('Error loading time tracking summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Time Tracking</h2>
            <p className="text-sm text-gray-500 mt-1">Your productivity statistics</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-all duration-300"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-gray-500">Loading statistics...</p>
            </div>
          ) : !summary || summary.totalProjects === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <Clock className="w-16 h-16 text-gray-300" />
              <div className="text-center">
                <p className="text-gray-600 text-lg font-medium">No time data yet</p>
                <p className="text-gray-500 text-sm mt-2">
                  Launch a project to start tracking your time
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                {/* Total Time */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-700">All Time</span>
                  </div>
                  <div className="text-2xl font-bold text-indigo-900">
                    {formatDuration(summary.totalTime)}
                  </div>
                  <div className="text-xs text-indigo-600 mt-1">
                    {summary.totalProjects} project{summary.totalProjects !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Weekly Time */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">This Week</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {formatDuration(summary.weeklyTime)}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    {summary.totalTime > 0
                      ? `${Math.round((summary.weeklyTime / summary.totalTime) * 100)}% of total`
                      : '0%'}
                  </div>
                </div>

                {/* Today Time */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">Today</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-900">
                    {formatDuration(summary.todayTime)}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">
                    {summary.weeklyTime > 0
                      ? `${Math.round((summary.todayTime / summary.weeklyTime) * 100)}% of week`
                      : '0%'}
                  </div>
                </div>
              </div>

              {/* Top Projects */}
              {summary.topProjects.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Projects</h3>
                  <div className="space-y-3">
                    {summary.topProjects.map((project, index) => {
                      const percentage = summary.totalTime > 0
                        ? (project.time / summary.totalTime) * 100
                        : 0;

                      return (
                        <div key={project.projectPath} className="relative">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                #{index + 1}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {project.projectName}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-indigo-600">
                              {formatDuration(project.time)}
                            </span>
                          </div>
                          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {percentage.toFixed(1)}% of total time
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info Footer */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Time tracking starts when you launch a project and stops when you close Fulcrum
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeStatsWidget;

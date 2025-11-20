import React from 'react';
import PhaseSection from './PhaseSection';

interface Task {
  id: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'Ready' | 'In Progress' | 'Review' | 'Done';
  period?: string;
  spec?: string;
}

interface Phase {
  name: string;
  tasks: Task[];
}

interface WbsData {
  project_info?: any;
  milestones?: any[];
  phases?: Phase[];
  risks?: any[];
}

interface GuiEditorProps {
  parsedWbs: WbsData;
  onUpdate: (updatedWbs: WbsData) => void;
}

const GuiEditor: React.FC<GuiEditorProps> = ({ parsedWbs, onUpdate }) => {
  // Calculate overall progress
  const calculateProgress = () => {
    if (!parsedWbs.phases || parsedWbs.phases.length === 0) {
      return { total: 0, completed: 0, percentage: 0 };
    }

    let total = 0;
    let completed = 0;

    parsedWbs.phases.forEach((phase) => {
      if (phase.tasks && phase.tasks.length > 0) {
        total += phase.tasks.length;
        completed += phase.tasks.filter((task) => task.status === 'Done').length;
      }
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percentage };
  };

  const progress = calculateProgress();

  // Handle phase update
  const handlePhaseUpdate = (phaseIndex: number, updatedPhase: Phase) => {
    const updatedPhases = [...(parsedWbs.phases || [])];
    updatedPhases[phaseIndex] = updatedPhase;
    onUpdate({ ...parsedWbs, phases: updatedPhases });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Overall Progress Bar */}
      <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-xl border-2 border-transparent shadow-lg relative overflow-hidden"
           style={{
             backgroundImage: 'linear-gradient(to bottom right, rgb(250, 245, 255), rgb(252, 231, 243), rgb(255, 247, 237)), linear-gradient(135deg, #8B5CF6, #EC4899, #F97316)',
             backgroundOrigin: 'border-box',
             backgroundClip: 'padding-box, border-box',
           }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold bg-gradient-primary bg-clip-text text-transparent">Overall Progress</h3>
          <span className="text-sm font-bold bg-gradient-rainbow bg-clip-text text-transparent">
            {progress.completed} / {progress.total} tasks completed
          </span>
        </div>
        <div className="relative">
          <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-rainbow transition-all duration-700 flex items-center justify-end pr-3 shadow-glow-purple"
              style={{
                width: `${progress.percentage}%`,
                backgroundSize: '200% 200%',
                animation: progress.percentage > 0 ? 'gradient 3s ease infinite' : 'none',
              }}
            >
              {progress.percentage > 15 && (
                <span className="text-xs font-bold text-white drop-shadow-md">{progress.percentage}%</span>
              )}
            </div>
          </div>
          {progress.percentage <= 15 && progress.percentage > 0 && (
            <span className="absolute left-3 top-0.5 text-xs font-bold bg-gradient-primary bg-clip-text text-transparent">
              {progress.percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Phases List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {parsedWbs.phases && parsedWbs.phases.length > 0 ? (
          parsedWbs.phases.map((phase, index) => (
            <PhaseSection
              key={`phase-${index}`}
              phase={phase}
              onUpdate={(updatedPhase) => handlePhaseUpdate(index, updatedPhase)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg font-medium">No phases found</p>
            <p className="text-sm mt-2">Switch to Code mode to add phases manually</p>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <strong>💡 Tip:</strong> Click on tasks to toggle status, expand for details, or switch to{' '}
        <strong>Code mode</strong> to edit milestones, risks, and other fields.
      </div>
    </div>
  );
};

export default GuiEditor;

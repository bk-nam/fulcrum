import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import TaskItem from './TaskItem';

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

interface PhaseSectionProps {
  phase: Phase;
  onUpdate: (updatedPhase: Phase) => void;
}

const PhaseSection: React.FC<PhaseSectionProps> = ({ phase, onUpdate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Calculate task completion
  const totalTasks = phase.tasks?.length || 0;
  const completedTasks = phase.tasks?.filter((task) => task.status === 'Done').length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Handle task update
  const handleTaskUpdate = (taskIndex: number, updatedTask: Task) => {
    const updatedTasks = [...phase.tasks];
    updatedTasks[taskIndex] = updatedTask;
    onUpdate({ ...phase, tasks: updatedTasks });
  };

  return (
    <div className="border-2 border-transparent rounded-xl overflow-hidden bg-white shadow-lg hover:shadow-neon transition-all duration-300"
         style={{
           backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #06B6D4, #3B82F6)',
           backgroundOrigin: 'border-box',
           backgroundClip: 'padding-box, border-box',
         }}>
      {/* Phase Header */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-cool cursor-pointer hover:shadow-glow-cyan transition-all duration-300"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Collapse/Expand Icon */}
          <button className="text-white hover:scale-110 transition-transform">
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {/* Phase Name */}
          <h3 className="text-lg font-bold text-white drop-shadow-md">{phase.name}</h3>
        </div>

        {/* Completion Status */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/90">
            {completedTasks} / {totalTasks} tasks
          </span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2.5 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-gradient-success shadow-glow-cyan transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white drop-shadow-md">{completionPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Phase Content: Task List */}
      {!isCollapsed && (
        <div className="p-4 space-y-3">
          {phase.tasks && phase.tasks.length > 0 ? (
            phase.tasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={(updatedTask) => handleTaskUpdate(index, updatedTask)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No tasks in this phase yet.</p>
            </div>
          )}

          {/* Add Task Button (Placeholder for future enhancement) */}
          <button
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
            disabled
            title="Coming soon"
          >
            + Add Task
          </button>
        </div>
      )}
    </div>
  );
};

export default PhaseSection;

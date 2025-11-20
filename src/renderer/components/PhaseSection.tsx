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
  // Calculate task completion
  const totalTasks = phase.tasks?.length || 0;
  const completedTasks = phase.tasks?.filter((task) => task.status === 'Done').length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Default to collapsed if 100% complete
  const [isCollapsed, setIsCollapsed] = useState(completionPercentage === 100);

  // Handle task update
  const handleTaskUpdate = (taskIndex: number, updatedTask: Task) => {
    const updatedTasks = [...phase.tasks];
    updatedTasks[taskIndex] = updatedTask;
    onUpdate({ ...phase, tasks: updatedTasks });
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-300">
      {/* Phase Header */}
      <div
        className="flex items-center justify-between p-4 bg-slate-700 cursor-pointer hover:bg-slate-600 transition-all duration-300"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Collapse/Expand Icon */}
          <button className="p-1.5 rounded-lg border border-slate-500 bg-slate-600 text-white hover:bg-slate-500 hover:border-slate-400 transition-all duration-300">
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {/* Phase Name */}
          <h3 className="text-lg font-semibold text-white">{phase.name}</h3>
        </div>

        {/* Completion Status */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-200">
            {completedTasks} / {totalTasks} tasks
          </span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2.5 bg-slate-500 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-white">{completionPercentage}%</span>
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
            className="w-full py-3 border-2 border-dashed border-purple-300 bg-white rounded-lg text-brand-purple hover:border-brand-purple hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:shadow-md transition-all duration-300 text-sm font-semibold cursor-pointer"
            onClick={() => alert('Coming soon! This feature is under development.')}
            title="Add a new task to this phase"
          >
            + Add Task
          </button>
        </div>
      )}
    </div>
  );
};

export default PhaseSection;

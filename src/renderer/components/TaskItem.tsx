import React, { useState } from 'react';
import { Circle, Clock, CheckCircle, ChevronDown, ChevronRight, Trash2, GripVertical } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'Ready' | 'In Progress' | 'Review' | 'Done';
  period?: string;
  spec?: string;
}

interface TaskItemProps {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
  onDelete: () => void;
  dragHandleProps?: any;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete, dragHandleProps }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Status toggle logic
  const statusCycle: Task['status'][] = ['Ready', 'In Progress', 'Review', 'Done'];
  const handleStatusToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // 부모 요소로 이벤트 전파 방지
    const currentIndex = statusCycle.indexOf(task.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    onUpdate({ ...task, status: nextStatus });
  };

  // Delete task with confirmation
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete task "[${task.id}] ${task.title}"?`)) {
      onDelete();
    }
  };

  // Status icon and color
  const getStatusDisplay = () => {
    switch (task.status) {
      case 'Ready':
        return { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100' };
      case 'In Progress':
        return { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100' };
      case 'Review':
        return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100' };
      case 'Done':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' };
      default:
        // Fallback for unexpected status values
        return { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100' };
    }
  };

  // Priority color
  const getPriorityColor = () => {
    switch (task.priority) {
      case 'P0':
        return 'bg-red-500 text-white';
      case 'P1':
        return 'bg-orange-500 text-white';
      case 'P2':
        return 'bg-yellow-500 text-white';
      case 'P3':
        return 'bg-blue-500 text-white';
      default:
        // Fallback for unexpected priority values
        return 'bg-gray-500 text-white';
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-sm transition-all duration-300 bg-white cursor-pointer">
      {/* Task Header */}
      <div className="flex items-center gap-3" onClick={() => setIsExpanded(!isExpanded)}>
        {/* Drag Handle */}
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            title="Drag to reorder task"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        {/* Status Toggle Button */}
        <button
          onClick={handleStatusToggle}
          className={`flex items-center justify-center w-10 h-10 rounded-full ${statusDisplay.bg} hover:scale-105 transition-all duration-300 flex-shrink-0`}
          title={`Status: ${task.status} (click to change)`}
        >
          <StatusIcon className={`w-6 h-6 ${statusDisplay.color}`} />
        </button>

        {/* Task ID and Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-500">[{task.id}]</span>
            <h4 className="text-base font-semibold text-gray-900 truncate">{task.title}</h4>
          </div>
          {task.period && (
            <p className="text-xs text-gray-500 mt-0.5">📅 {task.period}</p>
          )}
        </div>

        {/* Priority Badge */}
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor()} flex-shrink-0 shadow-md`}>
          {task.priority}
        </span>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-300 transition-all duration-300 flex-shrink-0"
          title="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Expand/Collapse Button */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // 부모 요소로 이벤트 전파 방지
            setIsExpanded(!isExpanded);
          }}
          className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-all duration-300 flex-shrink-0"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Expanded Content: Spec Editor */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Implementation Spec
          </label>
          <textarea
            value={task.spec || ''}
            onChange={(e) => onUpdate({ ...task, spec: e.target.value })}
            className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-brand-purple transition-all"
            rows={6}
            placeholder="Enter detailed implementation plan..."
          />

          {/* Priority Selector */}
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {(['P0', 'P1', 'P2', 'P3'] as const).map((priority) => (
                <button
                  key={priority}
                  onClick={() => onUpdate({ ...task, priority })}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                    task.priority === priority
                      ? priority === 'P0'
                        ? 'bg-red-500 text-white shadow-sm scale-105'
                        : priority === 'P1'
                        ? 'bg-orange-500 text-white shadow-sm scale-105'
                        : priority === 'P2'
                        ? 'bg-yellow-500 text-white shadow-sm scale-105'
                        : 'bg-blue-500 text-white shadow-sm scale-105'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300 hover:scale-105'
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskItem;

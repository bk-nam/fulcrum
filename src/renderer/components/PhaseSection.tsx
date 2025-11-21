import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Plus, X, GripVertical, Pin } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  onDelete: () => void;
  dragHandleProps?: any;
  isPinned?: boolean;
  onPin?: () => void;
}

const PhaseSection: React.FC<PhaseSectionProps> = ({ phase, onUpdate, onDelete, dragHandleProps, isPinned, onPin }) => {
  // Calculate task completion
  const totalTasks = phase.tasks?.length || 0;
  const completedTasks = phase.tasks?.filter((task) => task.status === 'Done').length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Default to collapsed if 100% complete
  const [isCollapsed, setIsCollapsed] = useState(completionPercentage === 100);

  // Add task state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskId, setNewTaskId] = useState('');

  // Setup sensors for task dragging
  const taskSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle task update
  const handleTaskUpdate = (taskIndex: number, updatedTask: Task) => {
    const updatedTasks = [...phase.tasks];
    updatedTasks[taskIndex] = updatedTask;
    onUpdate({ ...phase, tasks: updatedTasks });
  };

  // Handle task delete
  const handleTaskDelete = (taskIndex: number) => {
    const updatedTasks = [...phase.tasks];
    updatedTasks.splice(taskIndex, 1);
    onUpdate({ ...phase, tasks: updatedTasks });
  };

  // Handle phase delete
  const handlePhaseDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete phase "${phase.name}" and all ${totalTasks} tasks?`)) {
      onDelete();
    }
  };

  // Handle add task
  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: newTaskId.trim() || `TASK-${Date.now().toString().slice(-6)}`,
      title: newTaskTitle.trim(),
      priority: 'P2',
      status: 'Ready',
      period: undefined,
      spec: '',
    };

    const updatedTasks = [...phase.tasks, newTask];
    onUpdate({ ...phase, tasks: updatedTasks });

    // Reset form
    setNewTaskTitle('');
    setNewTaskId('');
    setIsAddingTask(false);
  };

  const handleCancelAdd = () => {
    setNewTaskTitle('');
    setNewTaskId('');
    setIsAddingTask(false);
  };

  // Handle task drag end
  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = phase.tasks.findIndex(t => t.id === active.id);
    const newIndex = phase.tasks.findIndex(t => t.id === over.id);

    const reorderedTasks = arrayMove(phase.tasks, oldIndex, newIndex);
    onUpdate({ ...phase, tasks: reorderedTasks });
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-300">
      {/* Phase Header */}
      <div
        className="flex items-center justify-between p-4 bg-slate-700 cursor-pointer hover:bg-slate-600 transition-all duration-300"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Drag Handle */}
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing p-1.5 text-slate-300 hover:text-white transition-colors"
              title="Drag to reorder phase"
            >
              <GripVertical className="w-5 h-5" />
            </button>
          )}

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

          {/* Pin Button */}
          {onPin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
              className={`ml-3 p-1.5 rounded-lg border transition-all duration-300 ${
                isPinned
                  ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700'
                  : 'bg-slate-600 border-slate-500 text-slate-300 hover:bg-slate-500 hover:text-white'
              }`}
              title={isPinned ? 'Unpin from Current Focus' : 'Pin to Current Focus'}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
            </button>
          )}

          {/* Delete Phase Button */}
          <button
            onClick={handlePhaseDelete}
            className="ml-3 p-1.5 rounded-lg border border-slate-500 bg-slate-600 text-slate-300 hover:text-red-400 hover:bg-red-900 hover:border-red-700 transition-all duration-300"
            title="Delete phase"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
            <DndContext
              sensors={taskSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTaskDragEnd}
            >
              <SortableContext
                items={phase.tasks.map((task) => task.id)}
                strategy={verticalListSortingStrategy}
              >
                {phase.tasks.map((task, index) => (
                  <SortableTaskItem
                    key={task.id}
                    id={task.id}
                    task={task}
                    onUpdate={(updatedTask) => handleTaskUpdate(index, updatedTask)}
                    onDelete={() => handleTaskDelete(index)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No tasks in this phase yet.</p>
            </div>
          )}

          {/* Add Task Form */}
          {isAddingTask ? (
            <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task ID (optional)
                </label>
                <input
                  type="text"
                  value={newTaskId}
                  onChange={(e) => setNewTaskId(e.target.value)}
                  placeholder="e.g., TASK-001 (auto-generated if empty)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
                <button
                  onClick={handleCancelAdd}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="w-full py-3 border-2 border-dashed border-purple-300 bg-white rounded-lg text-purple-600 hover:border-purple-500 hover:bg-purple-50 hover:shadow-md transition-all duration-300 text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
              onClick={() => setIsAddingTask(true)}
              title="Add a new task to this phase"
            >
              <Plus className="w-5 h-5" />
              Add Task
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Sortable wrapper for TaskItem
interface SortableTaskItemProps {
  id: string;
  task: Task;
  onUpdate: (updatedTask: Task) => void;
  onDelete: () => void;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  id,
  task,
  onUpdate,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms cubic-bezier(0.25, 0.1, 0.25, 1)',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 0,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem
        task={task}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

export default PhaseSection;

import React from 'react';
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
  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Handle phase delete
  const handlePhaseDelete = (phaseIndex: number) => {
    const updatedPhases = [...(parsedWbs.phases || [])];
    updatedPhases.splice(phaseIndex, 1);
    onUpdate({ ...parsedWbs, phases: updatedPhases });
  };

  // Handle phase drag end
  const handlePhaseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const phases = parsedWbs.phases || [];
    const oldIndex = phases.findIndex(p => p.name === active.id);
    const newIndex = phases.findIndex(p => p.name === over.id);

    const reorderedPhases = arrayMove(phases, oldIndex, newIndex);
    onUpdate({ ...parsedWbs, phases: reorderedPhases });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Overall Progress Bar */}
      <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Overall Progress</h3>
          <span className="text-sm font-medium text-slate-600">
            {progress.completed} / {progress.total} tasks completed
          </span>
        </div>
        <div className="relative">
          <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-700 flex items-center justify-end pr-3"
              style={{
                width: `${progress.percentage}%`,
              }}
            >
              {progress.percentage > 15 && (
                <span className="text-xs font-semibold text-white">{progress.percentage}%</span>
              )}
            </div>
          </div>
          {progress.percentage <= 15 && progress.percentage > 0 && (
            <span className="absolute left-3 top-0 text-xs font-semibold text-slate-700">
              {progress.percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Phases List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {parsedWbs.phases && parsedWbs.phases.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handlePhaseDragEnd}
          >
            <SortableContext
              items={parsedWbs.phases.map((phase) => phase.name)}
              strategy={verticalListSortingStrategy}
            >
              {parsedWbs.phases.map((phase, index) => (
                <SortablePhaseSection
                  key={phase.name}
                  id={phase.name}
                  phase={phase}
                  onUpdate={(updatedPhase) => handlePhaseUpdate(index, updatedPhase)}
                  onDelete={() => handlePhaseDelete(index)}
                />
              ))}
            </SortableContext>
          </DndContext>
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

// Sortable wrapper for PhaseSection
interface SortablePhaseSectionProps {
  id: string;
  phase: Phase;
  onUpdate: (updatedPhase: Phase) => void;
  onDelete: () => void;
}

const SortablePhaseSection: React.FC<SortablePhaseSectionProps> = ({
  id,
  phase,
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
      <PhaseSection
        phase={phase}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

export default GuiEditor;

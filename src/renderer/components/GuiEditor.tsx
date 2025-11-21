import React, { useState, useEffect } from 'react';
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
import { Target, X } from 'lucide-react';

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
  projectPath: string;
}

const GuiEditor: React.FC<GuiEditorProps> = ({ parsedWbs, onUpdate, projectPath }) => {
  const [currentFocusPhase, setCurrentFocusPhase] = useState<Phase | null>(null);
  const [focusPhaseName, setFocusPhaseName] = useState<string | null>(null);

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load current focus phase on mount
  useEffect(() => {
    loadCurrentFocus();
  }, [parsedWbs.phases, projectPath]);

  const loadCurrentFocus = async () => {
    try {
      const phaseName = await window.electron.getCurrentFocusPhase(projectPath);
      if (phaseName && parsedWbs.phases) {
        const phase = parsedWbs.phases.find(p => p.name === phaseName);
        setCurrentFocusPhase(phase || null);
        setFocusPhaseName(phaseName);
      }
    } catch (error) {
      console.error('Error loading current focus:', error);
    }
  };

  const handlePin = async (phaseName: string) => {
    const phase = parsedWbs.phases?.find(p => p.name === phaseName);
    if (phase) {
      // Toggle: if already pinned, unpin
      if (focusPhaseName === phaseName) {
        clearFocus();
      } else {
        // Pin new phase (replaces existing)
        setCurrentFocusPhase(phase);
        setFocusPhaseName(phaseName);
        try {
          await window.electron.setCurrentFocusPhase(projectPath, phaseName);
        } catch (error) {
          console.error('Error setting current focus:', error);
        }
      }
    }
  };

  const clearFocus = async () => {
    setCurrentFocusPhase(null);
    setFocusPhaseName(null);
    try {
      await window.electron.setCurrentFocusPhase(projectPath, null);
    } catch (error) {
      console.error('Error clearing focus:', error);
    }
  };

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

    if (!over) return;

    // Original reordering logic
    if (active.id === over.id) return;

    const phases = parsedWbs.phases || [];
    const oldIndex = phases.findIndex(p => p.name === active.id);
    const newIndex = phases.findIndex(p => p.name === over.id);

    const reorderedPhases = arrayMove(phases, oldIndex, newIndex);
    onUpdate({ ...parsedWbs, phases: reorderedPhases });
  };

  // Handle focus phase update
  const handleFocusPhaseUpdate = (updatedPhase: Phase) => {
    // Update in parsedWbs
    const idx = parsedWbs.phases?.findIndex(p => p.name === focusPhaseName);
    if (idx !== undefined && idx >= 0) {
      handlePhaseUpdate(idx, updatedPhase);
      // Also update local focus state
      setCurrentFocusPhase(updatedPhase);
    }
  };

  // Handle focus phase delete
  const handleFocusPhaseDelete = () => {
    const idx = parsedWbs.phases?.findIndex(p => p.name === focusPhaseName);
    if (idx !== undefined && idx >= 0) {
      handlePhaseDelete(idx);
      clearFocus();
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handlePhaseDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Overall Progress - Compact */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
            Progress:
          </span>
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-indigo-600 whitespace-nowrap">
            {progress.percentage}%
          </span>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            ({progress.completed}/{progress.total})
          </span>
        </div>

        {/* Current Focus Slot */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              Current Focus
            </h3>
            {currentFocusPhase && (
              <button
                onClick={clearFocus}
                className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          {currentFocusPhase ? (
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3">
              <PhaseSection
                phase={currentFocusPhase}
                onUpdate={handleFocusPhaseUpdate}
                onDelete={handleFocusPhaseDelete}
                isPinned={true}
                onPin={() => clearFocus()}
              />
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50">
              <Target className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-slate-500 text-sm font-medium">No phase pinned</p>
              <p className="text-slate-400 text-xs mt-1">Click the pin button on any phase below to focus on it</p>
            </div>
          )}
        </div>

        {/* All Phases List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">All Phases</h3>
          {parsedWbs.phases && parsedWbs.phases.length > 0 ? (
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
                  isPinned={focusPhaseName === phase.name}
                  onPin={() => handlePin(phase.name)}
                />
              ))}
            </SortableContext>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-lg font-medium">No phases found</p>
              <p className="text-sm mt-2">Switch to Code mode to add phases manually</p>
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>💡 Tip:</strong> Click the pin button (📌) on any phase to set it as your Current Focus. Click tasks to toggle status, or switch to{' '}
          <strong>Code mode</strong> to edit milestones and risks.
        </div>
      </div>
    </DndContext>
  );
};

// Sortable wrapper for PhaseSection
interface SortablePhaseSectionProps {
  id: string;
  phase: Phase;
  onUpdate: (updatedPhase: Phase) => void;
  onDelete: () => void;
  isPinned?: boolean;
  onPin?: () => void;
}

const SortablePhaseSection: React.FC<SortablePhaseSectionProps> = ({
  id,
  phase,
  onUpdate,
  onDelete,
  isPinned,
  onPin,
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
        isPinned={isPinned}
        onPin={onPin}
      />
    </div>
  );
};

export default GuiEditor;

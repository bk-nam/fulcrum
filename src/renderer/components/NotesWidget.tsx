import React, { useState, useEffect, useRef } from 'react';
import { X, StickyNote, Trash2, ExternalLink } from 'lucide-react';
import type { QuickNote, Project } from '../../shared/types';

interface NotesWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProject: Project | null;
  onOpenProject?: (projectPath: string) => void;
}

const NotesWidget: React.FC<NotesWidgetProps> = ({
  isOpen,
  onClose,
  selectedProject,
  onOpenProject,
}) => {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [linkToProject, setLinkToProject] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load notes on mount and when widget opens
  useEffect(() => {
    if (isOpen) {
      loadNotes();
      // Auto-link if project is selected
      if (selectedProject) {
        setLinkToProject(true);
      }
    }
  }, [isOpen, selectedProject]);

  const loadNotes = async () => {
    try {
      const fetchedNotes = await window.electron.getQuickNotes();
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;

    try {
      setIsSaving(true);
      const newNote = await window.electron.saveQuickNote({
        note: noteText.trim(),
        projectPath: linkToProject && selectedProject ? selectedProject.path : undefined,
        pinned: false,
      });

      setNotes((prev) => [newNote, ...prev].slice(0, 10));
      setNoteText('');
      setLinkToProject(selectedProject ? true : false);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await window.electron.deleteQuickNote(noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const formatRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  const getProjectName = (path: string): string => {
    return path.split('/').pop() || path;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    // Cmd/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSaveNote();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-4 right-4 w-96 bg-white shadow-2xl rounded-lg border border-slate-300 z-40 flex flex-col max-h-[600px]"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-700 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5" />
          <h3 className="font-semibold">Quick Notes</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-600 rounded transition-colors"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Input Area */}
      <div className="p-4 border-b border-slate-200">
        <textarea
          ref={textareaRef}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="What are you working on?"
          className="w-full h-24 p-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />

        <div className="flex items-center justify-between mt-3">
          {selectedProject && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={linkToProject}
                onChange={(e) => setLinkToProject(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Link to {selectedProject.name}</span>
            </label>
          )}

          <button
            onClick={handleSaveNote}
            disabled={!noteText.trim() || isSaving}
            className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Note'}
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-2">
          Tip: Press Cmd/Ctrl+Enter to save
        </p>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <StickyNote className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs mt-1">Start writing to track your progress</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <time className="text-xs text-slate-500 font-medium">
                  {formatRelativeTime(note.timestamp)}
                </time>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                {note.note}
              </p>

              {note.projectPath && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => onOpenProject?.(note.projectPath!)}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {getProjectName(note.projectPath)}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotesWidget;

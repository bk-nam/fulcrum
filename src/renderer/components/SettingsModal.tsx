import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { Settings } from '../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Settings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [editorCommand, setEditorCommand] = useState('antigravity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await window.electron.getSettings();
      setEditorCommand(settings.editorCommand);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editorCommand.trim()) {
      alert('Editor command cannot be empty');
      return;
    }

    try {
      setSaving(true);
      const settings: Settings = {
        editorCommand: editorCommand.trim(),
      };
      await window.electron.saveSettings(settings);
      onSave(settings);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Loading settings...</p>
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="editorCommand"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Editor Command
                </label>
                <input
                  id="editorCommand"
                  type="text"
                  value={editorCommand}
                  onChange={(e) => setEditorCommand(e.target.value)}
                  placeholder="e.g., code, cursor, antigravity"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">
                  The command to launch your preferred code editor. Examples:
                </p>
                <ul className="mt-1 text-xs text-gray-500 list-disc list-inside space-y-1">
                  <li><code className="bg-gray-100 px-1 py-0.5 rounded">code</code> - Visual Studio Code</li>
                  <li><code className="bg-gray-100 px-1 py-0.5 rounded">cursor</code> - Cursor</li>
                  <li><code className="bg-gray-100 px-1 py-0.5 rounded">antigravity</code> - Google Antigravity IDE</li>
                  <li><code className="bg-gray-100 px-1 py-0.5 rounded">/full/path/to/editor</code> - Custom path</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

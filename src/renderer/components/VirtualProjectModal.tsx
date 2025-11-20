import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle, Lightbulb, Plus, Trash2 } from 'lucide-react';
import type { VirtualProject } from '../../shared/types';
import { VIRTUAL_PROJECT_CONTEXT_TEMPLATE } from '../../shared/constants';

interface VirtualProjectModalProps {
  virtualProject: VirtualProject | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (vp: Omit<VirtualProject, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onDelete?: (vpId: string) => void;
}

const VirtualProjectModal: React.FC<VirtualProjectModalProps> = ({
  virtualProject,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<Omit<VirtualProject, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    description: '',
    problem: '',
    solution: '',
    targetUsers: '',
    targetTechStack: [],
    estimatedSize: 'unknown',
    links: [],
    tags: [],
    inspiration: '',
  });

  const [techInput, setTechInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (virtualProject) {
      setFormData({
        name: virtualProject.name,
        description: virtualProject.description,
        problem: virtualProject.problem,
        solution: virtualProject.solution,
        targetUsers: virtualProject.targetUsers,
        targetTechStack: virtualProject.targetTechStack,
        estimatedSize: virtualProject.estimatedSize,
        links: virtualProject.links,
        tags: virtualProject.tags,
        inspiration: virtualProject.inspiration || '',
      });
    } else {
      // Reset for new project
      setFormData({
        name: '',
        description: '',
        problem: '',
        solution: '',
        targetUsers: '',
        targetTechStack: [],
        estimatedSize: 'unknown',
        links: [],
        tags: [],
        inspiration: '',
      });
    }
  }, [virtualProject, isOpen]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Please enter a project name');
      return;
    }

    onSave({
      ...formData,
      id: virtualProject?.id,
    });
  };

  const handleCopyContext = async () => {
    try {
      const tempVp: VirtualProject = {
        ...formData,
        id: virtualProject?.id || 'temp',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const prompt = VIRTUAL_PROJECT_CONTEXT_TEMPLATE(tempVp);
      await navigator.clipboard.writeText(prompt);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleDelete = () => {
    if (virtualProject && onDelete) {
      if (confirm(`Delete "${virtualProject.name}"? This cannot be undone.`)) {
        onDelete(virtualProject.id);
      }
    }
  };

  const addTech = () => {
    if (techInput.trim() && !formData.targetTechStack.includes(techInput.trim())) {
      setFormData({
        ...formData,
        targetTechStack: [...formData.targetTechStack, techInput.trim()],
      });
      setTechInput('');
    }
  };

  const removeTech = (tech: string) => {
    setFormData({
      ...formData,
      targetTechStack: formData.targetTechStack.filter((t) => t !== tech),
    });
  };

  const addLink = () => {
    if (linkInput.trim() && !formData.links.includes(linkInput.trim())) {
      setFormData({
        ...formData,
        links: [...formData.links, linkInput.trim()],
      });
      setLinkInput('');
    }
  };

  const removeLink = (link: string) => {
    setFormData({
      ...formData,
      links: formData.links.filter((l) => l !== link),
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[90vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-8 h-8 text-amber-500" />
            <h1 className="text-3xl font-bold text-gray-900">
              {virtualProject ? 'Edit Idea' : 'New Idea'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyContext}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors shadow-sm"
              title="Copy context for AI"
            >
              {copySuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Context
                </>
              )}
            </button>

            {virtualProject && onDelete && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
                title="Delete idea"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-all duration-300"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="My Awesome Project"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quick Pitch
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder="A tool that helps developers..."
              />
            </div>

            {/* Problem */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                What problem does this solve?
              </label>
              <textarea
                value={formData.problem}
                onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder="Developers struggle with..."
              />
            </div>

            {/* Solution */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                How will it solve it?
              </label>
              <textarea
                value={formData.solution}
                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder="By providing a simple interface to..."
              />
            </div>

            {/* Target Users */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Who is this for?
              </label>
              <input
                type="text"
                value={formData.targetUsers}
                onChange={(e) => setFormData({ ...formData, targetUsers: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Solo developers, small teams, etc."
              />
            </div>

            {/* Estimated Size */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Estimated Size
              </label>
              <select
                value={formData.estimatedSize}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimatedSize: e.target.value as VirtualProject['estimatedSize'],
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="unknown">Unknown / TBD</option>
                <option value="weekend">Weekend (~2 days)</option>
                <option value="week">One Week (~5 days)</option>
                <option value="month">One Month</option>
                <option value="epic">Epic (Multi-month)</option>
              </select>
            </div>

            {/* Tech Stack */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Planned Tech Stack
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="React, Node.js, etc."
                />
                <button
                  onClick={addTech}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.targetTechStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {tech}
                    <button
                      onClick={() => removeTech(tech)}
                      className="text-indigo-500 hover:text-indigo-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reference Links
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                />
                <button
                  onClick={addLink}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {formData.links.map((link) => (
                  <div
                    key={link}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
                  >
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-blue-600 hover:underline truncate"
                    >
                      {link}
                    </a>
                    <button
                      onClick={() => removeLink(link)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="web, mobile, ai, etc."
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-amber-500 hover:text-amber-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Inspiration */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Inspiration (Optional)
              </label>
              <input
                type="text"
                value={formData.inspiration}
                onChange={(e) => setFormData({ ...formData, inspiration: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Like Notion but for developers"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Save Idea
          </button>
        </div>
      </div>
    </div>
  );
};

export default VirtualProjectModal;

import React from 'react';
import { Lightbulb, Edit, Rocket } from 'lucide-react';
import type { VirtualProject } from '../../shared/types';

interface VirtualProjectCardProps {
  virtualProject: VirtualProject;
  onEdit: (vp: VirtualProject) => void;
  onConvert: (vp: VirtualProject) => void;
}

const VirtualProjectCard: React.FC<VirtualProjectCardProps> = ({
  virtualProject,
  onEdit,
  onConvert,
}) => {
  const sizeLabels = {
    weekend: '🏃 Weekend',
    week: '📅 Week',
    month: '📆 Month',
    epic: '🚀 Epic',
    unknown: '❓ TBD',
  };

  return (
    <div className="relative p-5 rounded-lg border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-lg transition-all group">
      {/* IDEA Badge */}
      <div className="absolute top-3 right-3">
        <span className="px-2 py-1 text-xs font-bold bg-amber-500 text-white rounded-full">
          IDEA
        </span>
      </div>

      {/* Icon */}
      <Lightbulb className="w-8 h-8 text-amber-600 mb-3" />

      {/* Content */}
      <h3 className="text-lg font-bold text-gray-900 pr-16">{virtualProject.name}</h3>
      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{virtualProject.description}</p>

      {/* Tags */}
      {virtualProject.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {virtualProject.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full"
            >
              {tag}
            </span>
          ))}
          {virtualProject.tags.length > 3 && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
              +{virtualProject.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Tech Stack */}
      {virtualProject.targetTechStack.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {virtualProject.targetTechStack.slice(0, 3).map((tech) => (
            <span
              key={tech}
              className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded"
            >
              {tech}
            </span>
          ))}
          {virtualProject.targetTechStack.length > 3 && (
            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
              +{virtualProject.targetTechStack.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Size indicator */}
      <span className="text-xs text-amber-600 mt-2 block font-medium">
        {sizeLabels[virtualProject.estimatedSize]}
      </span>

      {/* Hover Actions */}
      <div className="absolute inset-0 bg-amber-900/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
        <button
          onClick={() => onEdit(virtualProject)}
          className="px-4 py-2 bg-white text-amber-900 rounded-lg hover:bg-amber-50 transition-colors font-medium flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={() => onConvert(virtualProject)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
        >
          <Rocket className="w-4 h-4" />
          Convert
        </button>
      </div>
    </div>
  );
};

export default VirtualProjectCard;

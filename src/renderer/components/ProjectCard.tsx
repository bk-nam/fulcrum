import React, { useState } from 'react';
import { Package, FileCode, Box, Folder, Rocket, Milestone } from 'lucide-react';
import type { Project } from '../../shared/types';
import { getRelativeTime, getProjectHealth, getHealthColor } from '../../shared/utils';

interface ProjectCardProps {
  project: Project;
  onLaunch: (project: Project) => void;
  onClick: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onLaunch, onClick }) => {
  const [isLaunching, setIsLaunching] = useState(false);

  // Calculate project health and freshness
  const health = getProjectHealth(project.lastModified);
  const relativeTime = getRelativeTime(project.lastModified);
  const healthColors = getHealthColor(health);
  const isZombie = health === 'zombie';

  // Select icon based on project type
  const IconComponent = () => {
    switch (project.type) {
      case 'node':
        return <Package className="w-8 h-8 text-green-600" />;
      case 'python':
        return <FileCode className="w-8 h-8 text-blue-600" />;
      case 'rust':
        return <Box className="w-8 h-8 text-orange-600" />;
      default:
        return <Folder className="w-8 h-8 text-gray-600" />;
    }
  };

  const handleLaunchClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLaunching(true);
    try {
      await onLaunch(project);
    } finally {
      // Reset after a short delay to show feedback
      setTimeout(() => setIsLaunching(false), 1000);
    }
  };

  // Tech stack rendering: show first 3, then "+X"
  const renderTechStack = () => {
    if (!project.meta?.techStack || !Array.isArray(project.meta.techStack) || project.meta.techStack.length === 0) {
      return null;
    }

    const displayTechs = project.meta.techStack.slice(0, 3);
    const remaining = project.meta.techStack.length - 3;

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {displayTechs.map((tech, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200"
          >
            {tech}
          </span>
        ))}
        {remaining > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border border-orange-200">
            +{remaining}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 hover:shadow-neon hover:-translate-y-1 transition-all duration-300 border-2 border-gray-200 hover:border-transparent hover:bg-gradient-to-br hover:from-white hover:via-purple-50 hover:to-pink-50 relative group cursor-pointer min-h-[140px] flex flex-col ${
        isZombie ? 'opacity-75 hover:opacity-100' : ''
      }`}
      style={{
        backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #8B5CF6, #EC4899)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
      }}
      onClick={() => onClick(project)}
    >
      {/* Launch Button */}
      <button
        onClick={handleLaunchClick}
        disabled={isLaunching}
        className="absolute top-3 right-3 p-2 bg-gradient-primary text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:shadow-glow-purple disabled:opacity-50"
        title="Launch project"
      >
        <Rocket className={`w-4 h-4 ${isLaunching ? 'animate-bounce' : ''}`} />
      </button>

      {/* Main Content */}
      <div className="flex items-start gap-4 flex-1">
        <div className="flex-shrink-0">
          <IconComponent />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {project.name}
            </h3>
            {/* Freshness Indicator */}
            <div className="flex flex-row-reverse items-center gap-1.5 flex-shrink-0">
              <div className={`w-3 h-3 rounded-full ${healthColors.dot} ${health === 'fresh' ? 'animate-pulse shadow-glow-cyan' : ''}`} />
              <span className={`text-xs font-medium ${healthColors.text}`}>
                {relativeTime}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 capitalize">
            {project.type}
          </p>
          {renderTechStack()}
        </div>
      </div>

      {/* Phase Indicator */}
      {project.meta?.currentPhase && (
        <div className="mt-3 pt-3 border-t border-gradient-to-r border-transparent bg-gradient-to-r from-purple-100 via-transparent to-pink-100">
          <div className="flex items-center gap-2 text-sm">
            <Milestone className="w-4 h-4 text-brand-purple" />
            <span className="truncate font-medium bg-gradient-primary bg-clip-text text-transparent">
              {project.meta.currentPhase}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;

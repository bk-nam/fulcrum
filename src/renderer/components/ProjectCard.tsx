import React, { useState } from 'react';
import { Package, FileCode, Box, Folder, Rocket } from 'lucide-react';
import type { Project } from '../../shared/types';

interface ProjectCardProps {
  project: Project;
  onLaunch: (project: Project) => void;
  onClick: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onLaunch, onClick }) => {
  const [isLaunching, setIsLaunching] = useState(false);
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

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 border border-gray-200 relative group cursor-pointer"
      onClick={() => onClick(project)}
    >
      {/* Launch Button */}
      <button
        onClick={handleLaunchClick}
        disabled={isLaunching}
        className="absolute top-3 right-3 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:opacity-50"
        title="Launch project"
      >
        <Rocket className={`w-4 h-4 ${isLaunching ? 'animate-bounce' : ''}`} />
      </button>

      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <IconComponent />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {project.name}
          </h3>
          <p className="text-sm text-gray-500 capitalize">
            {project.type}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;

import React, { useState, useEffect } from 'react';
import { Rocket, Milestone, Folder, Clock } from 'lucide-react';
import { SiNodedotjs, SiPython, SiRust } from 'react-icons/si';
import type { Project, ProjectActivity } from '../../shared/types';
import { getRelativeTime, getProjectHealth, getHealthColor } from '../../shared/utils';
import { StatusBadge } from './StatusBadge';

interface ProjectCardProps {
  project: Project;
  onLaunch: (project: Project) => void;
  onClick: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onLaunch, onClick }) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [activity, setActivity] = useState<ProjectActivity | null>(null);

  // Load activity for this project (Phase 10: TIME-003)
  useEffect(() => {
    const loadActivity = async () => {
      try {
        const projectActivity = await window.electron.getProjectActivity(project.path);
        setActivity(projectActivity);
      } catch (error) {
        console.error('Error loading project activity:', error);
      }
    };

    loadActivity();
  }, [project.path]);

  // Calculate project health and freshness
  const health = getProjectHealth(project.lastModified);
  const relativeTime = getRelativeTime(project.lastModified);
  const healthColors = getHealthColor(health);
  const isZombie = health === 'zombie';

  // Select icon based on project type
  const IconComponent = () => {
    switch (project.type) {
      case 'node':
        return <SiNodedotjs className="w-8 h-8 text-slate-600" />;
      case 'python':
        return <SiPython className="w-8 h-8 text-slate-600" />;
      case 'rust':
        return <SiRust className="w-8 h-8 text-slate-600" />;
      default:
        return <Folder className="w-8 h-8 text-slate-600" />;
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
      className={`bg-white rounded-lg shadow-sm p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-slate-200 hover:border-slate-300 relative group cursor-pointer min-h-[140px] flex flex-col ${
        isZombie ? 'opacity-60 hover:opacity-100' : ''
      }`}
      onClick={() => onClick(project)}
    >
      {/* Launch Button */}
      <button
        onClick={handleLaunchClick}
        disabled={isLaunching}
        className="absolute top-3 right-3 p-2 bg-indigo-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 hover:bg-indigo-700 disabled:opacity-50"
        title="Launch project"
      >
        <Rocket className={`w-4 h-4`} />
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
              <div className={`w-3 h-3 rounded-full ${healthColors.dot}`} />
              <span className={`text-xs font-medium ${healthColors.text}`}>
                {relativeTime}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 capitalize">
            {project.type}
          </p>

          {/* Status Badge (Read-only) */}
          {project.status && (
            <div className="mt-2">
              <StatusBadge status={project.status} />
            </div>
          )}

          {renderTechStack()}
        </div>
      </div>

      {/* Phase Indicator */}
      {project.meta?.currentPhase && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2 text-sm">
            <Milestone className="w-4 h-4 text-indigo-600" />
            <span className="truncate font-medium text-slate-700">
              {project.meta.currentPhase}
            </span>
          </div>
        </div>
      )}

      {/* Last Activity (Phase 10: TIME-003) */}
      {activity?.lastActivity && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="flex items-start gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-slate-600 truncate">
                {activity.lastActivity.description}
              </div>
              <div className="text-slate-400 mt-0.5">
                {getRelativeTime(activity.lastActivity.timestamp)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;

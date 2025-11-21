/**
 * Shared types between main and renderer processes
 */

export type ProjectStatus = 'active' | 'maintenance' | 'archive' | 'idea';

export interface Project {
  name: string;
  path: string;
  type: 'node' | 'python' | 'rust' | 'unknown';
  lastModified: number;
  status?: ProjectStatus;
  meta?: {
    techStack: string[];
    currentPhase?: string;
    isZombie?: boolean;
    projectStatus?: ProjectStatus;
  };
}

export interface Settings {
  editorCommand: string;
  terminalCommand?: string;
}

export interface QuickNote {
  id: string;
  timestamp: number;
  note: string;
  projectPath?: string;
  pinned: boolean;
}

export interface EnvVariable {
  key: string;
  value: string;
  isSecret: boolean;
  source: string; // e.g., '.env', '.env.local', etc.
}

export interface VirtualProject {
  id: string; // uuid
  name: string;
  description: string; // core idea/pitch

  // Structured context for AI collaboration
  problem: string; // what problem does this solve?
  solution: string; // how will it solve it?
  targetUsers: string; // who is this for?

  // Technical planning
  targetTechStack: string[]; // planned technologies
  estimatedSize: 'weekend' | 'week' | 'month' | 'epic' | 'unknown';

  // References & organization
  links: string[]; // URLs for inspiration/docs
  tags: string[]; // categories/keywords

  // Metadata
  createdAt: number;
  updatedAt: number;

  // Optional inspiration note
  inspiration?: string; // "Like X but with Y approach"
}

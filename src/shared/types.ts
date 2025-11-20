/**
 * Shared types between main and renderer processes
 */

export interface Project {
  name: string;
  path: string;
  type: 'node' | 'python' | 'rust' | 'unknown';
  lastModified: number;
  meta?: {
    techStack: string[];
    currentPhase?: string;
    isZombie?: boolean;
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

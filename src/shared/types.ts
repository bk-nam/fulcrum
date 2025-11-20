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

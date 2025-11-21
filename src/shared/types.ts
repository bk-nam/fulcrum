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

export type ProcessType = 'editor' | 'terminal';

export interface ProcessInfo {
  pid: number;
  projectPath: string;
  projectName: string;
  type: ProcessType;
  command: string;
  launchTime: number;
  port?: number; // Optional: for processes using specific ports
}

export interface ProcessQueryResult {
  success: boolean;
  processes?: ProcessInfo[];
  error?: string;
}

export interface ProcessKillResult {
  success: boolean;
  pid: number;
  error?: string;
}

/**
 * Phase 10: Time-Travel Context Types
 */

export type ActivityType = 'launch' | 'wbs-edit' | 'quick-note' | 'status-change';

export interface ActivityEvent {
  type: ActivityType;
  timestamp: number;
  description: string;
  metadata?: Record<string, any>;
}

export interface ProjectActivity {
  projectPath: string;
  projectName: string;
  lastActivity: ActivityEvent;
  recentActivities: ActivityEvent[]; // Last 10 activities
  // Git integration (TIME-001 - Phase 10-B)
  recentCommits?: GitCommit[];
  changedFiles?: string[];
  // AI enhancement (future)
  aiSummary?: string;
  nextActions?: string[];
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: number;
  filesChanged: number;
}

/**
 * Phase 10: TIME-002 - Git-Time Integration (Simplified)
 */

export interface WorkSession {
  id: string;
  projectPath: string;
  projectName: string;
  startTime: number;
  endTime: number | null; // null if session is still active
  duration: number; // in milliseconds (calculated when session ends)
}

export interface ProjectTimeStats {
  projectPath: string;
  projectName: string;
  totalTime: number; // total time in milliseconds
  sessionCount: number;
  lastSession: WorkSession | null;
  weeklyTime: number; // time spent this week in milliseconds
  dailyBreakdown: Record<string, number>; // date (YYYY-MM-DD) -> time in ms
}

export interface TimeTrackingSummary {
  totalProjects: number;
  totalTime: number; // all-time total in milliseconds
  weeklyTime: number; // this week's total in milliseconds
  todayTime: number; // today's total in milliseconds
  topProjects: Array<{
    projectName: string;
    projectPath: string;
    time: number;
  }>;
}

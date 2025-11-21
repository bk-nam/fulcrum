/**
 * Time Tracking Module (Phase 10: TIME-002 - Git-Time Integration Simplified)
 *
 * Features:
 * - Automatic session tracking (launch → close)
 * - Weekly/daily time statistics
 * - Project time comparison
 * - No Git notes - uses electron-store only
 */

import Store from 'electron-store';
import type { WorkSession, ProjectTimeStats, TimeTrackingSummary } from '../shared/types.js';

interface TimeTrackingStore {
  activeSessions?: Record<string, WorkSession>; // projectPath -> active session
  completedSessions?: WorkSession[]; // all historical sessions
  projectStats?: Record<string, ProjectTimeStats>; // projectPath -> stats
}

const timeStore = new Store<TimeTrackingStore>({
  name: 'fulcrum-time-tracking',
});

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get date string in YYYY-MM-DD format
 */
function getDateKey(timestamp: number = Date.now()): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

/**
 * Get start of week timestamp (Monday 00:00:00)
 */
function getStartOfWeek(timestamp: number = Date.now()): number {
  const date = new Date(timestamp);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

/**
 * Start a new work session for a project
 */
export function startSession(projectPath: string, projectName: string): WorkSession {
  const activeSessions = timeStore.get('activeSessions', {});

  // Check if there's already an active session for this project
  const existing = activeSessions[projectPath];
  if (existing && existing.endTime === null) {
    // Session already active, return it
    return existing;
  }

  // Create new session
  const session: WorkSession = {
    id: generateSessionId(),
    projectPath,
    projectName,
    startTime: Date.now(),
    endTime: null,
    duration: 0,
  };

  activeSessions[projectPath] = session;
  timeStore.set('activeSessions', activeSessions);

  return session;
}

/**
 * End an active work session
 */
export function endSession(projectPath: string): WorkSession | null {
  const activeSessions = timeStore.get('activeSessions', {});
  const session = activeSessions[projectPath];

  if (!session || session.endTime !== null) {
    return null; // No active session
  }

  // Calculate duration
  const endTime = Date.now();
  const duration = endTime - session.startTime;

  // Update session
  const completedSession: WorkSession = {
    ...session,
    endTime,
    duration,
  };

  // Save to completed sessions
  const completedSessions = timeStore.get('completedSessions', []);
  completedSessions.push(completedSession);
  timeStore.set('completedSessions', completedSessions);

  // Update project stats
  updateProjectStats(completedSession);

  // Remove from active sessions
  delete activeSessions[projectPath];
  timeStore.set('activeSessions', activeSessions);

  return completedSession;
}

/**
 * End all active sessions (called on app quit)
 */
export function endAllSessions(): WorkSession[] {
  const activeSessions = timeStore.get('activeSessions', {});
  const endedSessions: WorkSession[] = [];

  Object.keys(activeSessions).forEach((projectPath) => {
    const session = endSession(projectPath);
    if (session) {
      endedSessions.push(session);
    }
  });

  return endedSessions;
}

/**
 * Get active session for a project (if any)
 */
export function getActiveSession(projectPath: string): WorkSession | null {
  const activeSessions = timeStore.get('activeSessions', {});
  return activeSessions[projectPath] || null;
}

/**
 * Update project statistics after completing a session
 */
function updateProjectStats(session: WorkSession): void {
  const projectStats = timeStore.get('projectStats', {});
  const existing = projectStats[session.projectPath];

  const dateKey = getDateKey(session.startTime);
  const weekStart = getStartOfWeek();

  if (existing) {
    // Update existing stats
    existing.totalTime += session.duration;
    existing.sessionCount += 1;
    existing.lastSession = session;

    // Update daily breakdown
    existing.dailyBreakdown[dateKey] = (existing.dailyBreakdown[dateKey] || 0) + session.duration;

    // Recalculate weekly time
    existing.weeklyTime = Object.entries(existing.dailyBreakdown)
      .filter(([date]) => new Date(date).getTime() >= weekStart)
      .reduce((sum, [, time]) => sum + time, 0);

    projectStats[session.projectPath] = existing;
  } else {
    // Create new stats
    projectStats[session.projectPath] = {
      projectPath: session.projectPath,
      projectName: session.projectName,
      totalTime: session.duration,
      sessionCount: 1,
      lastSession: session,
      weeklyTime: session.duration,
      dailyBreakdown: {
        [dateKey]: session.duration,
      },
    };
  }

  timeStore.set('projectStats', projectStats);
}

/**
 * Get time statistics for a specific project
 */
export function getProjectTimeStats(projectPath: string): ProjectTimeStats | null {
  const projectStats = timeStore.get('projectStats', {});
  return projectStats[projectPath] || null;
}

/**
 * Get time tracking summary across all projects
 */
export function getTimeTrackingSummary(): TimeTrackingSummary {
  const projectStats = timeStore.get('projectStats', {});
  const allStats = Object.values(projectStats);

  const todayKey = getDateKey();

  const totalTime = allStats.reduce((sum, stat) => sum + stat.totalTime, 0);
  const weeklyTime = allStats.reduce((sum, stat) => sum + stat.weeklyTime, 0);
  const todayTime = allStats.reduce(
    (sum, stat) => sum + (stat.dailyBreakdown[todayKey] || 0),
    0
  );

  // Top 5 projects by total time
  const topProjects = allStats
    .sort((a, b) => b.totalTime - a.totalTime)
    .slice(0, 5)
    .map((stat) => ({
      projectName: stat.projectName,
      projectPath: stat.projectPath,
      time: stat.totalTime,
    }));

  return {
    totalProjects: allStats.length,
    totalTime,
    weeklyTime,
    todayTime,
    topProjects,
  };
}

/**
 * Get recent sessions (last N sessions)
 */
export function getRecentSessions(limit: number = 10): WorkSession[] {
  const completedSessions = timeStore.get('completedSessions', []);
  return completedSessions
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
    .slice(0, limit);
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Clean up old sessions (older than 90 days)
 */
export function cleanupOldSessions(): number {
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const completedSessions = timeStore.get('completedSessions', []);

  const filtered = completedSessions.filter(
    (session) => (session.endTime || Date.now()) > ninetyDaysAgo
  );

  const removed = completedSessions.length - filtered.length;
  timeStore.set('completedSessions', filtered);

  return removed;
}

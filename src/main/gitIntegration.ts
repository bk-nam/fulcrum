/**
 * Git Integration Module (Phase 10: TIME-001 - Auto-Context Capture)
 *
 * Features:
 * - Git commit analysis for "What did I do today?"
 * - File change detection since last session
 * - Time-based activity timeline
 */

import simpleGit from 'simple-git';
import type { SimpleGit, DefaultLogFields, ListLogLine } from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';
import type { GitCommit } from '../shared/types.js';

/**
 * Check if a directory is a Git repository
 */
export async function isGitRepository(projectPath: string): Promise<boolean> {
  try {
    const gitPath = path.join(projectPath, '.git');
    await fs.access(gitPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Git commits since a specific timestamp
 */
export async function getCommitsSince(
  projectPath: string,
  sinceTimestamp: number
): Promise<GitCommit[]> {
  try {
    if (!(await isGitRepository(projectPath))) {
      return [];
    }

    const git: SimpleGit = simpleGit(projectPath);
    const sinceDate = new Date(sinceTimestamp);

    // Get commits since the specified date
    const log = await git.log({
      '--since': sinceDate.toISOString(),
      '--no-merges': null, // Exclude merge commits
      '--numstat': null, // Include file change stats
    });

    const commits: GitCommit[] = log.all.map((commit: DefaultLogFields & ListLogLine) => ({
      hash: commit.hash.substring(0, 7), // Short hash
      message: commit.message,
      author: commit.author_name,
      timestamp: new Date(commit.date).getTime(),
      filesChanged: commit.diff?.files?.length || 0,
    }));

    return commits;
  } catch (error) {
    console.error(`Error getting commits for ${projectPath}:`, error);
    return [];
  }
}

/**
 * Get commits from today
 */
export async function getTodaysCommits(projectPath: string): Promise<GitCommit[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return getCommitsSince(projectPath, today.getTime());
}

/**
 * Get commits from the last N hours
 */
export async function getRecentCommits(
  projectPath: string,
  hours: number = 24
): Promise<GitCommit[]> {
  const sinceTimestamp = Date.now() - hours * 60 * 60 * 1000;
  return getCommitsSince(projectPath, sinceTimestamp);
}

/**
 * Get files changed since last commit
 */
export async function getChangedFiles(projectPath: string): Promise<string[]> {
  try {
    if (!(await isGitRepository(projectPath))) {
      return [];
    }

    const git: SimpleGit = simpleGit(projectPath);

    // Get both staged and unstaged changes
    const status = await git.status();

    const changedFiles: string[] = [
      ...status.modified,
      ...status.created,
      ...status.deleted,
      ...status.renamed.map((r) => r.to),
      ...status.staged,
    ];

    // Remove duplicates
    return [...new Set(changedFiles)];
  } catch (error) {
    console.error(`Error getting changed files for ${projectPath}:`, error);
    return [];
  }
}

/**
 * Get files changed since a specific timestamp
 */
export async function getChangedFilesSince(
  projectPath: string,
  sinceTimestamp: number
): Promise<string[]> {
  try {
    if (!(await isGitRepository(projectPath))) {
      return [];
    }

    const git: SimpleGit = simpleGit(projectPath);
    const sinceDate = new Date(sinceTimestamp);

    // Get diff stat between HEAD and commit at sinceDate
    const log = await git.log({
      '--since': sinceDate.toISOString(),
      '--name-only': null,
      '--pretty': 'format:',
    });

    // Extract unique file names from all commits
    const files = new Set<string>();
    log.all.forEach((commit: any) => {
      if (commit.diff?.files) {
        commit.diff.files.forEach((file: any) => {
          if (file.file) {
            files.add(file.file);
          }
        });
      }
    });

    // Also include uncommitted changes
    const uncommittedChanges = await getChangedFiles(projectPath);
    uncommittedChanges.forEach((file) => files.add(file));

    return Array.from(files);
  } catch (error) {
    console.error(`Error getting changed files since ${sinceTimestamp}:`, error);
    return [];
  }
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(projectPath: string): Promise<string | null> {
  try {
    if (!(await isGitRepository(projectPath))) {
      return null;
    }

    const git: SimpleGit = simpleGit(projectPath);
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  } catch (error) {
    console.error(`Error getting current branch for ${projectPath}:`, error);
    return null;
  }
}

/**
 * Get repository remote URL (GitHub, GitLab, etc.)
 */
export async function getRemoteUrl(projectPath: string): Promise<string | null> {
  try {
    if (!(await isGitRepository(projectPath))) {
      return null;
    }

    const git: SimpleGit = simpleGit(projectPath);
    const remotes = await git.getRemotes(true);

    // Get origin remote URL
    const origin = remotes.find((r) => r.name === 'origin');
    return origin?.refs?.fetch || null;
  } catch (error) {
    console.error(`Error getting remote URL for ${projectPath}:`, error);
    return null;
  }
}

/**
 * Generate activity summary from commits
 */
export function generateCommitSummary(commits: GitCommit[]): string {
  if (commits.length === 0) {
    return 'No recent commits';
  }

  if (commits.length === 1) {
    return `Latest: "${commits[0].message}"`;
  }

  // Group commits by message prefix (feat:, fix:, docs:, etc.)
  const grouped = commits.reduce((acc, commit) => {
    const match = commit.message.match(/^(\w+):/);
    const type = match ? match[1] : 'other';
    if (!acc[type]) acc[type] = 0;
    acc[type]++;
    return acc;
  }, {} as Record<string, number>);

  const summary = Object.entries(grouped)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');

  return `${commits.length} commits: ${summary}`;
}

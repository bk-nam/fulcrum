/**
 * Shared utility functions
 */

export type ProjectHealth = 'fresh' | 'stale' | 'zombie';

/**
 * Get relative time string from timestamp
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted relative time string (e.g., "2d ago", "3w ago", "2mo ago")
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // Format based on time elapsed
  if (diffYears > 0) {
    return `${diffYears}y ago`;
  } else if (diffMonths > 0) {
    return `${diffMonths}mo ago`;
  } else if (diffWeeks > 0) {
    return `${diffWeeks}w ago`;
  } else if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  } else {
    return 'just now';
  }
}

/**
 * Determine project health status based on last modified time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Project health status
 */
export function getProjectHealth(timestamp: number): ProjectHealth {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return 'fresh';
  } else if (diffDays < 30) {
    return 'stale';
  } else {
    return 'zombie';
  }
}

/**
 * Get Tailwind color classes based on project health
 * @param health - Project health status
 * @returns Object with dot and text color classes
 */
export function getHealthColor(health: ProjectHealth): { dot: string; text: string } {
  switch (health) {
    case 'fresh':
      return {
        dot: 'bg-green-500',
        text: 'text-green-700',
      };
    case 'stale':
      return {
        dot: 'bg-yellow-500',
        text: 'text-yellow-700',
      };
    case 'zombie':
      return {
        dot: 'bg-gray-400',
        text: 'text-gray-500',
      };
  }
}

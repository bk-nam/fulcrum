import { exec } from 'child_process';
import { promisify } from 'util';
import Store from 'electron-store';
import psList from 'ps-list';
import findProcess from 'find-process';
import type { ProcessInfo, ProcessType } from '../shared/types.js';

const execAsync = promisify(exec);

interface ProcessStore {
  processes: ProcessInfo[];
}

/**
 * ProcessRegistry manages tracked processes across app lifecycle
 * Uses electron-store for persistence across app restarts
 */
export class ProcessRegistry {
  private store: Store<ProcessStore>;
  private processes: Map<number, ProcessInfo>;

  constructor() {
    this.store = new Store<ProcessStore>({
      name: 'process-registry',
      defaults: {
        processes: [],
      },
    });

    // Load persisted processes on startup
    this.processes = new Map();
    const stored = this.store.get('processes', []);

    // Clean up dead processes from previous sessions
    this.cleanupDeadProcesses(stored);
  }

  /**
   * Remove processes that are no longer running
   */
  private async cleanupDeadProcesses(stored: ProcessInfo[]): Promise<void> {
    const alive = await Promise.all(
      stored.map(async (p) => ({
        process: p,
        isAlive: await this.isProcessAlive(p.pid),
      }))
    );

    alive.forEach(({ process, isAlive }) => {
      if (isAlive) {
        this.processes.set(process.pid, process);
      }
    });

    this.persist();
  }

  /**
   * Check if a PID is still running
   */
  async isProcessAlive(pid: number): Promise<boolean> {
    try {
      const processes = await psList();
      return processes.some((p) => p.pid === pid);
    } catch (error) {
      console.error('Error checking process:', error);
      return false;
    }
  }

  /**
   * Register a new process
   */
  register(info: ProcessInfo): void {
    this.processes.set(info.pid, info);
    this.persist();
    console.log(`[ProcessRegistry] Registered ${info.type} process:`, info.pid);
  }

  /**
   * Unregister a process (usually when it exits)
   */
  unregister(pid: number): void {
    if (this.processes.delete(pid)) {
      this.persist();
      console.log(`[ProcessRegistry] Unregistered process:`, pid);
    }
  }

  /**
   * Get all processes for a specific project
   */
  getByProject(projectPath: string): ProcessInfo[] {
    return Array.from(this.processes.values()).filter(
      (p) => p.projectPath === projectPath
    );
  }

  /**
   * Get all tracked processes
   */
  getAll(): ProcessInfo[] {
    return Array.from(this.processes.values());
  }

  /**
   * Get a specific process by PID
   */
  get(pid: number): ProcessInfo | undefined {
    return this.processes.get(pid);
  }

  /**
   * Persist current state to disk
   */
  private persist(): void {
    const processArray = Array.from(this.processes.values());
    this.store.set('processes', processArray);
  }

  /**
   * Clear all tracked processes
   */
  clear(): void {
    this.processes.clear();
    this.persist();
  }
}

/**
 * Kill a Docker container by searching for it
 * Uses the pseudo-PID to find the container by matching the hash
 */
async function killDockerContainer(pseudoPid: number): Promise<boolean> {
  try {
    // Get all running containers
    const { stdout: containersJson } = await execAsync('docker ps --format "{{json .}}" --no-trunc');
    if (!containersJson.trim()) {
      return false;
    }

    const containers = containersJson
      .trim()
      .split('\n')
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Find container with matching pseudo-PID
    for (const container of containers) {
      const containerPseudoPid = Math.abs(
        container.ID.split('').reduce((acc: number, char: string) => {
          return ((acc << 5) - acc) + char.charCodeAt(0);
        }, 0)
      );

      if (containerPseudoPid === pseudoPid) {
        // Found the container, stop it
        await execAsync(`docker stop ${container.ID}`);
        console.log(`[ProcessManager] Stopped Docker container ${container.ID}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`Error killing Docker container:`, error);
    return false;
  }
}

/**
 * Kill a process with graceful fallback
 * Tries SIGTERM first, then SIGKILL after timeout
 * Also handles Docker containers
 */
export async function killProcess(pid: number, force = false): Promise<boolean> {
  try {
    // First, try to kill as Docker container
    const dockerKilled = await killDockerContainer(pid);
    if (dockerKilled) {
      return true;
    }

    // Not a Docker container, try regular process kill
    if (force) {
      process.kill(pid, 'SIGKILL');
      return true;
    }

    // Try graceful shutdown
    process.kill(pid, 'SIGTERM');

    // Wait 3 seconds, then force kill if still alive
    setTimeout(async () => {
      const registry = new ProcessRegistry();
      const isAlive = await registry.isProcessAlive(pid);
      if (isAlive) {
        console.log(`[ProcessManager] Force killing PID ${pid}`);
        process.kill(pid, 'SIGKILL');
      }
    }, 3000);

    return true;
  } catch (error) {
    console.error(`Error killing process ${pid}:`, error);
    return false;
  }
}

/**
 * Find processes using a specific port
 */
export async function findProcessByPort(port: number): Promise<ProcessInfo[]> {
  try {
    const processes = await findProcess('port', port);
    return processes.map((p) => ({
      pid: p.pid,
      projectPath: p.cmd || '',
      projectName: p.name || 'unknown',
      type: 'terminal' as ProcessType, // Assume terminal for port-based detection
      command: p.cmd || '',
      launchTime: Date.now(),
      port,
    }));
  } catch (error) {
    console.error(`Error finding process on port ${port}:`, error);
    return [];
  }
}

/**
 * Platform-specific terminal PID detection
 * Attempts to find the PID of the terminal process for a project
 */
export async function findTerminalProcess(
  projectPath: string
): Promise<number | null> {
  try {
    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS: Use pgrep to find processes with matching cwd
      const { stdout } = await execAsync(
        `lsof -t -c bash -c zsh -c sh -a +D "${projectPath}" 2>/dev/null || true`
      );
      const pids = stdout
        .trim()
        .split('\n')
        .filter((p) => p)
        .map(Number);
      return pids[0] || null;
    } else if (platform === 'linux') {
      // Linux: Use ps with grep
      const { stdout } = await execAsync(
        `ps aux | grep "${projectPath}" | grep -v grep | awk '{print $2}' | head -1`
      );
      const pid = parseInt(stdout.trim(), 10);
      return isNaN(pid) ? null : pid;
    } else if (platform === 'win32') {
      // Windows: Use tasklist with filter
      const normalizedPath = projectPath.replace(/\//g, '\\');
      const { stdout } = await execAsync(
        `tasklist /FI "WINDOWTITLE eq *${normalizedPath}*" /FO CSV /NH`
      );
      const match = stdout.match(/^"[^"]+","(\d+)"/);
      return match ? parseInt(match[1], 10) : null;
    }

    return null;
  } catch (error) {
    console.error('Error finding terminal process:', error);
    return null;
  }
}

/**
 * Get detailed information about running processes
 * Useful for monitoring CPU/Memory usage
 */
export async function getProcessDetails(pid: number): Promise<any | null> {
  try {
    const processes = await psList();
    return processes.find((p) => p.pid === pid) || null;
  } catch (error) {
    console.error('Error getting process details:', error);
    return null;
  }
}

/**
 * Scan for Docker containers related to a project path
 * Checks volume mounts to match containers to projects
 */
export async function scanDockerContainers(
  projectPath: string,
  projectName: string
): Promise<ProcessInfo[]> {
  try {
    // Check if docker is available
    const { stdout: dockerVersion } = await execAsync('docker --version').catch(() => ({ stdout: '' }));
    if (!dockerVersion) {
      // Docker not installed or not running
      return [];
    }

    // Get running containers
    const { stdout: containersJson } = await execAsync('docker ps --format "{{json .}}" --no-trunc');
    if (!containersJson.trim()) {
      return [];
    }

    const containers = containersJson
      .trim()
      .split('\n')
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const dockerProcesses: ProcessInfo[] = [];

    for (const container of containers) {
      try {
        // Inspect container to get mount information
        const { stdout: inspectJson } = await execAsync(`docker inspect ${container.ID}`);
        const inspectData = JSON.parse(inspectJson)[0];

        // Check if any mount source matches project path
        const mounts = inspectData.Mounts || [];
        const hasProjectMount = mounts.some((mount: any) =>
          mount.Source && mount.Source.startsWith(projectPath)
        );

        if (hasProjectMount) {
          // Extract ports
          const ports = inspectData.NetworkSettings?.Ports || {};
          const portList: number[] = [];
          Object.keys(ports).forEach(key => {
            const bindings = ports[key];
            if (bindings && Array.isArray(bindings)) {
              bindings.forEach((binding: any) => {
                if (binding.HostPort) {
                  portList.push(parseInt(binding.HostPort, 10));
                }
              });
            }
          });

          // Use container ID as pseudo-PID (hash to number)
          const pseudoPid = Math.abs(
            container.ID.split('').reduce((acc: number, char: string) => {
              return ((acc << 5) - acc) + char.charCodeAt(0);
            }, 0)
          );

          dockerProcesses.push({
            pid: pseudoPid,
            projectPath,
            projectName,
            type: 'terminal',
            command: `docker: ${container.Names} (${container.Image})`,
            launchTime: Date.now(), // We don't track actual start time
            port: portList[0], // Use first port if available
          });
        }
      } catch (inspectError) {
        console.error(`Error inspecting container ${container.ID}:`, inspectError);
      }
    }

    return dockerProcesses;
  } catch (error) {
    console.error('Error scanning Docker containers:', error);
    return [];
  }
}

/**
 * Get port mappings for all running processes
 * Returns a map of PID -> array of ports
 */
async function getPortMappings(): Promise<Map<number, number[]>> {
  const portMap = new Map<number, number[]>();

  try {
    if (process.platform === 'win32') {
      // Windows: use netstat
      const { stdout } = await execAsync('netstat -ano | findstr LISTENING');
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        // Format: TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12345
        const match = line.match(/TCP\s+[^\s]+:(\d+)\s+[^\s]+\s+LISTENING\s+(\d+)/);
        if (match) {
          const port = parseInt(match[1], 10);
          const pid = parseInt(match[2], 10);

          if (!portMap.has(pid)) {
            portMap.set(pid, []);
          }
          portMap.get(pid)!.push(port);
        }
      }
    } else {
      // macOS/Linux: use lsof
      const { stdout } = await execAsync('lsof -iTCP -sTCP:LISTEN -n -P');
      const lines = stdout.trim().split('\n').slice(1); // Skip header

      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 9) {
          const pid = parseInt(parts[1], 10);
          // Name format: *:3000 or [::1]:3000 or 127.0.0.1:3000
          const portMatch = parts[8].match(/:(\d+)$/);

          if (portMatch && !isNaN(pid)) {
            const port = parseInt(portMatch[1], 10);
            if (!portMap.has(pid)) {
              portMap.set(pid, []);
            }
            portMap.get(pid)!.push(port);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error getting port mappings:', error);
  }

  return portMap;
}

/**
 * Get ports used by child processes of a given PID
 * Handles cases where wrapper processes (npm, next dev) spawn child servers
 */
async function getChildPorts(parentPid: number, portMappings: Map<number, number[]>): Promise<number[]> {
  try {
    const allProcesses = await psList();
    const children = allProcesses.filter(p => p.ppid === parentPid);

    const childPorts: number[] = [];
    for (const child of children) {
      // Check direct child ports
      const ports = portMappings.get(child.pid);
      if (ports && ports.length > 0) {
        childPorts.push(...ports);
      }

      // Recursively check grandchildren (for deeply nested processes)
      const grandchildPorts = await getChildPorts(child.pid, portMappings);
      if (grandchildPorts.length > 0) {
        childPorts.push(...grandchildPorts);
      }
    }

    return childPorts;
  } catch (error) {
    console.error('Error getting child ports:', error);
    return [];
  }
}

/**
 * Scan for processes related to a project path
 * Finds processes that have the project path in their command or working directory
 */
export async function scanProjectProcesses(
  projectPath: string,
  projectName: string
): Promise<ProcessInfo[]> {
  try {
    const allProcesses = await psList();
    const relatedProcesses: ProcessInfo[] = [];

    // Get port mappings for all processes (once)
    const portMappings = await getPortMappings();

    // Common development server patterns
    const devServerPatterns = [
      'node',
      'npm',
      'yarn',
      'pnpm',
      'next',
      'vite',
      'webpack',
      'react-scripts',
      'vue-cli-service',
      'ng serve',
    ];

    for (const proc of allProcesses) {
      // Skip if no command
      if (!proc.cmd) continue;

      // Check if command contains project path
      const hasProjectPath = proc.cmd.includes(projectPath);

      // Check if it's a dev server process
      const isDevServer = devServerPatterns.some((pattern) =>
        proc.name.toLowerCase().includes(pattern) ||
        (proc.cmd && proc.cmd.toLowerCase().includes(pattern))
      );

      if (hasProjectPath && isDevServer) {
        // Try to determine process type
        let type: ProcessType = 'terminal';

        // Editor detection: only check process name, not full command path
        // to avoid false positives (e.g., "atomic-notes" contains "atom")
        const editorPatterns = ['code', 'cursor', 'antigravity', 'subl', 'atom', 'vim', 'nvim', 'emacs'];
        if (editorPatterns.some(p => proc.name.toLowerCase().includes(p))) {
          type = 'editor';
        }

        // Extract port: Try command line first, then lsof lookup, then child processes
        let port: number | undefined;

        // 1. Try command line (for explicitly specified ports like Docker)
        if (proc.cmd) {
          const portMatch = proc.cmd.match(/:(\d{4,5})\b/);
          if (portMatch) {
            port = parseInt(portMatch[1], 10);
          }
        }

        // 2. If not found, lookup from port mapping (direct process)
        if (!port && portMappings.has(proc.pid)) {
          const ports = portMappings.get(proc.pid)!;
          port = ports[0];
        }

        // 3. If still not found, check child processes (for wrapper processes like npm/next)
        if (!port) {
          const childPorts = await getChildPorts(proc.pid, portMappings);
          if (childPorts.length > 0) {
            port = childPorts[0];
          }
        }

        relatedProcesses.push({
          pid: proc.pid,
          projectPath,
          projectName,
          type,
          command: proc.cmd && proc.cmd.length > 100 ? proc.cmd.substring(0, 100) + '...' : (proc.cmd || proc.name),
          launchTime: Date.now(), // We don't know actual start time, use current time
          port,
        });
      }
    }

    // Also scan for Docker containers
    const dockerProcesses = await scanDockerContainers(projectPath, projectName);

    return [...relatedProcesses, ...dockerProcesses];
  } catch (error) {
    console.error('Error scanning project processes:', error);
    return [];
  }
}

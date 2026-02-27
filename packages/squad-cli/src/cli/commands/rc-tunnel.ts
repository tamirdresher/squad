/**
 * Squad Remote Control — Devtunnel lifecycle management
 *
 * Creates, hosts, and cleans up devtunnels with squad labels
 * for discovery from the PWA dashboard.
 */

import { execSync, execFileSync, spawn, type ChildProcess } from 'node:child_process';
import os from 'node:os';

export interface TunnelInfo {
  tunnelId: string;
  url: string;
  port: number;
}

export interface TunnelLabels {
  repo: string;
  branch: string;
  machine: string;
}

let hostProcess: ChildProcess | null = null;
let currentTunnelId: string | null = null;

/** Check if devtunnel CLI is available */
export function isDevtunnelAvailable(): boolean {
  try {
    execFileSync('devtunnel', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Create a devtunnel with squad labels and host it */
export async function createTunnel(port: number, labels: TunnelLabels): Promise<TunnelInfo> {
  // Devtunnel labels only allow: letters, digits, underscore, hyphen, equals [a-zA-Z0-9_-=]
  const sanitize = (l: string) => {
    const clean = l.replace(/[^a-zA-Z0-9_\-=]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
    return clean || 'unknown';
  };
  const labelValues = ['squad', sanitize(labels.repo), sanitize(labels.branch), sanitize(labels.machine), `port-${port}`];
  const labelArgs = labelValues.flatMap((l) => ['--labels', l]);

  // Create tunnel with labels
  const createOutput = execFileSync(
    'devtunnel', ['create', ...labelArgs, '--expiration', '1d', '--json'],
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  const createResult = JSON.parse(createOutput);
  const tunnelId = createResult.tunnelId || createResult.tunnel?.tunnelId;
  // Strip cluster suffix for commands (e.g., "abc.euw" → "abc")
  const tunnelIdClean = tunnelId?.split('.')[0];

  if (!tunnelIdClean) {
    throw new Error('Failed to create devtunnel: no tunnelId returned');
  }
  currentTunnelId = tunnelIdClean;

  // Add port
  execFileSync(
    'devtunnel', ['port', 'create', tunnelIdClean, '-p', String(port), '--protocol', 'http'],
    { stdio: 'pipe' }
  );

  // Host in background
  hostProcess = spawn('devtunnel', ['host', tunnelIdClean], {
    stdio: 'pipe',
    detached: false,
  });

  // Wait for the URL to appear in stdout
  const url = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for devtunnel URL')), 15000);
    let output = '';

    hostProcess!.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
      const match = output.match(/https:\/\/[^\s]+/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[0]);
      }
    });

    hostProcess!.stderr?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    hostProcess!.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    hostProcess!.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        clearTimeout(timeout);
        reject(new Error(`devtunnel host exited with code ${code}`));
      }
    });
  });

  return { tunnelId: tunnelIdClean, url, port };
}

/** Clean up the tunnel */
export function destroyTunnel(): void {
  if (hostProcess) {
    hostProcess.kill();
    hostProcess = null;
  }

  if (currentTunnelId) {
    try {
      execFileSync('devtunnel', ['delete', currentTunnelId, '-y'], { stdio: 'pipe' });
    } catch {
      // Best effort cleanup
    }
    currentTunnelId = null;
  }
}

/** Get machine hostname for labels */
export function getMachineId(): string {
  return os.hostname();
}

/** Get repo name and branch from git */
export function getGitInfo(cwd: string): { repo: string; branch: string } {
  try {
    const remote = execSync('git remote get-url origin', { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const repo = remote.split('/').pop()?.replace('.git', '') || 'unknown';
    const branch = execSync('git branch --show-current', { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim() || 'unknown';
    return { repo, branch };
  } catch {
    return { repo: 'unknown', branch: 'unknown' };
  }
}

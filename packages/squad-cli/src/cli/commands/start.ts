/**
 * Squad Start — PTY Mirror Mode
 *
 * `squad start [--tunnel]`
 * Spawns copilot in a PTY (pseudo-terminal) — you see the EXACT same
 * TUI as running copilot directly. The raw terminal output is mirrored
 * to a remote PWA via WebSocket + devtunnel.
 *
 * Bidirectional: keyboard input from terminal AND phone both go to copilot.
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RemoteBridge } from '@bradygaster/squad-sdk';
import type { RemoteBridgeConfig } from '@bradygaster/squad-sdk';
import {
  isDevtunnelAvailable,
  createTunnel,
  destroyTunnel,
  getMachineId,
  getGitInfo,
} from './rc-tunnel.js';

const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

export interface StartOptions {
  tunnel: boolean;
  port: number;
}

export async function runStart(cwd: string, options: StartOptions): Promise<void> {
  const { repo, branch } = getGitInfo(cwd);
  const machine = getMachineId();
  const squadDir = fs.existsSync(path.join(cwd, '.squad'))
    ? path.join(cwd, '.squad')
    : fs.existsSync(path.join(cwd, '.ai-team'))
      ? path.join(cwd, '.ai-team')
      : '';

  // ─── Setup remote bridge FIRST (before PTY takes over terminal) ───
  let bridge: RemoteBridge | null = null;
  let tunnelUrl = '';

  const config: RemoteBridgeConfig = {
    port: options.port || 0,
    maxHistory: 500,
    repo, branch, machine, squadDir,
  };

  bridge = new RemoteBridge(config);

  // PWA static files
  bridge.setStaticHandler((req, res) => {
    const uiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../remote-ui');
    let filePath = path.join(uiDir, req.url === '/' ? 'index.html' : req.url || 'index.html');
    if (!filePath.startsWith(uiDir)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(filePath)) filePath = path.join(uiDir, 'index.html');
    const ext = path.extname(filePath);
    const mimes: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  const actualPort = await bridge.start();

  // Tunnel
  if (options.tunnel && isDevtunnelAvailable()) {
    try {
      const tunnel = await createTunnel(actualPort, { repo, branch, machine });
      tunnelUrl = tunnel.url;
      console.log(`${GREEN}✓${RESET} Remote: ${BOLD}${tunnelUrl}${RESET}`);
      try {
        // @ts-ignore
        const qrcode = (await import('qrcode-terminal')) as any;
        qrcode.default.generate(tunnelUrl, { small: true }, (code: string) => { console.log(code); });
      } catch {}
      console.log(`${DIM}Scan QR or open URL on phone. Starting copilot...${RESET}\n`);
    } catch (err) {
      console.log(`${YELLOW}⚠${RESET} Tunnel failed: ${(err as Error).message}`);
    }
  } else if (options.tunnel) {
    console.log(`${YELLOW}⚠${RESET} devtunnel not installed. Local mirror on port ${actualPort}.`);
  }

  // ─── Spawn copilot in PTY ─────────────────────────────────
  // Dynamic import node-pty (native module)
  const nodePty = await import('node-pty');

  const copilotExePath = path.join(
    'C:', 'ProgramData', 'global-npm', 'node_modules', '@github', 'copilot',
    'node_modules', '@github', 'copilot-win32-x64', 'copilot.exe'
  );
  const copilotCmd = fs.existsSync(copilotExePath) ? copilotExePath : 'copilot';

  const cols = process.stdout.columns || 120;
  const rows = process.stdout.rows || 30;

  const pty = nodePty.spawn(copilotCmd, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: process.env as Record<string, string>,
  });

  // Terminal output buffer for remote clients
  let outputBuffer = '';

  // PTY output → local terminal + remote
  pty.onData((data: string) => {
    // Write to local terminal (exact copilot output)
    process.stdout.write(data);

    // Buffer for remote clients
    outputBuffer += data;
    // Cap buffer at 100KB
    if (outputBuffer.length > 100000) {
      outputBuffer = outputBuffer.slice(-100000);
    }

    // Send to remote clients as raw terminal data
    bridge?.passthroughFromAgent(JSON.stringify({ type: 'pty', data }));
  });

  pty.onExit(({ exitCode }) => {
    console.log(`\n${DIM}Copilot exited (code ${exitCode}).${RESET}`);
    destroyTunnel();
    bridge?.stop();
    process.exit(exitCode);
  });

  // Local keyboard → PTY (raw mode for full terminal experience)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.on('data', (data: Buffer) => {
    pty.write(data.toString());
  });

  // Handle terminal resize
  process.stdout.on('resize', () => {
    pty.resize(process.stdout.columns || 120, process.stdout.rows || 30);
  });

  // Remote input → PTY (phone sends keystrokes + resize)
  bridge.setPassthrough((msg) => {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'pty_input') {
        pty.write(parsed.data);
      }
      if (parsed.type === 'pty_resize') {
        pty.resize(parsed.cols, parsed.rows);
      }
    } catch {
      // Raw text — treat as typed input + enter
      pty.write(msg + '\r');
    }
  });

  // When remote client connects, send the buffer (full terminal history)
  // This is handled by the bridge's acpEventLog replay

  // Cleanup
  process.on('SIGINT', () => {
    pty.kill();
    destroyTunnel();
    bridge?.stop();
    process.exit(0);
  });
}


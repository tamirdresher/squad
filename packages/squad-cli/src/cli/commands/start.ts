/**
 * Squad Start — Local CLI + Remote Mirror
 *
 * `squad start [--tunnel]`
 * Spawns copilot --acp with bidirectional I/O:
 * - Terminal: readline for local input, raw stdout display
 * - Remote: bridge mirrors all output, accepts input from phone
 *
 * All copilot features work: /plugin, /skills, /agent, etc.
 */

import path from 'node:path';
import fs from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
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
const CYAN = '\x1b[36m';
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

  console.log(`\n${BOLD}🎮 Squad Start${RESET} ${DIM}(local CLI + remote mirror)${RESET}\n`);
  console.log(`  ${DIM}Repo:${RESET}    ${repo}`);
  console.log(`  ${DIM}Branch:${RESET}  ${branch}`);
  console.log(`  ${DIM}Machine:${RESET} ${machine}\n`);

  // ─── Spawn copilot --acp ──────────────────────────────────
  const copilotExePath = path.join(
    'C:', 'ProgramData', 'global-npm', 'node_modules', '@github', 'copilot',
    'node_modules', '@github', 'copilot-win32-x64', 'copilot.exe'
  );
  const copilotCmd = fs.existsSync(copilotExePath) ? copilotExePath : 'copilot';

  console.log(`  ${DIM}Starting Copilot (loading MCP servers ~15-20s)...${RESET}`);

  const copilotProc = spawn(copilotCmd, ['--acp'], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let sessionId: string | null = null;
  let acpReady = false;
  let requestId = 0;
  const pendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  // ─── Copilot stdout → Terminal + Remote ───────────────────
  const rl = createInterface({ input: copilotProc.stdout!, terminal: false });

  rl.on('line', (line) => {
    if (!line.trim()) return;

    try {
      const msg = JSON.parse(line);

      // Handle responses to our requests
      if (msg.id !== undefined && pendingRequests.has(msg.id)) {
        const p = pendingRequests.get(msg.id)!;
        pendingRequests.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
        return;
      }

      // session/update → render in terminal
      if (msg.method === 'session/update' && msg.params) {
        const u = msg.params.update || msg.params;

        if (u.sessionUpdate === 'agent_message_chunk' && u.content?.text) {
          process.stdout.write(u.content.text);
        }

        if (u.sessionUpdate === 'tool_call') {
          const icons: Record<string, string> = { read: '📖', edit: '✏️', write: '✏️', shell: '▶️', search: '🔍' };
          const name = u.name || 'tool';
          const icon = Object.entries(icons).find(([k]) => name.includes(k))?.[1] || '⚙️';
          console.log(`\n  ${DIM}${icon} ${name}${RESET}`);
        }

        if (u.sessionUpdate === 'tool_call_update' && u.status) {
          const badge = u.status === 'completed' ? `${GREEN}✓${RESET}` : u.status === 'failed' || u.status === 'errored' ? `\x1b[31m✗${RESET}` : '';
          if (badge) process.stdout.write(`  ${badge}\n`);
        }
      }

      // Permission request → show in terminal
      if (msg.method === 'session/request_permission') {
        const tc = msg.params?.toolCall || {};
        console.log(`\n  ${YELLOW}🔐 Permission: ${tc.title || tc.kind || 'action'}${RESET}`);
        // Auto-approve for now (terminal mode)
        const response = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { outcome: 'approved' } });
        copilotProc.stdin!.write(response + '\n');
        console.log(`  ${GREEN}✓ Auto-approved${RESET}`);
      }
    } catch {
      // Not JSON — raw output, just print
      console.log(line);
    }

    // Mirror to remote clients
    bridge?.passthroughFromAgent(line);
  });

  copilotProc.stderr?.on('data', (d: Buffer) => {
    const text = d.toString().trim();
    if (text && !text.includes('[mcp server') && !text.includes('npm ')) {
      console.log(`  ${DIM}${text}${RESET}`);
    }
  });

  copilotProc.on('exit', (code) => {
    console.log(`\n${DIM}Copilot exited (code ${code}).${RESET}`);
    process.exit(0);
  });

  // ─── ACP helpers ──────────────────────────────────────────
  function sendACP<T>(method: string, params: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      pendingRequests.set(id, { resolve, reject });
      copilotProc.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error(`${method} timed out`));
        }
      }, 60000);
    });
  }

  // ─── Remote Bridge ────────────────────────────────────────
  let bridge: RemoteBridge | null = null;

  const config: RemoteBridgeConfig = {
    port: options.port || 0,
    maxHistory: 500,
    repo, branch, machine, squadDir,
  };

  bridge = new RemoteBridge(config);

  // PWA static files
  bridge.setStaticHandler((req, res) => {
    if (req.url === '/api/sessions' && req.method === 'GET') {
      // Handled by bridge internally now
    }
    const uiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../remote-ui');
    let filePath = path.join(uiDir, req.url === '/' ? 'index.html' : req.url || 'index.html');
    if (!filePath.startsWith(uiDir)) { res.writeHead(403); res.end('Forbidden'); return; }
    if (!fs.existsSync(filePath)) filePath = path.join(uiDir, 'index.html');
    const ext = path.extname(filePath);
    const mimes: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  // Remote messages → copilot stdin (bidirectional!)
  bridge.setPassthrough((msg) => {
    if (copilotProc.stdin?.writable) {
      // Intercept session/new to inject cwd
      try {
        const parsed = JSON.parse(msg);
        if (parsed.method === 'session/new' && parsed.params) {
          parsed.params.cwd = cwd;
          copilotProc.stdin.write(JSON.stringify(parsed) + '\n');
          return;
        }
      } catch {}
      copilotProc.stdin.write(msg.endsWith('\n') ? msg : msg + '\n');
    }
  });

  const actualPort = await bridge.start();
  console.log(`  ${GREEN}✓${RESET} Remote bridge on port ${actualPort}`);

  // ─── Tunnel ───────────────────────────────────────────────
  if (options.tunnel) {
    if (isDevtunnelAvailable()) {
      try {
        const tunnel = await createTunnel(actualPort, { repo, branch, machine });
        console.log(`  ${GREEN}✓${RESET} Tunnel: ${BOLD}${tunnel.url}${RESET}`);
        try {
          // @ts-ignore
          const qrcode = (await import('qrcode-terminal')) as any;
          qrcode.default.generate(tunnel.url, { small: true }, (code: string) => { console.log(code); });
        } catch {}
      } catch (err) {
        console.log(`  ${YELLOW}⚠${RESET} Tunnel failed: ${(err as Error).message}`);
      }
    } else {
      console.log(`  ${YELLOW}⚠${RESET} devtunnel not installed. Local only.`);
    }
  }

  // ─── Initialize ACP ───────────────────────────────────────
  // Wait for copilot to load MCP servers
  console.log(`  ${DIM}Waiting for Copilot to be ready...${RESET}`);

  async function tryInit(attempt: number): Promise<void> {
    try {
      await sendACP('initialize', {
        protocolVersion: 1,
        clientCapabilities: {},
        clientInfo: { name: 'squad-start', version: '1.0.0' },
      });

      const result = await sendACP<{ sessionId: string }>('session/new', {
        cwd,
        mcpServers: [],
      });
      sessionId = result.sessionId;
      acpReady = true;
      console.log(`\n  ${GREEN}✓ Session ready!${RESET}\n`);
    } catch {
      if (attempt < 5) {
        setTimeout(() => tryInit(attempt + 1), 5000);
      } else {
        console.log(`  ${YELLOW}⚠${RESET} Could not initialize ACP. Try typing anyway.`);
      }
    }
  }

  await new Promise(r => setTimeout(r, 15000)); // Wait for MCP servers
  await tryInit(1);

  // ─── Local readline ───────────────────────────────────────
  const input = createInterface({ input: process.stdin, output: process.stdout, prompt: `${GREEN}❯${RESET} ` });
  input.prompt();

  input.on('line', (line) => {
    const text = line.trim();
    if (!text) { input.prompt(); return; }

    if (!acpReady || !sessionId) {
      console.log(`  ${YELLOW}Session not ready yet...${RESET}`);
      input.prompt();
      return;
    }

    // Send as ACP prompt
    const id = ++requestId;
    const msg = JSON.stringify({
      jsonrpc: '2.0', id,
      method: 'session/prompt',
      params: { sessionId, prompt: [{ type: 'text', text }] },
    });
    copilotProc.stdin!.write(msg + '\n');

    // Also record for remote replay
    bridge?.passthroughFromAgent('__USER__' + msg);

    // When response completes, show prompt again
    pendingRequests.set(id, {
      resolve: () => { console.log(''); input.prompt(); },
      reject: (err) => { console.log(`\n  ${YELLOW}Error: ${err.message}${RESET}`); input.prompt(); },
    });
  });

  input.on('close', () => {
    copilotProc.kill();
    destroyTunnel();
    bridge?.stop();
    process.exit(0);
  });

  // Cleanup
  process.on('SIGINT', () => {
    copilotProc.kill();
    destroyTunnel();
    bridge?.stop();
    process.exit(0);
  });
}

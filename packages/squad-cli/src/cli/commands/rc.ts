/**
 * Squad Remote Control — CLI Command
 *
 * `squad rc` or `squad remote-control`
 * Starts the RemoteBridge, creates a devtunnel, shows QR code.
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
import { CopilotBridge } from './copilot-bridge.js';

const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';

export interface RCOptions {
  tunnel: boolean;
  port: number;
  path?: string;
}

export async function runRC(cwd: string, options: RCOptions): Promise<void> {
  const { repo, branch } = getGitInfo(cwd);
  const machine = getMachineId();

  // Resolve squad directory
  const squadDir = fs.existsSync(path.join(cwd, '.squad'))
    ? path.join(cwd, '.squad')
    : fs.existsSync(path.join(cwd, '.ai-team'))
      ? path.join(cwd, '.ai-team')
      : '';

  console.log(`\n${BOLD}🎮 Squad Remote Control${RESET}\n`);
  console.log(`  ${DIM}Repo:${RESET}    ${repo}`);
  console.log(`  ${DIM}Branch:${RESET}  ${branch}`);
  console.log(`  ${DIM}Machine:${RESET} ${machine}`);
  console.log(`  ${DIM}Squad:${RESET}   ${squadDir || 'not found'}\n`);

  // Load team roster if squad dir exists
  const agents: Array<{name: string; role: string}> = [];
  if (squadDir) {
    try {
      const teamMd = fs.readFileSync(path.join(squadDir, 'team.md'), 'utf-8');
      const memberLines = teamMd.split('\n').filter(l => l.startsWith('|') && l.includes('Active'));
      for (const line of memberLines) {
        const cols = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length >= 2 && cols[0] !== 'Name') {
          agents.push({ name: cols[0], role: cols[1] });
        }
      }
      console.log(`  ${GREEN}✓${RESET} Loaded ${agents.length} agents from team.md\n`);
    } catch {
      console.log(`  ${YELLOW}⚠${RESET} Could not read team.md\n`);
    }
  }

  // Check Copilot ACP compatibility
  console.log(`  ${DIM}Checking Copilot ACP compatibility...${RESET}`);
  const compat = await CopilotBridge.checkCompatibility();
  if (compat.compatible) {
    console.log(`  ${GREEN}✓${RESET} ${compat.message}`);
  } else {
    console.log(`  ${YELLOW}⚠${RESET} ${compat.message}`);
    console.log(`  ${DIM}Responses will be simulated until Copilot ACP is available.${RESET}`);
  }

  // Start Copilot ACP bridge
  let copilotReady = false;
  let responseBuffer = '';
  const copilot = new CopilotBridge({
    cwd,
    agent: squadDir ? 'squad' : undefined,
  });

  if (compat.compatible) {
    console.log(`  ${DIM}Starting Copilot ACP bridge...${RESET}`);

  try {
    // Wire Copilot notifications → RemoteBridge
    copilot.onMessage((line) => {
      try {
        const msg = JSON.parse(line);

        // session/update notifications contain streaming content
        if (msg.method === 'session/update' && msg.params) {
          const update = msg.params;

          if (update.sessionUpdate === 'agent_message_chunk' && update.content?.text) {
            responseBuffer += update.content.text;
            bridge.sendDelta('rc-session', 'Copilot', update.content.text);
          }

          if (update.sessionUpdate === 'tool_call') {
            bridge.sendToolCall('Copilot', update.name || 'unknown', update.input || {}, 'running');
          }

          if (update.sessionUpdate === 'tool_call_update') {
            const status = update.status === 'completed' ? 'completed' : update.status === 'errored' ? 'error' : 'running';
            bridge.sendToolCall('Copilot', update.name || 'unknown', {}, status as any);
          }
        }

        // session/prompt response = end of turn
        if (msg.result?.stopReason) {
          if (responseBuffer.trim()) {
            bridge.addMessage('agent', responseBuffer.trim(), 'Copilot');
          }
          responseBuffer = '';
          bridge.updateAgentStatus('Copilot', 'idle');
        }
      } catch {
        // Forward raw for debugging
      }
    });

    await copilot.start();
    copilotReady = true;
    console.log(`  ${GREEN}✓${RESET} Copilot ACP bridge connected\n`);
  } catch (err) {
    console.log(`  ${YELLOW}⚠${RESET} Copilot ACP failed: ${(err as Error).message}`);
    console.log(`  ${DIM}Falling back to simulated responses.${RESET}\n`);
  }
  } // end if (compat.compatible)

  // Create bridge config
  const config: RemoteBridgeConfig = {
    port: options.port || 0,
    maxHistory: 500,
    repo,
    branch,
    machine,
    squadDir,
    onPrompt: async (text) => {
      console.log(`  ${CYAN}←${RESET} ${DIM}Remote prompt:${RESET} ${text}`);
      bridge.addMessage('user', text);

      if (copilotReady && copilot.isRunning()) {
        bridge.updateAgentStatus('Copilot', 'streaming');
        responseBuffer = '';
        copilot.sendPrompt(text);
      } else {
        // Fallback: simulated response
        const agent = agents.length > 0 ? agents[0] : { name: 'Assistant', role: 'General' };
        bridge.addMessage('agent', `[Copilot not connected] Echo: ${text}`, agent.name);
      }
    },
    onDirectMessage: async (agentName, text) => {
      console.log(`  ${CYAN}←${RESET} ${DIM}Remote @${agentName}:${RESET} ${text}`);
      bridge.addMessage('user', `@${agentName} ${text}`);

      if (copilotReady && copilot.isRunning()) {
        bridge.updateAgentStatus('Copilot', 'streaming');
        responseBuffer = '';
        copilot.sendPrompt(`@${agentName} ${text}`);
      } else {
        bridge.addMessage('agent', `[Copilot not connected] Echo: @${agentName} ${text}`, agentName);
      }
    },
    onCommand: (name) => {
      console.log(`  ${CYAN}←${RESET} ${DIM}Remote /${name}${RESET}`);
      if (name === 'status') {
        const copilotStatus = copilotReady ? 'connected' : 'disconnected';
        bridge.addMessage('system', `Squad RC | Repo: ${repo} | Branch: ${branch} | Agents: ${agents.length} | Copilot: ${copilotStatus} | Connections: ${bridge.getConnectionCount()}`);
      } else if (name === 'agents') {
        const list = agents.map(a => `• ${a.name} (${a.role})`).join('\n');
        bridge.addMessage('system', `Team Roster:\n${list || 'No agents loaded'}`);
      } else {
        bridge.addMessage('system', `Unknown command: /${name}`);
      }
    },
  };

  // Start bridge
  const bridge = new RemoteBridge(config);

  // Serve PWA static files
  bridge.setStaticHandler((req, res) => {
    const uiDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../remote-ui'
    );

    let filePath = path.join(uiDir, req.url === '/' ? 'index.html' : req.url || 'index.html');

    // Security: prevent directory traversal
    if (!filePath.startsWith(uiDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath)) {
      // SPA fallback
      filePath = path.join(uiDir, 'index.html');
    }

    const ext = path.extname(filePath);
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  const actualPort = await bridge.start();
  const localUrl = `http://localhost:${actualPort}`;

  // Initialize agent roster in bridge
  const allAgents = copilotReady
    ? [{ name: 'Copilot', role: 'AI Assistant', status: 'idle' as const }, ...agents.map(a => ({ name: a.name, role: a.role, status: 'idle' as const }))]
    : agents.map(a => ({ name: a.name, role: a.role, status: 'idle' as const }));
  if (allAgents.length > 0) {
    bridge.updateAgents(allAgents);
  }

  console.log(`  ${GREEN}✓${RESET} Bridge running on port ${BOLD}${actualPort}${RESET}`);
  console.log(`  ${DIM}Local:${RESET}   ${localUrl}\n`);

  // Tunnel setup
  if (options.tunnel) {
    if (!isDevtunnelAvailable()) {
      console.log(`  ${YELLOW}⚠${RESET} devtunnel CLI not found. Install with:`);
      console.log(`    winget install Microsoft.devtunnel`);
      console.log(`    ${DIM}Then: devtunnel user login${RESET}\n`);
      console.log(`  ${DIM}Running in local-only mode.${RESET}\n`);
    } else {
      console.log(`  ${DIM}Creating tunnel...${RESET}`);
      try {
        const tunnel = await createTunnel(actualPort, { repo, branch, machine });
        console.log(`  ${GREEN}✓${RESET} Tunnel active: ${BOLD}${tunnel.url}${RESET}\n`);

        // Show QR code
        try {
          // @ts-ignore - no type declarations for qrcode-terminal
          const qrcode = (await import('qrcode-terminal')) as any;
          qrcode.default.generate(tunnel.url, { small: true }, (code: string) => {
            console.log(code);
          });
        } catch {
          // qrcode-terminal not available, skip
        }

        console.log(`  ${DIM}Scan QR code or open URL on your phone.${RESET}`);
        console.log(`  ${DIM}Auth: private — only your MS/GitHub account can connect.${RESET}\n`);
      } catch (err) {
        console.log(`  ${YELLOW}⚠${RESET} Tunnel failed: ${(err as Error).message}`);
        console.log(`  ${DIM}Running in local-only mode.${RESET}\n`);
      }
    }
  } else {
    console.log(`  ${DIM}No tunnel (local only). Use --tunnel for remote access.${RESET}\n`);
  }

  console.log(`  ${DIM}Press Ctrl+C to stop.${RESET}\n`);

  // Clean shutdown
  const cleanup = async () => {
    console.log(`\n  ${DIM}Shutting down...${RESET}`);
    copilot.stop();
    destroyTunnel();
    await bridge.stop();
    console.log(`  ${GREEN}✓${RESET} Stopped.\n`);
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Log connections
  const checkInterval = setInterval(() => {
    const count = bridge.getConnectionCount();
    if (count > 0) {
      process.stdout.write(`\r  ${GREEN}●${RESET} ${count} client(s) connected    `);
    }
  }, 5000);

  // Keep process alive
  await new Promise(() => {});
}

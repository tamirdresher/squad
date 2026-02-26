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
      // Add user message to history
      bridge.addMessage('user', text);

      // Route to an agent and stream response
      const agent = agents.length > 0 ? agents[0] : { name: 'Assistant', role: 'General' };
      bridge.updateAgentStatus(agent.name, 'streaming');

      // Simulate streaming response (Phase 2: replace with real Copilot SDK)
      const response = `I received your message: "${text}"\n\nI'm ${agent.name} (${agent.role}). The Squad RC bridge is working! In the full version, this response would come from the Copilot SDK through the Squad coordinator, routed to the appropriate agent based on your request.`;
      const words = response.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = (i > 0 ? ' ' : '') + words[i];
        bridge.sendDelta('rc-session', agent.name, chunk);
        await new Promise(r => setTimeout(r, 50));
      }

      bridge.addMessage('agent', response, agent.name);
      bridge.updateAgentStatus(agent.name, 'idle');
    },
    onDirectMessage: async (agentName, text) => {
      console.log(`  ${CYAN}←${RESET} ${DIM}Remote @${agentName}:${RESET} ${text}`);
      bridge.addMessage('user', `@${agentName} ${text}`);

      const agent = agents.find(a => a.name.toLowerCase() === agentName.toLowerCase());
      const name = agent?.name || agentName;
      const role = agent?.role || 'Agent';
      bridge.updateAgentStatus(name, 'streaming');

      const response = `Roger that! I'm ${name} (${role}). You asked: "${text}"\n\nIn the full version, this would be handled directly by my agent charter and Copilot SDK session.`;
      const words = response.split(' ');
      for (let i = 0; i < words.length; i++) {
        bridge.sendDelta('rc-session', name, (i > 0 ? ' ' : '') + words[i]);
        await new Promise(r => setTimeout(r, 50));
      }

      bridge.addMessage('agent', response, name);
      bridge.updateAgentStatus(name, 'idle');
    },
    onCommand: (name) => {
      console.log(`  ${CYAN}←${RESET} ${DIM}Remote /${name}${RESET}`);
      if (name === 'status') {
        bridge.addMessage('system', `Squad RC | Repo: ${repo} | Branch: ${branch} | Agents: ${agents.length} | Connections: ${bridge.getConnectionCount()}`);
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
  if (agents.length > 0) {
    bridge.updateAgents(agents.map(a => ({ name: a.name, role: a.role, status: 'idle' as const })));
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

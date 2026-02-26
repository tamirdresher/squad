/**
 * Squad Remote Control — RemoteBridge
 *
 * WebSocket server that bridges Squad's EventBus to remote PWA clients.
 * Maintains message history, broadcasts events, handles incoming commands.
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import {
  RC_PROTOCOL_VERSION,
  serializeEvent,
  parseCommand,
  type RCMessage,
  type RCServerEvent,
  type RCAgent,
  type RCClientCommand,
} from './protocol.js';
import type { RemoteBridgeConfig, RemoteConnection, ConnectionState } from './types.js';

export class RemoteBridge {
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private connections = new Map<string, { ws: WebSocket; info: RemoteConnection }>();
  private messages: RCMessage[] = [];
  private agents: RCAgent[] = [];
  private state: ConnectionState = 'stopped';
  private messageIdCounter = 0;
  private staticHandler?: (req: http.IncomingMessage, res: http.ServerResponse) => void;

  constructor(private config: RemoteBridgeConfig) {}

  /** Set a handler to serve static PWA files */
  setStaticHandler(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): void {
    this.staticHandler = handler;
  }

  /** Start the HTTP + WebSocket server */
  async start(): Promise<number> {
    if (this.state === 'running') return this.getPort();

    this.state = 'starting';

    this.server = http.createServer((req, res) => {
      if (this.staticHandler) {
        this.staticHandler(req, res);
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Squad Remote Control Bridge');
      }
    });

    this.wss = new WebSocketServer({ server: this.server });
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));

    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, () => {
        this.state = 'running';
        resolve(this.getPort());
      });
      this.server!.on('error', (err) => {
        this.state = 'error';
        reject(err);
      });
    });
  }

  /** Stop the server and clean up */
  async stop(): Promise<void> {
    this.state = 'stopped';

    for (const [, { ws }] of this.connections) {
      ws.close(1000, 'Bridge shutting down');
    }
    this.connections.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }
  }

  /** Get the actual port the server is listening on */
  getPort(): number {
    const addr = this.server?.address();
    if (addr && typeof addr === 'object') return addr.port;
    return this.config.port;
  }

  getState(): ConnectionState {
    return this.state;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getConnections(): RemoteConnection[] {
    return Array.from(this.connections.values()).map((c) => c.info);
  }

  // ─── Message History ───────────────────────────────────────

  /** Add a message to history and broadcast to clients */
  addMessage(role: 'user' | 'agent' | 'system', content: string, agentName?: string): RCMessage {
    const msg: RCMessage = {
      id: `msg-${++this.messageIdCounter}`,
      role,
      agentName,
      content,
      timestamp: new Date().toISOString(),
    };

    this.messages.push(msg);
    if (this.messages.length > this.config.maxHistory) {
      this.messages = this.messages.slice(-this.config.maxHistory);
    }

    this.broadcast({ type: 'complete', message: msg });
    return msg;
  }

  getMessageHistory(): RCMessage[] {
    return [...this.messages];
  }

  // ─── Streaming ─────────────────────────────────────────────

  /** Send a streaming delta to all clients */
  sendDelta(sessionId: string, agentName: string, content: string): void {
    this.broadcast({ type: 'delta', sessionId, agentName, content });
  }

  // ─── Agent Roster ──────────────────────────────────────────

  /** Update the agent roster and broadcast */
  updateAgents(agents: RCAgent[]): void {
    this.agents = agents;
    this.broadcast({ type: 'agents', agents });
  }

  /** Update a single agent's status */
  updateAgentStatus(name: string, status: RCAgent['status']): void {
    const agent = this.agents.find((a) => a.name === name);
    if (agent) {
      agent.status = status;
      this.broadcast({ type: 'agents', agents: this.agents });
    }
  }

  // ─── Tool Calls & Permissions ──────────────────────────────

  sendToolCall(agentName: string, tool: string, args: Record<string, unknown>, status: 'running' | 'completed' | 'error'): void {
    this.broadcast({ type: 'tool_call', agentName, tool, args, status });
  }

  sendPermissionRequest(id: string, agentName: string, tool: string, args: Record<string, unknown>, description: string): void {
    this.broadcast({ type: 'permission', id, agentName, tool, args, description });
  }

  // ─── Usage ─────────────────────────────────────────────────

  sendUsage(model: string, inputTokens: number, outputTokens: number, cost: number): void {
    this.broadcast({ type: 'usage', model, inputTokens, outputTokens, cost });
  }

  // ─── Error ─────────────────────────────────────────────────

  sendError(message: string, agentName?: string): void {
    this.broadcast({ type: 'error', message, agentName });
  }

  // ─── Passthrough (ACP dumb pipe) ────────────────────────────

  private passthroughWrite: ((msg: string) => void) | null = null;

  /** Set a passthrough pipe — raw WebSocket messages go to this writer,
   *  and call passthroughFromAgent() to send agent responses back */
  setPassthrough(writer: (msg: string) => void): void {
    this.passthroughWrite = writer;
  }

  /** Forward a raw message from the agent (copilot stdout) to all clients */
  passthroughFromAgent(line: string): void {
    for (const [, { ws }] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(line);
      }
    }
  }

  // ─── Internal ──────────────────────────────────────────────

  private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
    const connId = randomUUID();
    const info: RemoteConnection = {
      id: connId,
      connectedAt: new Date(),
      remoteAddress: req.socket.remoteAddress || 'unknown',
    };
    this.connections.set(connId, { ws, info });

    // Send initial state
    this.send(ws, {
      type: 'status',
      version: RC_PROTOCOL_VERSION,
      repo: this.config.repo,
      branch: this.config.branch,
      machine: this.config.machine,
      squadDir: this.config.squadDir,
      connectedAt: new Date().toISOString(),
    });
    this.send(ws, { type: 'history', messages: this.messages });
    this.send(ws, { type: 'agents', agents: this.agents });

    // Handle incoming messages
    ws.on('message', (data) => {
      const raw = data.toString();

      // If passthrough is set, forward raw JSON-RPC to copilot
      if (this.passthroughWrite) {
        this.passthroughWrite(raw);
        return;
      }

      // Otherwise use our protocol
      const cmd = parseCommand(raw);
      if (cmd) this.handleClientCommand(cmd);
    });

    ws.on('close', () => {
      this.connections.delete(connId);
    });

    ws.on('error', () => {
      this.connections.delete(connId);
    });
  }

  private handleClientCommand(cmd: RCClientCommand): void {
    switch (cmd.type) {
      case 'prompt':
        this.config.onPrompt?.(cmd.text);
        break;
      case 'direct':
        this.config.onDirectMessage?.(cmd.agentName, cmd.text);
        break;
      case 'command':
        this.config.onCommand?.(cmd.name, cmd.args);
        break;
      case 'permission_response':
        this.config.onPermissionResponse?.(cmd.id, cmd.approved);
        break;
      case 'ping':
        // Broadcast pong to all (sender will get it too)
        this.broadcast({ type: 'pong', timestamp: new Date().toISOString() });
        break;
    }
  }

  private broadcast(event: RCServerEvent): void {
    const data = serializeEvent(event);
    for (const [, { ws }] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  private send(ws: WebSocket, event: RCServerEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(serializeEvent(event));
    }
  }
}

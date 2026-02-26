/**
 * Squad Remote Control — Wire Protocol Types
 *
 * JSON-based protocol for WebSocket communication between
 * the RemoteBridge (server) and PWA clients.
 */

// ─── Protocol Version ────────────────────────────────────────
export const RC_PROTOCOL_VERSION = '1.0';

// ─── Server → Client Events ─────────────────────────────────

/** Session metadata sent on initial connection */
export interface RCStatusEvent {
  type: 'status';
  version: string;
  repo: string;
  branch: string;
  machine: string;
  squadDir: string;
  connectedAt: string;
}

/** Full conversation history sent on connection */
export interface RCHistoryEvent {
  type: 'history';
  messages: RCMessage[];
}

/** Streaming content delta from an agent */
export interface RCDeltaEvent {
  type: 'delta';
  sessionId: string;
  agentName: string;
  content: string;
}

/** Complete message (streaming finished) */
export interface RCCompleteEvent {
  type: 'complete';
  message: RCMessage;
}

/** Agent roster with live status */
export interface RCAgentsEvent {
  type: 'agents';
  agents: RCAgent[];
}

/** Tool call visibility */
export interface RCToolCallEvent {
  type: 'tool_call';
  agentName: string;
  tool: string;
  args: Record<string, unknown>;
  status: 'running' | 'completed' | 'error';
}

/** Permission request from an agent */
export interface RCPermissionEvent {
  type: 'permission';
  id: string;
  agentName: string;
  tool: string;
  args: Record<string, unknown>;
  description: string;
}

/** Token usage update */
export interface RCUsageEvent {
  type: 'usage';
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

/** Error notification */
export interface RCErrorEvent {
  type: 'error';
  message: string;
  agentName?: string;
}

/** Pong response */
export interface RCPongEvent {
  type: 'pong';
  timestamp: string;
}

export type RCServerEvent =
  | RCStatusEvent
  | RCHistoryEvent
  | RCDeltaEvent
  | RCCompleteEvent
  | RCAgentsEvent
  | RCToolCallEvent
  | RCPermissionEvent
  | RCUsageEvent
  | RCErrorEvent
  | RCPongEvent;

// ─── Client → Server Commands ────────────────────────────────

/** Natural language prompt (coordinator routes) */
export interface RCPromptCommand {
  type: 'prompt';
  text: string;
}

/** Direct message to a specific agent */
export interface RCDirectCommand {
  type: 'direct';
  agentName: string;
  text: string;
}

/** Slash command */
export interface RCSlashCommand {
  type: 'command';
  name: string;
  args?: string[];
}

/** Permission response (approve/deny) */
export interface RCPermissionResponse {
  type: 'permission_response';
  id: string;
  approved: boolean;
}

/** Keepalive ping */
export interface RCPingCommand {
  type: 'ping';
}

export type RCClientCommand =
  | RCPromptCommand
  | RCDirectCommand
  | RCSlashCommand
  | RCPermissionResponse
  | RCPingCommand;

// ─── Shared Types ────────────────────────────────────────────

/** Message in the conversation history */
export interface RCMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  agentName?: string;
  content: string;
  timestamp: string;
  toolCalls?: RCToolCallSummary[];
}

/** Summary of a tool call within a message */
export interface RCToolCallSummary {
  tool: string;
  args: Record<string, unknown>;
  status: 'running' | 'completed' | 'error';
  result?: string;
}

/** Agent info for roster display */
export interface RCAgent {
  name: string;
  role: string;
  status: 'idle' | 'working' | 'streaming' | 'error';
  charterPath?: string;
}

// ─── Serialization helpers ───────────────────────────────────

export function serializeEvent(event: RCServerEvent): string {
  return JSON.stringify(event);
}

export function parseCommand(data: string): RCClientCommand | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed.type === 'string') {
      return parsed as RCClientCommand;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Squad Remote Control — Bridge Configuration Types
 */

export interface RemoteBridgeConfig {
  /** Port for the WebSocket + HTTP server. 0 = random. */
  port: number;
  /** Max messages to keep in history buffer */
  maxHistory: number;
  /** Repo name for status display */
  repo: string;
  /** Branch name for status display */
  branch: string;
  /** Machine hostname for status display */
  machine: string;
  /** Path to .squad/ directory */
  squadDir: string;
  /** Callback when a remote user sends a prompt */
  onPrompt?: (text: string) => void | Promise<void>;
  /** Callback when a remote user sends a direct agent message */
  onDirectMessage?: (agentName: string, text: string) => void | Promise<void>;
  /** Callback when a remote user sends a slash command */
  onCommand?: (name: string, args?: string[]) => void | Promise<void>;
  /** Callback when a remote user responds to a permission request */
  onPermissionResponse?: (id: string, approved: boolean) => void | Promise<void>;
  /** Whether to enable replay buffer for late-joining clients (default: false) */
  enableReplay?: boolean;
}

export interface RemoteConnection {
  id: string;
  connectedAt: Date;
  remoteAddress: string;
}

export type ConnectionState = 'stopped' | 'starting' | 'running' | 'error';

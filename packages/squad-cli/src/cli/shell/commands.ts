import { SessionRegistry } from './sessions.js';
import { ShellRenderer } from './render.js';
import { getTerminalWidth } from './terminal.js';
import { BOLD, DIM, RESET } from '../core/output.js';
import { listSessions, loadSessionById, type SessionData } from './session-store.js';
import type { ShellMessage } from './types.js';

export interface CommandContext {
  registry: SessionRegistry;
  renderer: ShellRenderer;
  messageHistory: ShellMessage[];
  teamRoot: string;
  version?: string;
  /** Callback to restore a previous session's messages into the shell. */
  onRestoreSession?: (session: SessionData) => void;
}

export interface CommandResult {
  handled: boolean;
  exit?: boolean;
  output?: string;
  /** When true, the shell should clear its message history. */
  clear?: boolean;
}

/**
 * Execute a slash command.
 */
export function executeCommand(
  command: string,
  args: string[],
  context: CommandContext
): CommandResult {
  switch (command) {
    case 'status':
      return handleStatus(context);
    case 'history':
      return handleHistory(args, context);
    case 'clear':
      return handleClear();
    case 'help':
      return handleHelp(args);
    case 'quit':
    case 'exit':
      return { handled: true, exit: true };
    case 'agents':
      return handleAgents(context);
    case 'sessions':
      return handleSessions(context);
    case 'resume':
      return handleResume(args, context);
    case 'version':
      return { handled: true, output: context.version ?? 'unknown' };
    default:
      return { handled: false, output: `Hmm, /${command}? Type /help for commands.` };
  }
}

function handleStatus(context: CommandContext): CommandResult {
  const agents = context.registry.getAll();
  const active = context.registry.getActive();
  const lines = [
    `${BOLD}Squad Status${RESET}`,
    '-----------',
    `Team:     ${agents.length} agent${agents.length !== 1 ? 's' : ''} (${active.length} active)`,
    `Root:     ${DIM}${context.teamRoot}${RESET}`,
    `Messages: ${context.messageHistory.length} this session`,
  ];
  if (active.length > 0) {
    lines.push('', 'Working:');
    for (const a of active) {
      const tag = a.status === 'streaming' ? '[STREAM]' : '[WORK]';
      const hint = a.activityHint ? ` - ${a.activityHint}` : '';
      lines.push(`  ${tag} ${a.name} (${a.role})${hint}`);
    }
  }
  return { handled: true, output: lines.join('\n') };
}

function handleHistory(args: string[], context: CommandContext): CommandResult {
  const limit = args[0] ? parseInt(args[0], 10) : 10;
  const recent = context.messageHistory.slice(-limit);
  if (recent.length === 0) {
    return { handled: true, output: 'No messages yet.' };
  }
  const lines = recent.map(m => {
    const prefix = m.agentName ?? m.role;
    const time = m.timestamp.toLocaleTimeString();
    return `  [${time}] ${prefix}: ${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}`;
  });
  return { handled: true, output: `Last ${recent.length} message${recent.length !== 1 ? 's' : ''}:\n${lines.join('\n')}` };
}

function handleClear(): CommandResult {
  // Send ANSI escape code to actually clear the terminal screen
  process.stdout.write('\x1B[2J\x1B[H');
  return { handled: true, clear: true };
}

function handleHelp(args: string[]): CommandResult {
  const isFull = args[0] === 'full';
  const width = getTerminalWidth();

  if (isFull) {
    // Full help output
    if (width < 80) {
      // Single-column compact help for narrow terminals
      return {
        handled: true,
        output: [
          'Commands:',
          '/status — Check your team',
          '/history — Recent messages',
          '/agents — List team members',
          '/sessions — Past sessions',
          '/resume <id> — Restore session',
          '/clear — Clear screen',
          '/quit — Exit',
          '',
          'Talk to your squad:',
          '  Just type naturally — routes to the right agent.',
          '  @Agent message — Send directly to one agent.',
        ].join('\n'),
      };
    }
    return {
      handled: true,
      output: [
        'Commands:',
        "  /status    — Check your team & what's happening",
        '  /history   — See recent messages',
        '  /agents    — List all team members',
        '  /sessions  — List saved sessions',
        '  /resume    — Restore a past session',
        '  /clear     — Clear the screen',
        '  /quit      — Exit',
        '',
        'Talk to your squad:',
        '  Just type naturally — the coordinator routes it to the right agent.',
        '  @AgentName message  — Send directly to one agent.',
      ].join('\n'),
    };
  }

  // Default help — essentials only
  return {
    handled: true,
    output: [
      'How it works:',
      '  Just type what you need — Squad routes your message to the right agent.',
      '  @AgentName message — send directly to one agent.',
      '',
      'Commands:',
      "  /status — Check your team    /history — Recent messages",
      "  /agents — List team           /sessions — Past sessions",
      "  /quit — Exit                  /resume <id> — Restore",
      '',
      "Type /help full for complete docs.",
    ].join('\n'),
  };
}

function handleAgents(context: CommandContext): CommandResult {
  const agents = context.registry.getAll();
  if (agents.length === 0) {
    return { handled: true, output: 'No team members yet.' };
  }
  const lines = agents.map(a => {
    const icon = a.status === 'working' ? '[WORK]' : a.status === 'streaming' ? '[STREAM]' : a.status === 'error' ? '[ERR]' : '[IDLE]';
    return `  ${icon} ${a.name} (${a.role}) — ${a.status}`;
  });
  return { handled: true, output: `Team Members:\n${lines.join('\n')}` };
}

function handleSessions(context: CommandContext): CommandResult {
  const sessions = listSessions(context.teamRoot);
  if (sessions.length === 0) {
    return { handled: true, output: 'No saved sessions.' };
  }
  const lines = sessions.slice(0, 10).map((s, i) => {
    const date = new Date(s.lastActiveAt).toLocaleString();
    return `  ${i + 1}. ${s.id.slice(0, 8)}  ${date}  (${s.messageCount} messages)`;
  });
  return {
    handled: true,
    output: `${BOLD}Saved Sessions${RESET} (${sessions.length} total)\n${lines.join('\n')}\n\nUse ${DIM}/resume <id-prefix>${RESET} to restore a session.`,
  };
}

function handleResume(args: string[], context: CommandContext): CommandResult {
  if (!args[0]) {
    return { handled: true, output: 'Usage: /resume <session-id-prefix>' };
  }
  const prefix = args[0].toLowerCase();
  const sessions = listSessions(context.teamRoot);
  const match = sessions.find(s => s.id.toLowerCase().startsWith(prefix));
  if (!match) {
    return { handled: true, output: `No session found matching "${prefix}". Try /sessions to list.` };
  }
  const session = loadSessionById(context.teamRoot, match.id);
  if (!session) {
    return { handled: true, output: 'Failed to load session data.' };
  }
  if (context.onRestoreSession) {
    context.onRestoreSession(session);
    return { handled: true, output: `✓ Restored session ${match.id.slice(0, 8)} (${session.messages.length} messages)` };
  }
  return { handled: true, output: 'Session restore not available.' };
}

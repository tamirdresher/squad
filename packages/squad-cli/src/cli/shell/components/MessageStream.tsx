import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { getRoleEmoji } from '../lifecycle.js';
import { isNoColor, useTerminalWidth } from '../terminal.js';
import { Separator } from './Separator.js';
import { useMessageFade } from '../useAnimation.js';
import { ThinkingIndicator } from './ThinkingIndicator.js';
import type { ThinkingPhase } from './ThinkingIndicator.js';
import type { ShellMessage, AgentSession } from '../types.js';

/** Convert basic inline markdown to Ink <Text> elements. */
export function renderMarkdownInline(text: string): React.ReactNode {
  // Split on bold (**text**), italic (*text*), and code (`text`) patterns
  const parts: React.ReactNode[] = [];
  // Regex: bold first (greedy **), then code (`), then italic (single *)
  const re = /(\*\*(.+?)\*\*)|(`([^`]+?)`)|(\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      // Bold: **text**
      parts.push(<Text key={key++} bold>{match[2]}</Text>);
    } else if (match[3]) {
      // Code: `text`
      parts.push(<Text key={key++} color="yellow">{match[4]}</Text>);
    } else if (match[5]) {
      // Italic: *text*
      parts.push(<Text key={key++} color="gray">{match[6]}</Text>);
    }
    lastIndex = match.index + match[0].length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 0 ? text : parts;
}

interface MessageStreamProps {
  messages: ShellMessage[];
  agents?: AgentSession[];
  streamingContent?: Map<string, string>;
  processing?: boolean;
  activityHint?: string;
  agentActivities?: Map<string, string>;
  thinkingPhase?: ThinkingPhase;
  maxVisible?: number;
}

/** Format elapsed seconds for response timestamps. */
export function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Truncate table columns to fit within maxWidth. */
function truncateTableColumns(tableLines: string[], maxWidth: number): string[] {
  const parsed = tableLines.map(line => {
    const trimmed = line.trim();
    const inner = trimmed.slice(1, -1);
    return inner.split('|').map(c => c.trim());
  });
  const numCols = Math.max(...parsed.map(r => r.length));
  if (numCols === 0) return tableLines;

  const overhead = numCols + 1 + numCols * 2;
  const available = Math.max(maxWidth - overhead, numCols * 3);
  const colWidth = Math.max(3, Math.floor(available / numCols));

  return parsed.map(cells => {
    const truncated = cells.map(cell => {
      if (/^[-:]+$/.test(cell)) return '-'.repeat(colWidth);
      if (cell.length <= colWidth) return cell.padEnd(colWidth);
      return cell.slice(0, colWidth - 1) + '\u2026';
    });
    while (truncated.length < numCols) truncated.push(' '.repeat(colWidth));
    return '| ' + truncated.join(' | ') + ' |';
  });
}

/**
 * Reformat markdown tables that exceed maxWidth by truncating columns.
 * Table rows are detected as consecutive lines starting and ending with |.
 */
export function wrapTableContent(content: string, maxWidth: number): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trimStart().startsWith('|') && line.trimEnd().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i]!.trimStart().startsWith('|') && lines[i]!.trimEnd().endsWith('|')) {
        tableLines.push(lines[i]!);
        i++;
      }
      const maxLineLen = Math.max(...tableLines.map(l => l.length));
      if (maxLineLen <= maxWidth) {
        result.push(...tableLines);
      } else {
        result.push(...truncateTableColumns(tableLines, maxWidth));
      }
    } else {
      result.push(line);
      i++;
    }
  }
  return result.join('\n');
}

export const MessageStream: React.FC<MessageStreamProps> = ({
  messages,
  agents,
  streamingContent,
  processing = false,
  activityHint,
  agentActivities,
  thinkingPhase,
  maxVisible = 50,
}) => {
  const visible = messages.slice(-maxVisible);
  const roleMap = new Map((agents ?? []).map(a => [a.name, a.role]));

  // Message fade-in: new messages start dim for 200ms
  const fadingCount = useMessageFade(messages.length);

  // Elapsed time tracking for the ThinkingIndicator
  const [elapsedMs, setElapsedMs] = useState(0);
  const processingStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (processing) {
      processingStartRef.current = Date.now();
      setElapsedMs(0);
      const timer = setInterval(() => {
        setElapsedMs(Date.now() - processingStartRef.current);
      }, 200);
      return () => clearInterval(timer);
    } else {
      setElapsedMs(0);
    }
  }, [processing]);

  // Build activity hint: prefer explicit hint, then infer from agent @mention
  const resolvedHint = (() => {
    if (activityHint) return activityHint;
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) {
      const atMatch = lastUser.content.match(/^@(\w+)/);
      if (atMatch?.[1]) return `${atMatch[1]} is thinking...`;
    }
    return undefined;
  })();

  // Compute response duration: time from previous user message to this agent message
  const getResponseDuration = (index: number): string | null => {
    const msg = visible[index];
    if (!msg || msg.role !== 'agent') return null;
    // Walk backward to find the preceding user message
    for (let j = index - 1; j >= 0; j--) {
      if (visible[j]?.role === 'user') {
        return formatDuration(visible[j]!.timestamp, msg.timestamp);
      }
    }
    return null;
  };

  const noColor = isNoColor();
  const width = useTerminalWidth();
  const contentWidth = Math.min(width, 80);

  return (
    <Box flexDirection="column" marginTop={1} width={contentWidth}>
      {visible.map((msg, i) => {
        const isNewTurn = msg.role === 'user' && i > 0;
        const agentRole = msg.agentName ? roleMap.get(msg.agentName) : undefined;
        const emoji = agentRole ? getRoleEmoji(agentRole) : '';
        const duration = getResponseDuration(i);
        const isFading = fadingCount > 0 && i >= visible.length - fadingCount;

        return (
          <React.Fragment key={i}>
            {isNewTurn && <Separator marginTop={1} />}
            <Box gap={1}>
              {msg.role === 'user' ? (
                <>
                  <Text color={noColor ? undefined : 'cyan'} bold dimColor={isFading}>❯</Text>
                  <Text color={noColor ? undefined : 'cyan'} wrap="wrap" dimColor={isFading}>{msg.content}</Text>
                </>
              ) : msg.role === 'system' ? (
                <>
                  <Text color="gray" wrap="wrap">{msg.content}</Text>
                </>
              ) : (
                <>
                  <Text color={noColor ? undefined : 'green'} bold dimColor={isFading}>{emoji ? `${emoji} ` : ''}{(msg.agentName === 'coordinator' ? 'Squad' : msg.agentName) ?? 'agent'}:</Text>
                  <Text wrap="wrap" dimColor={isFading}>{renderMarkdownInline(wrapTableContent(msg.content, contentWidth))}</Text>
                  {duration && <Text color="gray">({duration})</Text>}
                </>
              )}
            </Box>
          </React.Fragment>
        );
      })}

      {/* Streaming content with live cursor */}
      {streamingContent && streamingContent.size > 0 && (
        <>
          {Array.from(streamingContent.entries()).map(([agentName, content]) => (
            content ? (
              <Box key={agentName} gap={1}>
                <Text color={noColor ? undefined : 'green'} bold>
                  {roleMap.has(agentName)
                    ? `${getRoleEmoji(roleMap.get(agentName)!)} `
                    : ''}
                  {agentName === 'coordinator' ? 'Squad' : agentName}:
                </Text>
                <Text wrap="wrap">{renderMarkdownInline(wrapTableContent(content, contentWidth))}</Text>
                <Text color={noColor ? undefined : 'cyan'}>▌</Text>
              </Box>
            ) : null
          ))}
        </>
      )}

      {/* Agent activity feed — real-time lines showing what agents are doing */}
      {agentActivities && agentActivities.size > 0 && (
        <Box flexDirection="column">
          {Array.from(agentActivities.entries()).map(([name, activity]) => (
            <Text key={name} color="gray">▸ {name} is {activity}</Text>
          ))}
        </Box>
      )}

      {/* Thinking indicator — shown when processing but no content yet */}
      {processing && (!streamingContent || streamingContent.size === 0) && (
        <ThinkingIndicator
          isThinking={true}
          elapsedMs={elapsedMs}
          activityHint={resolvedHint}
          phase={thinkingPhase}
        />
      )}

      {/* Streaming status — shows elapsed while content flows */}
      {processing && streamingContent && streamingContent.size > 0 && (
        <ThinkingIndicator
          isThinking={true}
          elapsedMs={elapsedMs}
          activityHint={`${Array.from(streamingContent.keys()).join(', ')} streaming`}
        />
      )}
    </Box>
  );
};

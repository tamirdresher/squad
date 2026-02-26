/**
 * Tests for Squad Remote Control
 * - RemoteBridge: WebSocket server, history, passthrough, sessions API
 * - Protocol: serialization, parsing
 * - PTY integration: resize, input forwarding
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import http from 'http';

// Import from built SDK
import {
  RemoteBridge,
  RC_PROTOCOL_VERSION,
  serializeEvent,
  parseCommand,
} from '@bradygaster/squad-sdk';

describe('Protocol', () => {
  it('serializes events to JSON', () => {
    const event = { type: 'status' as const, version: '1.0', repo: 'test', branch: 'main', machine: 'PC', squadDir: '.squad', connectedAt: '2026-01-01' };
    const json = serializeEvent(event);
    expect(JSON.parse(json)).toEqual(event);
  });

  it('parses valid commands', () => {
    const cmd = parseCommand('{"type":"prompt","text":"hello"}');
    expect(cmd).toEqual({ type: 'prompt', text: 'hello' });
  });

  it('parses direct commands', () => {
    const cmd = parseCommand('{"type":"direct","agentName":"Worf","text":"test"}');
    expect(cmd).toEqual({ type: 'direct', agentName: 'Worf', text: 'test' });
  });

  it('returns null for invalid JSON', () => {
    expect(parseCommand('not json')).toBeNull();
  });

  it('returns null for missing type', () => {
    expect(parseCommand('{"foo":"bar"}')).toBeNull();
  });
});

describe('RemoteBridge', () => {
  let bridge: RemoteBridge;
  const config = {
    port: 0,
    maxHistory: 100,
    repo: 'test-repo',
    branch: 'main',
    machine: 'TEST-PC',
    squadDir: '.squad',
  };

  beforeEach(async () => {
    bridge = new RemoteBridge(config);
  });

  afterEach(async () => {
    await bridge.stop();
  });

  it('starts and stops cleanly', async () => {
    const port = await bridge.start();
    expect(port).toBeGreaterThan(0);
    expect(bridge.getState()).toBe('running');
    await bridge.stop();
    expect(bridge.getState()).toBe('stopped');
  });

  it('accepts WebSocket connections', async () => {
    const port = await bridge.start();
    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => ws.on('open', resolve));
    expect(bridge.getConnectionCount()).toBe(1);
    ws.close();
    await new Promise(r => setTimeout(r, 100));
    expect(bridge.getConnectionCount()).toBe(0);
  });

  it('sends initial state on connect', async () => {
    const port = await bridge.start();
    const ws = new WebSocket(`ws://localhost:${port}`);
    const messages: any[] = [];
    ws.on('message', (data) => messages.push(JSON.parse(data.toString())));
    await new Promise<void>((resolve) => ws.on('open', resolve));
    await new Promise(r => setTimeout(r, 300));

    // Should receive _replay_done (passthrough mode) or status/history/agents
    expect(messages.length).toBeGreaterThan(0);
    ws.close();
  });

  it('broadcasts messages to all clients', async () => {
    const port = await bridge.start();
    const ws1 = new WebSocket(`ws://localhost:${port}`);
    const ws2 = new WebSocket(`ws://localhost:${port}`);
    await Promise.all([
      new Promise<void>(r => ws1.on('open', r)),
      new Promise<void>(r => ws2.on('open', r)),
    ]);

    const msgs1: any[] = [];
    const msgs2: any[] = [];
    ws1.on('message', d => msgs1.push(JSON.parse(d.toString())));
    ws2.on('message', d => msgs2.push(JSON.parse(d.toString())));
    await new Promise(r => setTimeout(r, 300));

    bridge.addMessage('agent', 'Hello!', 'Picard');
    await new Promise(r => setTimeout(r, 200));

    const complete1 = msgs1.find(m => m.type === 'complete');
    const complete2 = msgs2.find(m => m.type === 'complete');
    expect(complete1?.message?.content).toBe('Hello!');
    expect(complete2?.message?.content).toBe('Hello!');

    ws1.close();
    ws2.close();
  });

  it('maintains message history', async () => {
    await bridge.start();
    bridge.addMessage('user', 'msg1');
    bridge.addMessage('agent', 'msg2', 'Worf');
    bridge.addMessage('system', 'msg3');

    const history = bridge.getMessageHistory();
    expect(history).toHaveLength(3);
    expect(history[0].content).toBe('msg1');
    expect(history[1].agentName).toBe('Worf');
  });

  it('caps history at maxHistory', async () => {
    bridge = new RemoteBridge({ ...config, maxHistory: 3 });
    await bridge.start();
    for (let i = 0; i < 10; i++) {
      bridge.addMessage('user', `msg${i}`);
    }
    expect(bridge.getMessageHistory()).toHaveLength(3);
    expect(bridge.getMessageHistory()[0].content).toBe('msg7');
  });

  it('sends streaming deltas', async () => {
    const port = await bridge.start();
    const ws = new WebSocket(`ws://localhost:${port}`);
    const messages: any[] = [];
    ws.on('message', d => messages.push(JSON.parse(d.toString())));
    await new Promise<void>(r => ws.on('open', r));
    await new Promise(r => setTimeout(r, 200));

    bridge.sendDelta('sess-1', 'Picard', 'Hello ');
    bridge.sendDelta('sess-1', 'Picard', 'world!');
    await new Promise(r => setTimeout(r, 200));

    const deltas = messages.filter(m => m.type === 'delta');
    expect(deltas).toHaveLength(2);
    expect(deltas[0].content).toBe('Hello ');
    expect(deltas[1].content).toBe('world!');
    ws.close();
  });

  it('updates agent roster', async () => {
    const port = await bridge.start();
    const ws = new WebSocket(`ws://localhost:${port}`);
    const messages: any[] = [];
    ws.on('message', d => messages.push(JSON.parse(d.toString())));
    await new Promise<void>(r => ws.on('open', r));
    await new Promise(r => setTimeout(r, 200));

    bridge.updateAgents([
      { name: 'Picard', role: 'Lead', status: 'idle' },
      { name: 'Worf', role: 'QA', status: 'streaming' },
    ]);
    await new Promise(r => setTimeout(r, 200));

    const agentEvents = messages.filter(m => m.type === 'agents');
    const latest = agentEvents[agentEvents.length - 1];
    expect(latest.agents).toHaveLength(2);
    expect(latest.agents[1].name).toBe('Worf');
    ws.close();
  });

  it('handles passthrough mode', async () => {
    const port = await bridge.start();
    const received: string[] = [];

    bridge.setPassthrough((msg) => received.push(msg));

    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>(r => ws.on('open', r));
    await new Promise(r => setTimeout(r, 200));

    ws.send('{"type":"pty_input","data":"hello"}');
    await new Promise(r => setTimeout(r, 200));

    expect(received.length).toBeGreaterThan(0);
    const ptyMsg = received.find(r => r.includes('pty_input'));
    expect(ptyMsg).toBeDefined();
    ws.close();
  });

  it('records and replays ACP events', async () => {
    const port = await bridge.start();
    bridge.setPassthrough(() => {}); // Enable passthrough mode

    // Record some events
    bridge.passthroughFromAgent('{"type":"pty","data":"hello"}');
    bridge.passthroughFromAgent('{"type":"pty","data":"world"}');

    // New client should get replay
    const ws = new WebSocket(`ws://localhost:${port}`);
    const messages: any[] = [];
    ws.on('message', d => messages.push(JSON.parse(d.toString())));
    await new Promise<void>(r => ws.on('open', r));
    await new Promise(r => setTimeout(r, 500));

    const replays = messages.filter(m => m.type === '_replay');
    expect(replays.length).toBe(2);
    const done = messages.find(m => m.type === '_replay_done');
    expect(done).toBeDefined();
    ws.close();
  });

  it('handles ping/pong', async () => {
    const port = await bridge.start();
    const ws = new WebSocket(`ws://localhost:${port}`);
    const messages: any[] = [];
    ws.on('message', d => messages.push(JSON.parse(d.toString())));
    await new Promise<void>(r => ws.on('open', r));
    await new Promise(r => setTimeout(r, 200));

    ws.send(JSON.stringify({ type: 'ping' }));
    await new Promise(r => setTimeout(r, 200));

    const pong = messages.find(m => m.type === 'pong');
    expect(pong).toBeDefined();
    ws.close();
  });

  it('serves HTTP requests via static handler', async () => {
    bridge.setStaticHandler((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('test-content');
    });

    const port = await bridge.start();
    const response = await new Promise<{ status: number; body: string }>((resolve) => {
      http.get(`http://localhost:${port}/`, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve({ status: res.statusCode!, body }));
      });
    });

    expect(response.status).toBe(200);
    expect(response.body).toBe('test-content');
  });

  it('injects cwd into session/new in passthrough mode', async () => {
    const port = await bridge.start();
    const forwarded: string[] = [];
    bridge.setPassthrough((msg) => forwarded.push(msg));

    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>(r => ws.on('open', r));
    await new Promise(r => setTimeout(r, 200));

    ws.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'session/new', params: { cwd: '.', mcpServers: [] } }));
    await new Promise(r => setTimeout(r, 200));

    const sessionNew = forwarded.find(f => f.includes('session/new'));
    expect(sessionNew).toBeDefined();
    // cwd should have been replaced (not ".")
    const parsed = JSON.parse(sessionNew!);
    expect(parsed.params.cwd).not.toBe('.');
    ws.close();
  });
});

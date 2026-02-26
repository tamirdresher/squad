/**
 * Squad Remote Control — PWA Client (ACP Protocol)
 * Drives the ACP lifecycle: initialize → session/new → session/prompt
 * Bridge relays raw JSON-RPC to/from copilot --acp --stdio
 */

(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────
  let ws = null;
  let connected = false;
  let sessionId = null;
  let requestId = 0;
  let pendingRequests = {};
  let acpReady = false;

  // ─── DOM refs ────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const messagesEl = $('#messages');
  const inputEl = $('#input');
  const formEl = $('#input-form');
  const statusBadge = $('#status-badge');
  const statusText = $('#status-text');
  const sessionInfo = $('#session-info');
  const agentSidebar = $('#agent-sidebar');
  const agentList = $('#agent-list');

  // ─── ACP JSON-RPC Helpers ────────────────────────────────
  function sendRequest(method, params, timeoutMs) {
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      pendingRequests[id] = { resolve, reject };
      const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params });
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
      // Timeout — longer for initialize
      const timeout = timeoutMs !== undefined ? timeoutMs : (method === 'initialize' ? 60000 : 120000);
      if (timeout > 0) {
        setTimeout(() => {
          if (pendingRequests[id]) {
            delete pendingRequests[id];
            reject(new Error(`Request ${method} timed out`));
          }
        }, timeout);
      }
    });
  }

  function sendNotification(method, params) {
    const msg = JSON.stringify({ jsonrpc: '2.0', method, params });
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }

  // ─── ACP Session Lifecycle ───────────────────────────────
  async function initializeACP(attempt) {
    attempt = attempt || 1;
    const maxAttempts = 5;
    setStatus('connecting', attempt === 1 ? 'Waiting for Copilot...' : `Retry ${attempt}/${maxAttempts}...`);
    if (attempt === 1) addSystemMessage('⏳ Waiting for Copilot to load MCP servers (~15-20s)...');

    try {
      const result = await sendRequest('initialize', {
        protocolVersion: 1,
        clientCapabilities: {},
        clientInfo: { name: 'squad-rc', title: 'Squad Remote Control', version: '1.0.0' },
      });

      addSystemMessage('✅ Connected to Copilot ' + (result.agentInfo?.version || '') + '. Creating session...');

      const sessionResult = await sendRequest('session/new', {
        cwd: '.',
        mcpServers: [],
      });

      sessionId = sessionResult.sessionId;
      acpReady = true;
      setStatus('online', 'Ready');
      addSystemMessage('🚀 Session ready! Type a message to chat with Copilot.');
    } catch (err) {
      if (attempt < maxAttempts) {
        const delay = 5000;
        addSystemMessage(`⏳ Copilot not ready yet, retrying in ${delay/1000}s... (${attempt}/${maxAttempts})`);
        setTimeout(() => initializeACP(attempt + 1), delay);
      } else {
        setStatus('offline', 'Failed');
        addSystemMessage('❌ Could not connect to Copilot after ' + maxAttempts + ' attempts: ' + err.message);
        acpReady = false;
      }
    }
  }

  // ─── WebSocket Connection ────────────────────────────────
  let reconnectAttempts = 0;

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}`;

    setStatus('connecting', 'Connecting...');

    try {
      ws = new WebSocket(url);
    } catch (err) {
      setStatus('offline', 'WS Error');
      addSystemMessage('WebSocket error: ' + (err.message || err));
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      connected = true;
      reconnectAttempts = 0;
      // Start ACP handshake after short delay for bridge to be ready
      setTimeout(() => initializeACP(1), 1000);
    };

    ws.onclose = () => {
      connected = false;
      acpReady = false;
      sessionId = null;
      setStatus('offline', 'Disconnected');
      scheduleReconnect();
    };

    ws.onerror = () => {
      connected = false;
      setStatus('offline', 'Error');
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handleACPMessage(msg);
      } catch { /* ignore malformed */ }
    };
  }

  // ─── ACP Message Handler ─────────────────────────────────
  function handleACPMessage(msg) {
    // Response to a request we sent (has id + result/error)
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const pending = pendingRequests[msg.id];
      if (pending) {
        delete pendingRequests[msg.id];
        if (msg.error) {
          pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          pending.resolve(msg.result);
        }
      }
      // Check for prompt completion (stopReason in result)
      if (msg.result && msg.result.stopReason) {
        flushStreaming();
      }
      return;
    }

    // Notification from agent (session/update)
    if (msg.method === 'session/update' && msg.params) {
      handleSessionUpdate(msg.params.update || msg.params);
      return;
    }

    // Permission request from agent
    if (msg.method === 'session/request_permission' && msg.id !== undefined) {
      handlePermissionRequest(msg);
      return;
    }
  }

  // ─── Session Updates (streaming) ─────────────────────────
  let streamingContent = '';
  let streamingEl = null;

  function handleSessionUpdate(update) {
    if (!update) return;

    const type = update.sessionUpdate;

    if (type === 'agent_message_chunk' && update.content) {
      const text = update.content.text || '';
      streamingContent += text;

      if (!streamingEl) {
        streamingEl = document.createElement('div');
        streamingEl.className = 'msg agent';
        streamingEl.innerHTML = `
          <div class="msg-header">
            <span class="msg-agent">Copilot</span>
            <span class="msg-time">now</span>
          </div>
          <div class="msg-content"></div>
          <span class="streaming-indicator"></span>
        `;
        messagesEl.appendChild(streamingEl);
      }
      const contentEl = streamingEl.querySelector('.msg-content');
      if (contentEl) contentEl.textContent = streamingContent;
      scrollToBottom();
    }

    if (type === 'tool_call') {
      const el = document.createElement('div');
      el.className = 'tool-call running';
      el.textContent = `🔧 ${update.name || 'tool'}(${JSON.stringify(update.input || {}).slice(0, 80)})`;
      messagesEl.appendChild(el);
      scrollToBottom();
    }

    if (type === 'tool_call_update') {
      // Could update existing tool call status
    }
  }

  function flushStreaming() {
    if (streamingContent && streamingEl) {
      // Remove streaming indicator
      const indicator = streamingEl.querySelector('.streaming-indicator');
      if (indicator) indicator.remove();
      // Update timestamp
      const timeEl = streamingEl.querySelector('.msg-time');
      if (timeEl) timeEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      // Format content
      const contentEl = streamingEl.querySelector('.msg-content');
      if (contentEl) contentEl.innerHTML = formatContent(streamingContent);
    }
    streamingContent = '';
    streamingEl = null;
  }

  // ─── Permission Handling ─────────────────────────────────
  function handlePermissionRequest(msg) {
    const params = msg.params || {};
    const dialog = document.createElement('div');
    dialog.className = 'permission-dialog';
    dialog.id = `perm-${msg.id}`;
    dialog.innerHTML = `
      <h3>🔐 Permission Request</h3>
      <p><strong>${escapeHtml(params.tool || 'Tool')}</strong>: ${escapeHtml(params.description || JSON.stringify(params))}</p>
      <div class="permission-actions">
        <button class="btn-deny" onclick="respondPermission(${msg.id}, false)">Deny</button>
        <button class="btn-approve" onclick="respondPermission(${msg.id}, true)">Approve</button>
      </div>
    `;
    document.body.appendChild(dialog);
  }

  window.respondPermission = (id, approved) => {
    // Send JSON-RPC response to the permission request
    const response = JSON.stringify({
      jsonrpc: '2.0',
      id: id,
      result: { outcome: approved ? 'approved' : 'denied' },
    });
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(response);
    }
    const el = $(`#perm-${id}`);
    if (el) el.remove();
  };

  // ─── Send Prompt ─────────────────────────────────────────
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text || !acpReady || !sessionId) return;

    // Show user message
    renderMessage({ role: 'user', content: text });
    inputEl.value = '';
    inputEl.focus();
    scrollToBottom();

    // Reset streaming state
    streamingContent = '';
    streamingEl = null;

    // Send ACP prompt
    try {
      await sendRequest('session/prompt', {
        sessionId: sessionId,
        prompt: [{ type: 'text', text }],
      }, 0);
      // Response arrives via session/update notifications + final result
    } catch (err) {
      flushStreaming();
      addSystemMessage('❌ ' + err.message);
    }
  });

  // ─── Agent Sidebar ───────────────────────────────────────
  $('#btn-agents').addEventListener('click', () => {
    agentSidebar.classList.toggle('visible');
    agentSidebar.classList.toggle('hidden');
  });
  $('#btn-close-sidebar').addEventListener('click', () => {
    agentSidebar.classList.remove('visible');
    agentSidebar.classList.add('hidden');
  });

  // ─── Render Functions ────────────────────────────────────
  function renderMessage(msg) {
    const el = document.createElement('div');
    el.className = `msg ${msg.role}`;

    if (msg.role === 'system') {
      el.innerHTML = `<div class="msg-content">${escapeHtml(msg.content)}</div>`;
    } else {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const name = msg.role === 'user' ? 'You' : (msg.agentName || 'Copilot');
      el.innerHTML = `
        <div class="msg-header">
          <span class="msg-agent">${escapeHtml(name)}</span>
          <span class="msg-time">${time}</span>
        </div>
        <div class="msg-content">${formatContent(msg.content)}</div>
      `;
    }
    messagesEl.appendChild(el);
  }

  // ─── Helpers ─────────────────────────────────────────────
  function setStatus(state, text) {
    statusBadge.className = `badge ${state}`;
    statusText.textContent = text;
  }

  function scheduleReconnect() {
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    setTimeout(connect, delay);
  }

  function addSystemMessage(text) {
    renderMessage({ role: 'system', content: text });
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function formatContent(text) {
    return escapeHtml(text)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  // ─── Keepalive ───────────────────────────────────────────
  setInterval(() => {
    if (connected) {
      // JSON-RPC ping (no-op notification)
    }
  }, 30000);

  // ─── Start ───────────────────────────────────────────────
  connect();
})();

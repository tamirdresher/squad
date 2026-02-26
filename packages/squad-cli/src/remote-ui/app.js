/**
 * Squad Remote Control — PWA Client
 */

(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────
  let ws = null;
  let connected = false;
  let agents = [];
  let streamingBuffers = {};
  let pendingPermissions = {};

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

  // ─── WebSocket Connection ────────────────────────────────
  let reconnectAttempts = 0;

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}`;

    setStatus('connecting', 'Connecting...');
    addSystemMessage('Connecting to Squad bridge...');

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
      setStatus('online', 'Connected');
    };

    ws.onclose = () => {
      connected = false;
      setStatus('offline', 'Disconnected');
      scheduleReconnect();
    };

    ws.onerror = () => {
      connected = false;
      setStatus('offline', 'Error');
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        handleEvent(event);
      } catch { /* ignore malformed */ }
    };
  }

  // ─── Event Handlers ──────────────────────────────────────
  function handleEvent(event) {
    switch (event.type) {
      case 'status':
        showSessionInfo(event);
        break;

      case 'history':
        messagesEl.innerHTML = '';
        (event.messages || []).forEach((msg) => renderMessage(msg));
        scrollToBottom();
        break;

      case 'delta':
        handleDelta(event);
        break;

      case 'complete':
        clearStreaming(event.message.agentName);
        renderMessage(event.message);
        scrollToBottom();
        break;

      case 'agents':
        agents = event.agents || [];
        renderAgents();
        break;

      case 'tool_call':
        renderToolCall(event);
        break;

      case 'permission':
        showPermissionDialog(event);
        break;

      case 'usage':
        // Could show in a metrics panel
        break;

      case 'error':
        renderMessage({
          id: 'err-' + Date.now(),
          role: 'system',
          content: `❌ ${event.agentName ? event.agentName + ': ' : ''}${event.message}`,
          timestamp: new Date().toISOString(),
        });
        scrollToBottom();
        break;

      case 'pong':
        break;
    }
  }

  // ─── Streaming ───────────────────────────────────────────
  function handleDelta(event) {
    const key = event.agentName || event.sessionId;
    if (!streamingBuffers[key]) {
      streamingBuffers[key] = '';
      // Create streaming message element
      const el = document.createElement('div');
      el.className = 'msg agent';
      el.id = `streaming-${key}`;
      el.innerHTML = `
        <div class="msg-header">
          <span class="msg-agent">${escapeHtml(event.agentName || 'Agent')}</span>
          <span class="msg-time">now</span>
        </div>
        <div class="msg-content"></div>
        <span class="streaming-indicator"></span>
      `;
      messagesEl.appendChild(el);
    }

    streamingBuffers[key] += event.content;
    const el = $(`#streaming-${key} .msg-content`);
    if (el) el.textContent = streamingBuffers[key];
    scrollToBottom();
  }

  function clearStreaming(agentName) {
    const key = agentName || '';
    delete streamingBuffers[key];
    const el = $(`#streaming-${key}`);
    if (el) el.remove();
  }

  // ─── Render Functions ────────────────────────────────────
  function renderMessage(msg) {
    const el = document.createElement('div');
    el.className = `msg ${msg.role}`;

    if (msg.role === 'system') {
      el.innerHTML = `<div class="msg-content">${escapeHtml(msg.content)}</div>`;
    } else {
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const header = msg.role === 'agent'
        ? `<span class="msg-agent">${escapeHtml(msg.agentName || 'Agent')}</span>`
        : `<span class="msg-agent">You</span>`;

      el.innerHTML = `
        <div class="msg-header">
          ${header}
          <span class="msg-time">${time}</span>
        </div>
        <div class="msg-content">${formatContent(msg.content)}</div>
      `;
    }

    messagesEl.appendChild(el);
  }

  function renderAgents() {
    agentList.innerHTML = agents.map((a) => `
      <li data-agent="${escapeHtml(a.name)}" onclick="insertAgent('${escapeHtml(a.name)}')">
        <span class="agent-status ${a.status}"></span>
        <div>
          <div class="agent-name">${escapeHtml(a.name)}</div>
          <div class="agent-role">${escapeHtml(a.role || '')}</div>
        </div>
      </li>
    `).join('');
  }

  function renderToolCall(event) {
    const el = document.createElement('div');
    el.className = `tool-call ${event.status}`;
    el.textContent = `🔧 ${event.agentName}: ${event.tool}(${JSON.stringify(event.args).slice(0, 80)})`;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function showSessionInfo(info) {
    sessionInfo.classList.remove('hidden');
    $('#info-repo').textContent = `📦 ${info.repo}`;
    $('#info-branch').textContent = `🌿 ${info.branch}`;
    $('#info-machine').textContent = `💻 ${info.machine}`;
  }

  // ─── Permission Dialog ───────────────────────────────────
  function showPermissionDialog(event) {
    pendingPermissions[event.id] = event;
    const dialog = document.createElement('div');
    dialog.className = 'permission-dialog';
    dialog.id = `perm-${event.id}`;
    dialog.innerHTML = `
      <h3>🔐 Permission Request</h3>
      <p><strong>${escapeHtml(event.agentName)}</strong> wants to: ${escapeHtml(event.description)}</p>
      <div class="permission-actions">
        <button class="btn-deny" onclick="respondPermission('${event.id}', false)">Deny</button>
        <button class="btn-approve" onclick="respondPermission('${event.id}', true)">Approve</button>
      </div>
    `;
    document.body.appendChild(dialog);
  }

  // ─── Send Functions ──────────────────────────────────────
  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;

    // Parse input
    if (text.startsWith('/')) {
      const parts = text.slice(1).split(/\s+/);
      send({ type: 'command', name: parts[0], args: parts.slice(1) });
    } else if (text.startsWith('@')) {
      const match = text.match(/^@(\S+)\s+(.*)/s);
      if (match) {
        send({ type: 'direct', agentName: match[1], text: match[2] });
      }
    } else {
      send({ type: 'prompt', text });
    }

    // Show user message locally
    renderMessage({
      id: 'local-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    });
    scrollToBottom();

    inputEl.value = '';
    inputEl.focus();
  });

  // ─── Global functions (called from onclick) ──────────────
  window.insertAgent = (name) => {
    inputEl.value = `@${name} `;
    inputEl.focus();
    agentSidebar.classList.remove('visible');
  };

  window.respondPermission = (id, approved) => {
    send({ type: 'permission_response', id, approved });
    const el = $(`#perm-${id}`);
    if (el) el.remove();
    delete pendingPermissions[id];
  };

  // ─── Sidebar toggle ─────────────────────────────────────
  $('#btn-agents').addEventListener('click', () => {
    agentSidebar.classList.toggle('visible');
    agentSidebar.classList.toggle('hidden');
  });
  $('#btn-close-sidebar').addEventListener('click', () => {
    agentSidebar.classList.remove('visible');
    agentSidebar.classList.add('hidden');
  });

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
    renderMessage({
      id: 'sys-' + Date.now(),
      role: 'system',
      content: text,
      timestamp: new Date().toISOString(),
    });
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
    // Simple code block detection
    return escapeHtml(text)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  // ─── Keepalive ───────────────────────────────────────────
  setInterval(() => {
    if (connected) send({ type: 'ping' });
  }, 30000);

  // ─── Start ───────────────────────────────────────────────
  connect();
})();

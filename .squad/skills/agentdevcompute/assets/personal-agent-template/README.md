# 🤖 Personal Agent — Your AI Workspace in a Sandbox

A personal AI agent powered by GitHub Copilot SDK with **Office 365 email/calendar**, **M365 Copilot chat**, and **ADC sandbox management** — all connected via zero-trust ADC connectors.

## Features

### Core Chat
- **Streaming responses** — tokens appear in real-time as the model generates them (SSE)
- **Tailwind CSS** — modern, responsive UI with dark/light mode toggle
- **Markdown rendering** — full GFM support via marked.js (headings, tables, lists, links)
- **Syntax highlighting** — Highlight.js with language labels and copy buttons
- **HTML preview** — sandboxed iframe previews for generated HTML code blocks
- **Session management** — search, rename, date grouping (Today/Yesterday/Older), message counts
- **Mobile responsive** — collapsible sidebar with hamburger menu
- **Persistent sessions** — conversations survive page refresh

### Personal Agent Extensions
- **ADC Connector MCP auto-detection** — automatically discovers all connected MCP servers from `/root/.copilot/mcp-config.json`
- **Office 365 integration** — send emails, read inbox, check calendar via MCP tools
- **M365 Copilot integration** — ask enterprise questions, search documents via MCP tools
- **ADC Management** — create/manage sandboxes from within your agent
- **Persistent memory** — agent remembers preferences across sessions (SOUL.md pattern at `/home/user/.personal-agent/memory.md`)
- **Cron jobs** — schedule recurring tasks (email digests, report generation)
- **Heartbeat watchers** — poll for conditions and trigger actions (e.g., watch inbox for CEO emails)
- **Multi-agent routing** — `@email`, `@research`, `@general` prefixes route to specialized agents
- **Zero-trust token flow** — `gho_placeholder` is swapped by egress proxy; real tokens never enter the sandbox

## Modes

### 💬 Basic Mode (chat only)
Requires only the **GitHub Copilot** connection. Simple ChatGPT-style chat.

### 🤖 Personal Agent Mode (full)
Requires **4 connections** for the complete experience:

| Connection | What it provides | Required for |
|-----------|-----------------|-------------|
| **GitHub Copilot** | AI models (Claude, GPT, etc.) via Copilot SDK | All chat |
| **Office 365** | Email (send/read/reply), Calendar (events/meetings) | `@email` agent, calendar queries |
| **M365 Copilot** | Enterprise search, document summaries, SharePoint | `@research` agent |
| **ADC Management** | Sandbox CRUD, file ops, port management | Sandbox management from chat |

## Prerequisites

- ADC Portal account — sign in with your **Microsoft account** at [portal.agentdevcompute.io](https://portal.agentdevcompute.io)
- Azure CLI installed and `az login` completed
- Node 24+ (install in sandbox: `npm install -g n && n 24`)

## Deploy

> **⚠️ Personal connectors (Office 365, M365 Copilot) require Entra ID authentication on the port BEFORE the connections can be attached. The port must be locked to YOUR email — this ensures your personal data (emails, documents) is only accessible to you.**
>
> **Why `gho_placeholder`?** The Copilot preset sets `COPILOT_GITHUB_TOKEN=gho_placeholder` in the sandbox. This placeholder token is intercepted by the ADC egress proxy, which swaps it for real GitHub credentials at request time. This zero-trust flow means the actual token never exists inside the sandbox — the proxy injects it on outbound calls to the Copilot API.
>
> **MCP auto-detection:** When connections are attached, the ADC Node Agent writes MCP server config to `/root/.copilot/mcp-config.json` inside the sandbox. The Personal Agent reads this file at startup and automatically connects to all available MCP servers.

### Step 1: Create connections in Portal

1. Open [https://portal.agentdevcompute.io](https://portal.agentdevcompute.io) — sign in with your **Microsoft account**
2. Go to **Connectors** → create each connection:
   - **GitHub Copilot** — OAuth consent for AI models
   - **Office 365** — OAuth consent for email/calendar (personal connector)
   - **M365 Copilot** — OAuth consent for enterprise search (personal connector)
   - **ADC Management** — API key (auto-provisioned)

### Step 2: Create sandbox with Copilot preset

1. In the Portal, create a new sandbox using the **Copilot preset**
2. **Add port 80 with Entra ID auth** — Portal → Sandbox → Ports → Add port 80 → Entra ID → enter your email
   - Use your Entra email (e.g., `Annaji.Ganti@microsoft.com`), NOT your alias
   - To find your Entra email: `az ad signed-in-user show --query mail -o tsv`
3. **Attach connections** in order: GitHub Copilot first, then Office 365, M365 Copilot, ADC Management
4. **Verify:** Open sandbox terminal → check `/root/.copilot/mcp-config.json` exists with all 4 servers

> **⚠️ Port auth with personal connectors:** If port 80 does not have Entra ID auth, attaching Office 365 or M365 Copilot will fail with `500 Cannot add personal connector because port does not have Entra ID authentication`. Always add the port with Entra ID FIRST.
>
> **Your sandbox is locked to YOU:** Because the port uses Entra ID auth locked to your email, only you can access the sandbox URL. This is by design — your personal emails, calendar, and documents are never exposed to anyone else.

### Step 3: Verify the sandbox (agent does this)

```javascript
import { AdcApi } from "./adc-api.js";
const api = new AdcApi();

const sandboxId = "<sandbox-id-from-user>";
const sbx = await api.getSandbox(sandboxId);

// Verify sandbox is running
if (sbx.state !== "Running") {
  console.error(`Sandbox is ${sbx.state}. Resume it or create a new one.`);
}

// Check for connections — verify in Portal if any are missing
const connections = sbx.connections || [];
const needed = ["copilot", "office", "m365", "adc"];
for (const name of needed) {
  const found = connections.some(c =>
    (c.type || c.name || "").toLowerCase().includes(name)
  );
  if (!found) console.warn(`⚠️ Missing connection matching "${name}" — check Portal`);
}
```

### Step 4: Deploy Personal Agent using adc-api.js

```javascript
import { AdcApi } from "./adc-api.js";
const api = new AdcApi();

const sandboxId = "<sandbox-id-from-user>";

// Upload personal-agent template files from assets/personal-agent-template/
// Then install and start:
await api.execShell(sandboxId, "npm install -g n && n 24");
await api.execShell(sandboxId, "cd /home/user/personal-agent && npm config set strict-ssl false && npm install");
await api.execShell(sandboxId, "cd /home/user/personal-agent && PORT=80 node index.js &");
```

### Step 5: Access

1. Open the URL in your browser: `https://<sandbox-id>--80.proxy.azuredevcompute.io`
2. Sign in with your Microsoft account (Entra ID) — must match the email used for port auth
3. Try these commands:
   - `What meetings do I have this week?` — uses Office 365 calendar
   - `Send an email to team@company.com about the standup notes` — uses Office 365 email
   - `@research What are the latest documents shared with me?` — uses M365 Copilot
   - `@email Check my inbox for anything urgent` — uses email agent

### Step 6: Snapshot

> **After verifying everything works, ask the user:** "Everything looks good — want me to take a snapshot so you can restore to this state instantly?"
>
> ```javascript
> await api.createSnapshot(sandboxId, { name: "personal-agent-deployed" });
> ```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send message (batch response) |
| `/api/chat/stream` | POST | Send message (SSE streaming) |
| `/api/sessions` | GET | List all sessions |
| `/api/sessions/:id` | GET/DELETE | Get or delete a session |
| `/api/memory` | GET/PUT | Read or update persistent memory |
| `/api/crons` | GET/POST | List or create cron jobs |
| `/api/crons/:id` | DELETE | Remove a cron job |
| `/api/watchers` | GET/POST | List or create heartbeat watchers |
| `/api/watchers/:id` | DELETE | Remove a watcher |
| `/api/agents` | GET/POST | List built-in + custom agents |
| `/api/status` | GET | Full status (memory, crons, watchers, agents, MCP servers) |
| `/health` | GET | Health check |

## Known Limitations

- **M365 Copilot calls are slow** (10–30+ seconds) — the agent uses a 5-minute timeout
- **Port management with personal connectors** requires the Portal — `az` CLI tokens lack the email claim needed by the ADC API
- **MCP config** must exist at `/root/.copilot/mcp-config.json` — if connections are attached after sandbox creation, restart the sandbox for the Node Agent to regenerate the config

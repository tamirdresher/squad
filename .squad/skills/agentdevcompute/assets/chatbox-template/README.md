# 💬 ChatBox — ChatGPT-style AI in a sandbox

A ChatGPT-like interface powered by GitHub Copilot SDK. Pick your model (claude-opus-4.6, gpt-5.1, etc.), chat with persistent sessions.

## Features

- **Streaming responses** — tokens appear in real-time as the model generates them (SSE)
- **Tailwind CSS** — modern, responsive UI with dark/light mode toggle
- **Markdown rendering** — full GFM support via marked.js (headings, tables, lists, links)
- **Syntax highlighting** — Highlight.js with language labels and copy buttons
- **HTML preview** — sandboxed iframe previews for generated HTML code blocks
- **Session management** — search, rename, date grouping (Today/Yesterday/Older), message counts
- **Mobile responsive** — collapsible sidebar with hamburger menu
- **Persistent sessions** — conversations survive page refresh

## Prerequisites

- ADC Portal account — sign in with your **Microsoft account** at [portal.agentdevcompute.io](https://portal.agentdevcompute.io)
- **GitHub Copilot connection** created in Portal → Connectors (requires OAuth consent)
- Sandbox created from **Portal** with **Copilot preset**, with the GitHub Copilot connection attached
- Node 24+ (install in sandbox: `npm install -g n && n 24`)
- Port 80 exposed (anonymous for public access)

## Deploy

> **⚠️ The sandbox MUST be created from the Portal with the Copilot preset, and the GitHub Copilot connection must be created and attached separately. Do NOT create it via API — the Copilot connection requires OAuth consent that only the Portal can complete.**

### Step 1: Create GitHub Copilot connection

1. Open [https://portal.agentdevcompute.io](https://portal.agentdevcompute.io) — sign in with your **Microsoft account**
2. Go to **Connectors** → click **Add Connection** → select **GitHub Copilot**
3. Complete the OAuth consent flow

### Step 2: Create sandbox with Copilot preset

1. In the Portal, create a new sandbox using the **Copilot preset**
2. Attach the **GitHub Copilot** connection to the sandbox
3. **Verify:** Open the sandbox terminal and run `copilot login` — confirm successful login
4. Copy the **sandbox ID**

### Step 3: Verify the sandbox (agent does this)

After the user provides the sandbox ID, verify it before deploying:

```javascript
import { AdcApi } from "./adc-api.js";
const api = new AdcApi();

const sandboxId = "<sandbox-id-from-user>";
const sbx = await api.getSandbox(sandboxId);

// Verify sandbox is running
if (sbx.status !== "Running") {
  console.error(`Sandbox is ${sbx.status}. Resume it or create a new one.`);
}

// Check for Copilot connection
const hasConnection = (sbx.connections || []).some(c =>
  c.type?.toLowerCase().includes("copilot") || c.name?.toLowerCase().includes("copilot")
);
if (!hasConnection) {
  console.warn("⚠️ GitHub Copilot connection not found.");
  console.warn("   Portal → Sandbox → attach the GitHub Copilot connection.");
}
```

### Step 4: Deploy ChatBox using adc-api.js

```javascript
import { AdcApi } from "./adc-api.js";
const api = new AdcApi();

const sandboxId = "<sandbox-id-from-user>";

// Upload chatbox template files from assets/chatbox-template/
// Then install and start:
await api.execShell(sandboxId, "npm install -g n && n 24");
await api.execShell(sandboxId, "cd /home/user/chatbox && npm config set strict-ssl false && npm install");
await api.execShell(sandboxId, "cd /home/user/chatbox && PORT=80 node index.js &");
```

### Step 5: Access

1. Expose port 80 via Portal (Portal → sandbox → Ports → expose port 80)
2. Open the URL in your browser: `https://<sandbox-id>--80.proxy.azuredevcompute.io`

### Step 6: Snapshot

> **After verifying everything works, ask the user:** "Everything looks good — want me to take a snapshot so you can restore to this state instantly?"
>
> ```javascript
> await api.createSnapshot(sandboxId, { name: "chatbox-deployed" });
> ```

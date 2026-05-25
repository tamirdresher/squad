---
name: agentdevcompute
description: >
  ADC (Azure Dev Compute) — MicroVMs for running AI agents, MCP servers, web apps, APIs in secure sandboxes.
  Two patterns: (1) Agent IN Sandbox — run CLIs like Claude Code or Copilot CLI on autopilot.
  (2) Sandbox as Tool — operate 1 to N sandboxes remotely via API, fan-out/fan-in in seconds,
  secrets never enter the sandbox via zero-trust egress. Build personal agents with Office 365
  email/calendar, M365 Copilot, and ADC connectors.
  Triggers: "create sandbox", "deploy to ADC", "host MCP server", "deploy coding agent",
  "sandbox as tool", "agent in sandbox", "go yolo", "deploy web app", "sandbox",
  "excalidraw", "copilot sdk", "snapshot", "personal agent", "build my personal agent",
  "send email", "m365", "office365"
metadata:
  author: adc-team
  version: "0.7.0"
---

# Azure Dev Compute (ADC) — Developer Skill

Deploy apps, agents, and MCP servers to **secure ADC sandboxes** — hardware-isolated microVMs where secrets never touch your code.

> **⚠️ IMPORTANT — Do NOT hallucinate CLI commands, install steps, API calls, or SSH methods.**
>
> - There is **no** `winget install adc`, `brew install adc`, `npm install -g adc`, or `pip install adc`. The ADC CLI is installed from GitHub Releases via `gh release download` — see [references/architecture.md](references/architecture.md) for getting started.
> - There is **no** `adc sandbox create --template`. Sandboxes are created from **disk images** (`--disk <id>`) or **snapshots** (`--snapshot <id>`).
> - There is **no** `adc deploy`, `adc init`, or `adc setup` command.
> - **Do NOT make raw REST/HTTP calls** to ADC APIs (no `Invoke-RestMethod`, `curl`, `fetch` to ADC endpoints). Always use the **`adc-api.js`** helper in `assets/adc-api.js`. It handles auth, correct endpoints, and security.
> - **Authentication** uses Azure CLI bearer tokens. Ensure `az` is installed and the user has run `az login`. The `adc-api.js` helper obtains tokens automatically via `az account get-access-token`.
> - The ADC API base URL is `https://management.azuredevcompute.io` — do NOT guess other URLs like `api.agentdevcompute.io` or `api-preview.agentdevcompute.io`.
> - **SSH:** There is **no** traditional SSH (port 22), **no** `ssh -i` with private keys, **no** VS Code Remote SSH, **no** `execSSH()` function, **no** SSH hostname or keypair. ADC uses a WebSocket-based shell over the management API. When users ask to SSH into a sandbox, present these options:
>   1. **ADC Portal (easiest):** Open the sandbox in the [ADC Portal](https://portal.azuredevcompute.io) → click **Terminal** — gives a browser-based shell, no setup needed.
>   2. **From any terminal with Node.js:** Copy `assets/ssh.mjs` to user's directory, install `ws` (`npm install ws`), then: `node ssh.mjs <sandbox-id>` — requires `az login` and Node.js 18+.
>   3. **Agent runs it programmatically:** `await api.sshShell(sandboxId)` — takes over stdin/stdout (useful for agent-in-sandbox pattern).
> - When users ask "how do I get started" or "what can I do with ADC", use **only** the information in this skill file and its references. Do not invent commands, flags, or workflows.
> - The primary getting-started path is: **Azure CLI** (`az login`) → **API helper** (`adc-api.js`) or **Portal UI** to create sandboxes and deploy templates.
> - For architecture and getting started details, refer to [references/architecture.md](references/architecture.md).
>
> ### How to use `adc-api.js`
>
> Copy `assets/adc-api.js` to the user's working directory, then use it in a Node.js script:
>
> ```javascript
> import { AdcApi } from "./adc-api.js";
> const api = new AdcApi(); // uses az CLI for auth (requires `az login`)
>
> // List sandboxes
> const sandboxes = await api.listSandboxes();
>
> // Create sandbox (auto-suspend disabled — stays running)
> const sbx = await api.createSandbox({ diskName: "copilot", ports: [{ port: 80, anonymous: true }], lifecycle: { autoSuspendPolicy: { enabled: false } } });
>
> // Execute commands (run anything in the sandbox)
> await api.execShell(sbx.id, "npm install && npm start");
>
> // Upload / download files
> await api.uploadFile(sbx.id, "/home/user/app/index.js", code);
> const content = await api.downloadFile(sbx.id, "/home/user/app/output.txt");
>
> // Manage ports
> await api.addPort(sbx.id, 80, { email: "you@company.com" });
> const ports = await api.listPorts(sbx.id);
>
> // Lifecycle
> await api.stopSandbox(sbx.id);    // suspend (snapshot saved)
> await api.resumeSandbox(sbx.id);  // resume (sub-second)
> await api.deleteSandbox(sbx.id);
>
> // Disk images & snapshots
> const disk = await api.createDiskImage("mcr.microsoft.com/devcontainers/javascript-node:22", "my-disk");
> const snap = await api.createSnapshot(sbx.id);
>
> // SSH — interactive shell (takes over stdin/stdout)
> await api.sshShell(sbx.id);
> ```
>
> **SSH via standalone script** (for user to run in another terminal):
> Copy `assets/ssh.mjs` to the user's working directory, then tell them:
> ```
> node ssh.mjs <sandbox-id>
> ```
> Requires `ws` package: `npm install ws` (one time). Requires `az login`.
>
> ### What users can do with ADC
>
> When a user asks "what can I do" or "what's next", offer these options based on their current state:
>
> | Action | How | Via |
> |--------|-----|-----|
> | **SSH into a sandbox** | **Portal:** open sandbox → Terminal. **CLI:** `node ssh.mjs <sandbox-id>` (needs `npm install ws`). **Agent:** `await api.sshShell(sandboxId)` | Portal, ssh.mjs, or adc-api.js |
> | **Clone a repo & work on it** | SSH in, `git clone`, code, test, commit | adc-api.js (sshShell) or ssh.mjs |
> | **List sandboxes** | `api.listSandboxes()` | adc-api.js |
> | **Create a sandbox** | `api.createSandbox(...)` | adc-api.js or Portal |
> | **Execute commands** | `api.execShell(id, "cmd")` | adc-api.js |
> | **Upload/download files** | `api.uploadFile(...)` / `api.downloadFile(...)` | adc-api.js |
> | **Expose a port** | `api.addPort(id, port)` | adc-api.js or Portal |
> | **Suspend/resume** | `api.stopSandbox(id)` / `api.resumeSandbox(id)` | adc-api.js |
> | **Deploy a template** | Personal Agent, Excalidraw MCP — see Templates below | adc-api.js |
> | **Manage connections** | Create in Portal, attach via `api.addConnectionToSandbox(...)` | Portal + adc-api.js |
> | **Fan out tasks across N sandboxes** | Create N sandboxes, exec in parallel, collect results | adc-api.js |
> | **View in Portal** | [portal.agentdevcompute.io](https://portal.agentdevcompute.io) | Browser |
>
> ### Developer Workflow Scenarios
>
> When users ask "what can I do", highlight these real-world workflows:
>
> **🔨 Clone a repo and work on it**
> 1. Create a sandbox → SSH in (Portal Terminal, `node ssh.mjs <id>`, or `await api.sshShell(id)`)
> 2. `git clone https://github.com/org/repo .`
> 3. Code, test, commit — full dev environment with any tools
> 4. Suspend when done → resume later, pick up exactly where you left off
>
> **🤖 Put an agent on autopilot**
> 1. In Portal: **Connectors** → create **GitHub Copilot** connection (OAuth)
> 2. Create a sandbox with **Copilot preset** → attach the GitHub Copilot connection
> 3. SSH in (`api.sshShell(id)`) → run `copilot` or `claude` CLI
> 4. Give it a task — the agent works inside the sandbox with full isolation
> 5. Come back later to review results
>
> **📋 Fan out features/tasks across multiple sandboxes**
> 1. Create N sandboxes (one per feature/task)
> 2. Clone the repo in each, checkout different branches
> 3. Run agents or scripts in parallel — each sandbox is isolated
> 4. Collect results, merge branches
>
> ```javascript
> // Fan out example: 3 features in parallel
> const api = new AdcApi();
> const features = ["auth-module", "api-endpoints", "ui-dashboard"];
> const sandboxes = await Promise.all(
>   features.map(f => api.createSandbox({ diskName: "copilot", lifecycle: { autoSuspendPolicy: { enabled: false } } }))
> );
> await Promise.all(sandboxes.map((sbx, i) =>
>   api.execShell(sbx.id, `git clone https://github.com/org/repo . && git checkout -b ${features[i]}`)
> ));
> ```
>
> **🌐 Host a web app or API**
> 1. Create a sandbox → upload your code
> 2. Install deps, start server on port 80
> 3. Expose port: `await api.addPort(id, 80, { anonymous: true })` → get HTTPS URL
>
> **🔌 Host an MCP server**
> 1. Create a sandbox → deploy MCP server (e.g., Excalidraw)
> 2. Expose port (anonymous): `await api.addPort(id, 80, { anonymous: true })` → connect from VS Code / Claude / ChatGPT
>
> **🤖 Build a Personal Agent (email + calendar + M365 Copilot + sandbox management)**
> 1. In Portal: create 4 connections — GitHub Copilot, Office 365, M365 Copilot, ADC Management
> 2. Create sandbox with Copilot preset → add port 80 with **Entra ID auth** (your email)
> 3. Attach all 4 connections → verify `/root/.copilot/mcp-config.json` has all MCP servers
> 4. Deploy Personal Agent template → access at `https://<id>--80.proxy.azuredevcompute.io`
> 5. Chat naturally: "Send email to team about standup", "What meetings do I have?", "@research latest docs"
> 6. Your sandbox is locked to YOU — personal data (emails, docs) never exposed to anyone else
>
> ### After successful deployment
>
> **Always** ask the user to take a snapshot after a template or app has been successfully deployed and tested:
> *"Everything looks good — want me to take a snapshot so you can restore to this state instantly?"*
> ```javascript
> await api.createSnapshot(sandboxId, { name: "descriptive-label" });
> ```
>
> ### Deployment Output (MANDATORY)
>
> After every deployment, the agent **MUST** output a structured summary with these fields:
>
> ```
> ✅ Server deployed and running in sandbox
>
> Sandbox:  <sandbox-id>
> Port:     <port-number>
> Access:   Anonymous / Entra ID
> URL:      https://<sandbox-id>--<port>.proxy.azuredevcompute.io
>
> Test your URL:
>   curl https://<sandbox-id>--<port>.proxy.azuredevcompute.io
> ```
>
> If the URL returns an error, check the [ADC Portal](https://portal.agentdevcompute.io) → Sandbox → Ports to verify port config.
>
> **Do NOT** just print the sandbox ID and leave it to the user to figure out the rest.

## What is ADC?

ADC is a **pro-developer PaaS/Serverless platform** for running AI agents, MCP servers, web apps, APIs, and background tasks in hardware-isolated microVMs (sandboxes). Unlike SaaS app builders that fully abstract compute, ADC gives developers controls much closer to the compute layer — pick any framework, any language, any toolchain.

More and more agents need a workspace: a computer where they can run code, install packages, and access files. That workspace needs to be **isolated** so the agent can't access your credentials, files, or network. ADC sandboxes provide this isolation by creating a hardware boundary (KVM microVMs) between the agent's environment and the outside world.

### Two Patterns for Connecting Agents to Sandboxes

ADC supports both fundamental architecture patterns for integrating agents with sandboxes:

---

**🤖 Pattern 1: Agent IN Sandbox**

The agent runs **inside** the sandbox. You communicate with it over the network.

- CLIs like **Claude Code** and **GitHub Copilot CLI** can operate inside a secure sandbox — safely put them on Ralph or autopilot mode
- The **Copilot SDK** and **Claude Code Agent SDK** lean on CLIs under the covers, so apps built with these SDKs benefit from running in a sandbox where they can execute code, install packages, and modify files without risk
- Mirrors local development closely — if you run a CLI locally, you run the same command in the sandbox
- The agent has direct filesystem access and can maintain complex environment state

**When to use:** The agent and execution environment are tightly coupled, you want production to mirror local development, or the agent needs persistent access to specific libraries and files.

---

**🔧 Pattern 2: Sandbox as Tool**

The agent runs **outside** (locally or on your server). When it needs to execute code, it calls a sandbox remotely via the ADC API.

- An agent (e.g., a Copilot CLI session) can connect to ADC and be the **operator of N sandboxes** — fan out work in seconds, then fan in results
- Credentials and secrets **stay outside** the sandbox — only execution happens in isolation
- Agent state (conversation history, reasoning, memory) lives separately from the sandbox, so sandbox failures don't lose agent state
- Update agent logic instantly without rebuilding environments
- **Pay for sandboxes only when executing**, not for the whole agent runtime (scale-to-zero)

**When to use:** You need to iterate quickly on agent logic, want to keep credentials outside the sandbox, need parallel execution across multiple sandboxes, or prefer cleaner separation between agent state and execution environment.

---

### Additional Capabilities

**🌐 MCP Servers, Web Apps & APIs** — ADC is not limited to coding agents. Host **MCP servers** (like Excalidraw MCP), full **web applications**, **REST APIs**, or any service that listens on a port. Pick any framework — Express, FastAPI, ASP.NET, Rails — and deploy it in a sandbox with exposed ports.

**🔌 Connectors (Zero-Trust)** — ADC supports all the connectors that **Azure Logic Apps** supports. Logic Apps has been a deterministic orchestrator; ADC now exposes these connectors to non-deterministic orchestrators (coding agents) — but sandboxed, so the agent **never sees a token or secret**. Real credentials are managed outside the sandbox boundary.

**⚡ Background Tasks** — Run batch jobs, scheduled tasks, data processing, or any long-running compute. Sandboxes can be suspended and resumed on-demand (scale-to-zero), making them cost-effective for intermittent workloads.

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **Node.js ≥18** | Required to run `adc-api.js` and `ssh.mjs`. Install from [nodejs.org](https://nodejs.org) or `winget install -e --id OpenJS.NodeJS.LTS` |
| **ADC Portal account** | Sign in at [portal.agentdevcompute.io](https://portal.agentdevcompute.io) with your **Microsoft account** |
| **Azure CLI** | Install `az` CLI — see [install guide](https://learn.microsoft.com/cli/azure/install-azure-cli) |
| **az login** | Run `az login` to authenticate — token is auto-acquired by `adc-api.js` |

### Authentication Setup

**Before any ADC operation, follow this flow:**

1. **Check** if Azure CLI (`az`) is installed:
   - Run `az --version` in the terminal
   - If not installed, install it:
     - **Windows:** `winget install -e --id Microsoft.AzureCLI`
     - **macOS:** `brew install azure-cli`
     - **Linux:** `curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash`
     - **Docs:** [https://learn.microsoft.com/cli/azure/install-azure-cli](https://learn.microsoft.com/cli/azure/install-azure-cli)
2. **Login** if not already authenticated:
   ```bash
   az login
   ```
3. **Proceed** — `adc-api.js` automatically obtains bearer tokens via:
   ```bash
   az account get-access-token --scope "https://management.azuredevcompute.io/AzureDevCompute.Management.ReadWrite.All"
   ```
   No manual token handling is needed — `az` caches and refreshes tokens internally.

### Per-template requirements

| Template | Sandbox disk | Node version | Ports to open | User inputs needed |
|----------|-------------|-------------|---------------|-------------------|
| 🎨 **Excalidraw MCP** | Any (`copilot` or `ubuntu`) | **24+** (install: `npm install -g n && n 24`) | **80** (anonymous — `await api.addPort(id, 80, { anonymous: true })`) | None |
| 🤖 **Personal Agent** | `copilot` preset (Portal) | **24+** (install: `npm install -g n && n 24`) | **80** (Entra ID auth, locked to user) | Microsoft login, 4 connections: GitHub Copilot, Office 365, M365 Copilot, ADC Management |
| 🔌 **adc-api.js** | Any | 18+ | N/A | `az login` |

### Port Activation

> Ports can be created and configured **entirely via the API** using `adc-api.js`:
>
> ```javascript
> // Anonymous access (public — for MCP servers, public APIs)
> await api.addPort(sbx.id, 3001, { anonymous: true });
>
> // Entra ID access (authenticated — provide user's Microsoft email)
> await api.addPort(sbx.id, 3001, { email: "user@company.com" });
>
> // Or set during sandbox creation
> const sbx = await api.createSandbox({
>   diskName: "copilot",
>   ports: [{ port: 80, anonymous: true }],
> });
> ```
>
> **After adding a port, always verify the URL works:**
> ```
> https://<sandbox-id>--<port>.proxy.azuredevcompute.io
> ```
>
> **Fallback:** If the URL doesn't respond, configure the port via the [ADC Portal](https://portal.agentdevcompute.io): Sandbox → Ports → Remove → Re-add with desired access level.

### npm in sandboxes

> **⚠️ Always run `npm config set strict-ssl false` before `npm install`** — required due to ADC's egress TLS inspection.

### npm Install Verification

> After running `npm install`, **always verify** that packages were actually installed. Silent failures can occur due to network timeouts or TLS issues.
>
> ```javascript
> await api.execShell(sbxId, "cd /home/user/app && npm config set strict-ssl false && npm install 2>&1");
> // Verify installation succeeded
> const check = await api.execShell(sbxId, "ls /home/user/app/node_modules/ | head -5");
> if (!(check.stdout || "").trim()) {
>   // npm install failed silently — retry without truncating output
>   await api.execShell(sbxId, "cd /home/user/app && npm install 2>&1");
> }
> ```

## Templates

| Template | What it does | How to deploy |
|----------|-------------|---------------|
| 🎨 **Excalidraw MCP** | Draw diagrams in VS Code / Claude / ChatGPT | Clone + build + start in sandbox |
| 🤖 **Personal Agent** | Full personal workspace — chat + Office 365 email/calendar + M365 Copilot + ADC management + memory + cron jobs + watchers + multi-agent routing. | 4 connections + Entra ID port — see [personal-agent-template/README.md](assets/personal-agent-template/README.md) |
| 🔌 **adc-api.js** | ADC API helper — create sandboxes, exec commands, manage ports | Import in any template |

---

## 🚀 Quick Start

### Option A: 🤖 Personal Agent (Recommended — full experience)

> **The agent should auto-provision the sandbox when the user has the required connections.**
> Check for connections first. If all 4 exist, create the sandbox, add port, attach connections, and deploy — no Portal steps needed (except initial connection creation).

**Step 1: Check & create connections (one-time Portal setup)**

The agent should first check if the user already has the required connections:

```javascript
import { AdcApi } from "./adc-api.js";
const api = new AdcApi();

// List existing connections
const conns = await api.listConnections();
const connTypes = {
  copilot:    conns.find(c => (c.type || "").includes("copilot")),
  office365:  conns.find(c => (c.type || "").includes("office365")),
  m365:       conns.find(c => (c.type || "").includes("m365copilot")),
  adcMgmt:    conns.find(c => (c.type || "").includes("adc-management")),
};

const missing = Object.entries(connTypes).filter(([k, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
  console.log("⚠️ Missing connections:", missing.join(", "));
  console.log("Create them in Portal → Connectors: https://portal.agentdevcompute.io");
  console.log("  - GitHub Copilot → OAuth consent");
  console.log("  - Office 365 → OAuth consent (personal connector)");
  console.log("  - M365 Copilot → OAuth consent (personal connector)");
  console.log("  - ADC Management → auto-provisioned API key");
  // STOP here — user must create connections in Portal first (OAuth consent required)
} else {
  console.log("✅ All 4 connections found — proceeding to auto-setup...");
}
```

If connections are missing, tell the user which ones to create in the Portal and STOP. OAuth consent can only be completed in the Portal.

**Step 2: Auto-provision sandbox (agent does this automatically)**

Once all 4 connections exist, the agent creates the sandbox, adds port with Entra ID, and attaches connections — all via API:

```javascript
import { execSync } from "child_process";

// 1. Get user's Entra email for port auth
const entraEmail = execSync('az ad signed-in-user show --query mail -o tsv').toString().trim();
console.log("Entra email:", entraEmail);

// 2. Create sandbox with copilot preset (no auto-suspend for always-on personal agent)
const sbx = await api.createSandbox({
  diskName: "copilot",
  lifecycle: { autoSuspendPolicy: { enabled: false } },
});
console.log("✅ Sandbox created:", sbx.id);

// 3. Add port 80 with Entra ID auth (MUST be before personal connectors)
await api.addPort(sbx.id, 80, { email: entraEmail });
console.log("✅ Port 80 added with Entra ID:", entraEmail);

// 4. Attach all 4 connections
const connectionIds = [
  connTypes.copilot.id,    // GitHub Copilot first
  connTypes.adcMgmt.id,    // ADC Management
  connTypes.office365.id,  // Office 365 (personal — needs Entra ID port)
  connTypes.m365.id,       // M365 Copilot (personal — needs Entra ID port)
];
for (const cid of connectionIds) {
  await api.addConnectionToSandbox(sbx.id, cid);
}
console.log("✅ All 4 connections attached");

// 5. Verify MCP config was generated
await new Promise(r => setTimeout(r, 3000)); // wait for Node Agent
const mcpCheck = await api.execShell(sbx.id, "cat /root/.copilot/mcp-config.json 2>/dev/null || echo MISSING");
if (mcpCheck.stdout?.includes("MISSING")) {
  console.warn("⚠️ MCP config not yet generated — connections may need a sandbox restart");
}
```

> **⚠️ Port auth with personal connectors via API:** The `addPort` API call may fail with `409 caller email could not be determined` when personal connectors are already attached. To avoid this, ALWAYS add port 80 with Entra ID auth BEFORE attaching Office 365 or M365 Copilot connections. If the API fails, fall back to the Portal for port management.

**Step 3: Deploy Personal Agent**

Continue with the standard deploy flow — upload template files, npm install, start server. See the [Deploy Path code reference](#deploy-path-for-agent-code-reference) in the Onboarding Guide below.

**Step 4: Output the result**

```
✅ Personal Agent deployed and running

Sandbox:  <sandbox-id>
Port:     80 (Entra ID: <entra-email>)
URL:      https://<sandbox-id>--80.proxy.azuredevcompute.io

🔒 This sandbox is locked to YOU — only you can access your emails, calendar, and documents.

Try these:
  "What meetings do I have this week?"
  "Send an email to team@company.com about standup notes"
  "@research What documents were shared with me recently?"
```

**Step 5: Share SSH access instructions**

After successful deployment, tell the user how to access their sandbox directly:

```
🔑 Want to SSH into your sandbox? Two options:

1. ADC Portal (easiest)
   Open your sandbox at https://portal.azuredevcompute.io → click Terminal
   Gives you a browser-based shell — no setup needed.

2. From any terminal with Node.js
   Copy adc-api.js to any machine with Node.js 18+ and az login, then run:
   
   npm install ws
   node -e "import('./adc-api.js').then(m => new m.AdcApi().sshShell('<sandbox-id>'))"

   ⚠️ There's no traditional SSH (port 22) — ADC uses a WebSocket shell
   over the management API, authenticated via your az login token.
```

| Template | What it does | Deploy guide |
|----------|-------------|--------------|
| 🎨 **Excalidraw MCP** | Draw diagrams in VS Code / Claude / ChatGPT | [assets/excalidraw-mcp-template/README.md](assets/excalidraw-mcp-template/README.md) |
| 🤖 **Personal Agent** | Full workspace — chat + email + calendar + M365 Copilot + memory + crons + watchers | [assets/personal-agent-template/README.md](assets/personal-agent-template/README.md) |
| 🔌 **adc-api.js** | ADC API helper — create sandboxes, exec commands, manage ports | See `assets/adc-api.js` and examples in the guardrails section above |

---

### 🔌 adc-api.js — ADC API Helper

Programmatic access to ADC — create sandboxes, execute commands, upload files, manage ports. No CLI needed.

```javascript
import { AdcApi } from "./adc-api.js";
const api = new AdcApi(); // uses az CLI for auth (requires `az login`)

// Create sandbox (auto-suspend disabled)
const sbx = await api.createSandbox({
  diskName: "copilot",
  ports: [{ port: 80, anonymous: true }],
  lifecycle: { autoSuspendPolicy: { enabled: false } },
});

// Execute commands
await api.execShell(sbx.id, "git clone https://github.com/org/repo .");
await api.execShell(sbx.id, "npm install && npm start");

// Upload files
await api.uploadFile(sbx.id, "/home/user/app/index.js", code);

// Manage ports
await api.addPort(sbx.id, 80, { email: "you@company.com" });
```

**Key methods:**

| Method | What |
|--------|------|
| `createSandbox({ diskName, ports, connections })` | Create a sandbox |
| `execShell(id, command)` | Run shell command |
| `uploadFile(id, path, content)` | Write a file |
| `addPort(id, port, { email, anonymous })` | Expose a port |
| `listConnections()` | List available connectors |
| `getSandbox(id)` / `deleteSandbox(id)` | Manage sandbox |
| `resumeSandbox(id)` / `stopSandbox(id)` | Lifecycle |

---

## ⚠️ Important Notes

| Topic | Details |
|-------|---------|
| **Port activation** | Use `addPort()` or `createSandbox()` with `anonymous: true` for public access. Verify the proxy URL works. Portal fallback: [portal.agentdevcompute.io](https://portal.agentdevcompute.io) → Sandbox → Ports. |
| **GitHub OAuth** | For GitHub API access: Portal → **Connectors** → create **GitHub Copilot** connection (OAuth consent) → create sandbox with **Copilot preset** → attach the connection to the sandbox |
| **Node 24** | Personal Agent (Copilot SDK) and Excalidraw both need Node 24+. The `copilot` disk includes Node 24 pre-installed. For `ubuntu` disk: `curl -fsSL https://deb.nodesource.com/setup_24.x \| bash - && apt-get install -y nodejs` |
| **npm install** | Run `npm config set strict-ssl false` first (ADC egress TLS inspection). **Always verify** `node_modules/` exists after install — silent failures can occur. |
| **Authentication** | Bearer token via `az account get-access-token`. Requires Azure CLI installed and `az login`. Token is auto-acquired by `adc-api.js` |
| **Auto-suspend** | Sandboxes suspend after 1hr idle (API helper default). Resume with `api.resumeSandbox(id)` |
| **Personal connectors** | Office 365 and M365 Copilot are **personal connectors** — require Entra ID port auth BEFORE attaching. Port is locked to your email; only you can access. |
| **Entra email vs alias** | Port auth must use your Entra email (`az ad signed-in-user show --query mail -o tsv`), NOT your alias from `az account show`. E.g., `Annaji.Ganti@microsoft.com` not `anganti@microsoft.com`. |
| **MCP auto-detection** | Connectors are exposed as MCP servers inside the sandbox. Config is auto-written to `/root/.copilot/mcp-config.json` by ADC Node Agent when connections are attached. |
| **M365 Copilot timeout** | M365 Copilot calls take 10–30+ seconds. The Personal Agent uses a 5-minute timeout. |

### `execShell()` — Blocking Behavior

> `execShell()` **blocks until the command completes**. For long-running commands (npm install, builds, git clone):
> - **npm install:** 2–5 minutes in sandboxes (network goes through egress proxy)
> - **git clone:** 30s–2 min depending on repo size
> - **npm run build:** 1–3 minutes depending on project
>
> Do NOT assume the command is stuck. If the calling agent has a timeout, increase it for install/build steps.

### TypeScript Projects

> When deploying TypeScript projects to sandboxes, prefer `npx tsx src/index.ts` over `tsc && node dist/index.js` — tsx handles ESM module resolution natively and avoids common `.js` extension issues with `NodeNext` module resolution.

---

## Security

- **Hardware isolation** — each sandbox is a separate microVM (KVM)
- **Zero-trust tokens** — real tokens never enter the sandbox
- **Egress proxy** — all outbound traffic inspected, per-sandbox allowlists
- **Port auth** — Entra ID or anonymous (configured via API `{ anonymous: true }` or Portal)
- **Personal connector isolation** — sandboxes with personal connectors (Office 365, M365 Copilot) REQUIRE Entra ID port auth locked to the user's email. Only the connection owner can access the sandbox URL. Your emails, calendar, and documents are never exposed to anyone else.
- **Bearer tokens** — short-lived Entra ID tokens via Azure CLI, no secrets to manage

See [references/security.md](references/security.md) for details.

---

## 🤖 Personal Agent — Onboarding Guide & Learnings

> This section captures all learnings from E2E testing the Personal Agent template with all 4 ADC connectors. Follow this guide for smooth onboarding.

### Setup Order (Critical — do this exactly)

The order matters. Deviating causes hard-to-debug errors.

1. **Create connections in Portal** (one-time):
   - GitHub Copilot → OAuth consent
   - Office 365 → OAuth consent (personal connector)
   - M365 Copilot → OAuth consent (personal connector)
   - ADC Management → auto-provisioned API key

2. **Create sandbox** with **Copilot preset** in Portal

3. **Add port 80 with Entra ID auth** — ⚠️ BEFORE attaching personal connectors
   - Portal → Sandbox → Ports → Add port 80 → Entra ID → your email
   - Must use Entra email: `az ad signed-in-user show --query mail -o tsv`
   - Example: `Annaji.Ganti@microsoft.com` (NOT `anganti@microsoft.com`)
   - If you skip this step, attaching Office 365 or M365 Copilot returns: `500 Cannot add personal connector because port does not have Entra ID authentication`

4. **Attach connections** to sandbox (GitHub Copilot first, then the rest)

5. **Verify MCP config** exists: `/root/.copilot/mcp-config.json` inside the sandbox
   - This file is auto-written by the ADC Node Agent when connections are attached
   - If missing, restart the sandbox to trigger regeneration

6. **Deploy Personal Agent** — upload template files, npm install, start server

### Entra Email vs Alias (Common Gotcha)

| Command | Returns | Use for |
|---------|---------|---------|
| `az account show --query user.name` | `anganti@microsoft.com` (alias) | ❌ Do NOT use for port auth |
| `az ad signed-in-user show --query mail -o tsv` | `Annaji.Ganti@microsoft.com` (Entra email) | ✅ Use this for port auth |
| `az ad signed-in-user show --query userPrincipalName -o tsv` | `anganti@microsoft.com` (UPN) | ❌ Same as alias |

The port Entra ID auth email MUST match the email in the user's Entra directory (`mail` attribute), not their Azure CLI login alias.

### Port Management Limitations with Personal Connectors

When personal connectors (Office 365, M365 Copilot) are attached to a sandbox:
- **Port add/remove via API (`adc-api.js`) will fail** with: `409 caller email could not be determined`
- This is because `az` CLI tokens for the ADC scope don't include the `email` JWT claim
- **Use the Portal** for all port management when personal connectors are involved
- The Portal's interactive Entra login flow produces tokens with the email claim

### Your Sandbox is Locked to YOU

Sandboxes with personal connectors have Entra ID port auth locked to **your email only**. This is a security feature:
- Only you can access the sandbox URL in a browser
- Your personal emails, calendar events, and documents are never exposed to anyone else
- The MCP tools (Office 365, M365 Copilot) operate under your identity
- Even if someone has the sandbox URL, they cannot access it without your Entra login

### MCP Server Discovery

Connectors are exposed inside the sandbox as MCP servers:
- **Instance Network Proxy**: `http://100.64.100.1/mcp` — all connector tools via a single endpoint
- **Identity Proxy**: `http://100.64.100.2/msi/token` — managed identity tokens
- **ADC Management MCP**: `https://management.azuredevcompute.io/mcp` — sandbox management tools

The Personal Agent auto-reads `/root/.copilot/mcp-config.json` at startup to discover all servers. You do NOT need to configure MCP manually.

### Available MCP Tools (discovered at runtime)

| Connector | Tools | Notes |
|-----------|-------|-------|
| **Office 365** | `send_mail`, `get_emails`, `get_email`, `reply_to_email`, `list_calendars`, `get_events`, `get_event` | Personal connector — uses your email identity |
| **M365 Copilot** | `create_copilot_conversation`, `chat_copilot_conversation` | Slow (10–30s per call). Agent uses 5-min timeout. Personal connector. |
| **ADC Management** | `list_disk_images`, `create_disk_image`, `get_disk_image`, `create_sandbox`, `delete_sandbox`, `execute_command`, `list_ports`, `add_port`, `remove_port`, `deploy_app`, `create_content_package`, `create_static_site` | Sandbox management from within the agent |
| **Built-in MCP** | `microsoft-learn`, `deepwiki` | General knowledge tools |

### Token & Auth Flow

```
User → Browser → Sandbox URL (Entra ID login)
                    ↓
              Personal Agent (index.js)
                    ↓
              Copilot SDK (gho_placeholder token)
                    ↓
              Egress Proxy swaps gho_placeholder → real GitHub token
                    ↓
              GitHub Copilot API (AI models)
                    ↓
              MCP tool calls → Instance Network Proxy (100.64.100.1)
                    ↓
              Office 365 / M365 Copilot / ADC Management
```

- `gho_placeholder` is auto-set by the code when `ADC_SANDBOX_ID` env var is detected
- The egress proxy intercepts outbound requests and swaps the placeholder for real credentials
- Real tokens **never exist** inside the sandbox

### Deployment Gotchas

| Issue | Solution |
|-------|----------|
| `uploadFile` creates files but not directories | Always `mkdir -p /path/to/dir` via `execShell` before uploading |
| `npm install` silent failures | Always verify: `ls node_modules/ \| wc -l` after install. Run `npm config set strict-ssl false` first (egress TLS). |
| `listModels()` fails with "Client not connected" | Expected inside sandbox. Agent falls back to hardcoded defaults (claude-opus-4.6, gpt-5.1, etc.) |
| M365 Copilot calls timeout at 60s | Agent uses 300s (5-min) timeout. Do NOT reduce. |
| `execShell` returns 500 intermittently | Transient ADC API error. Retry with backoff (2–3 retries). |
| Port URL returns 502/504 | Server may still be starting. Wait 5–10 seconds after `node index.js &`. |
| MCP config missing after attaching connections | Restart the sandbox — Node Agent regenerates config on boot. |
| Server shows 2 MCP servers but agent lists more tools | The `/mcp` endpoint bundles all connector tools. Config file may show fewer servers than actual tool count. |

### Multi-Agent Routing

Users can prefix messages with `@agent_name` to route to specialized agents:

| Prefix | Agent | Focus |
|--------|-------|-------|
| `@email` | Email Agent | Reading, drafting, sending, searching emails |
| `@research` | Research Agent | M365 Copilot queries, document search, SharePoint |
| (no prefix) | General Agent | Everything — auto-detects intent and uses appropriate tools |

### Deploy Path for Agent (code reference)

```javascript
import { AdcApi } from "./adc-api.js";
const api = new AdcApi();
const sandboxId = "<from-user>";

// 1. Create dirs
await api.execShell(sandboxId, "mkdir -p /home/user/personal-agent/public");

// 2. Upload files (index.js, package.json, public/index.html)
await api.uploadFile(sandboxId, "/home/user/personal-agent/index.js", indexJsContent);
await api.uploadFile(sandboxId, "/home/user/personal-agent/package.json", packageJsonContent);
await api.uploadFile(sandboxId, "/home/user/personal-agent/public/index.html", htmlContent);

// 3. Install Node 24 + deps
await api.execShell(sandboxId, "npm install -g n && n 24");
await api.execShell(sandboxId, "cd /home/user/personal-agent && npm config set strict-ssl false && npm install");

// 4. Verify
const check = await api.execShell(sandboxId, "ls /home/user/personal-agent/node_modules/ | wc -l");
if (parseInt(check.stdout?.trim() || "0") < 10) throw new Error("npm install failed");

// 5. Start
await api.execShell(sandboxId, "cd /home/user/personal-agent && PORT=80 nohup node index.js > /tmp/server.log 2>&1 &");

// 6. Wait + verify
await new Promise(r => setTimeout(r, 5000));
const health = await api.execShell(sandboxId, "curl -s http://localhost/health");
console.log(health.stdout); // should show {"status":"ok","app":"personal-agent",...}
```

---

## 📚 Learn More

| Topic | Reference |
|-------|-----------|
| **How ADC works** | [references/architecture.md](references/architecture.md) — Architecture, two agent patterns, sandbox lifecycle, getting started |
| **Security model** | [references/security.md](references/security.md) — KVM isolation, zero-trust tokens, egress policies, defense-in-depth |
| **Connections** | [references/connections.md](references/connections.md) — Credential injection, OAuth, custom API keys |
| **Troubleshooting** | [references/troubleshooting.md](references/troubleshooting.md) — Common issues and fixes |
| **OpenAPI spec** | [management.azuredevcompute.io/openapi/v1.json](https://management.azuredevcompute.io/openapi/v1.json) — Full API surface reference |

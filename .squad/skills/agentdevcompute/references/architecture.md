# ADC Architecture & Getting Started

## What is ADC?

**Azure Dev Compute (ADC)** is a pro-developer PaaS for running AI agents, MCP servers, web apps, APIs, and background tasks in hardware-isolated microVM sandboxes.

Unlike containers that share a host kernel, each ADC sandbox runs in its own **microVM** — the same KVM technology behind AWS Lambda. This gives you:

| Property | What it means |
|----------|---------------|
| **Hardware isolation** | Each sandbox has its own kernel — no container escape risk |
| **Sub-second startup** | MicroVMs boot in milliseconds, not minutes |
| **Snapshot & resume** | Suspend a sandbox, resume it days later — memory and disk state preserved |
| **Scale to zero** | Pay only when executing — suspended sandboxes consume no compute |
| **Any language, any framework** | Full Linux environment — install anything you'd install on a VM |

---

## Why ADC for AI Agents?

LLM agents generate and execute code at runtime. This creates unique risks:

| Risk | What can go wrong | How ADC prevents it |
|------|-------------------|---------------------|
| **Prompt injection** | Malicious input causes the agent to run harmful code | Code runs in an isolated VM — blast radius is contained to that sandbox |
| **Credential exfiltration** | Generated code leaks credentials via HTTP or logging | No credentials exist in the sandbox — tokens are injected at the egress proxy boundary |
| **Scope creep** | Agent accesses resources beyond its intended scope | Per-sandbox egress allowlists restrict what the agent can reach |

---

## How ADC Sandboxes Work

```
┌─────────────────────────────────────────────────────────────┐
│  ADC Sandbox (Hardware-Isolated MicroVM)                    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Your Code / Agent / MCP Server                      │  │
│  │  Full Linux environment — any language, any framework │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  • Own kernel — no shared OS with host or other sandboxes   │
│  • No credentials inside — tokens injected at egress        │
│  • Suspend/resume preserves full memory + disk state        │
└──────────────────────┬──────────────────────────────────────┘
                       │ All outbound traffic
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Egress Proxy (Security Boundary)                           │
│                                                             │
│  ✓ Per-sandbox allowlists — only approved hosts get traffic │
│  ✓ Credential injection — OAuth tokens, secrets added here   │
│  ✓ Token swap — sandbox tokens replaced with real tokens    │
│  ✓ HTTPS inspection — encrypted traffic inspected           │
│  ✓ Audit trail — every outbound request logged              │
└──────────────────────┬──────────────────────────────────────┘
                       │ request + real credentials
                       ▼
                External APIs (GitHub, Azure, M365, etc.)
```

**Zero-trust token architecture:** Your code calls `DefaultAzureCredential()` normally, but the token returned is a scoped sandbox token — useless outside the sandbox. When your code makes outbound API calls, ADC's egress proxy swaps it for the real token. If the agent leaks the token, it's worthless.

See [security.md](security.md) for the full defense-in-depth model.

---

## Two Patterns for Agents + Sandboxes

### 🤖 Pattern 1: Agent IN Sandbox

The agent runs **inside** the sandbox. You communicate with it over the network.

```
┌──────────────────────────────────┐
│  ADC Sandbox (microVM)           │
│                                  │
│  ┌────────────────────────────┐  │
│  │  Claude Code / Copilot CLI│  │
│  │  (agent runs here)        │  │
│  └────────────────────────────┘  │
│                                  │
│  Files, packages, environment    │
│  all live inside the sandbox     │
└──────────────────────────────────┘
         ▲
         │ SSH / HTTPS
         │
    You (or your app)
```

- CLIs like **Claude Code** and **GitHub Copilot CLI** run inside the sandbox — safely put them on autopilot
- The **Copilot SDK** and **Claude Code Agent SDK** lean on CLIs under the covers, benefiting from sandbox isolation
- Mirrors local development — if you run a CLI locally, run the same command in the sandbox
- Agent has direct filesystem access and can maintain complex environment state

**When to use:** Agent and execution environment are tightly coupled, you want production to mirror local dev, or the agent needs persistent access to specific libraries and files.

### 🔧 Pattern 2: Sandbox as Tool

The agent runs **outside** (locally or on your server). When it needs to execute code, it calls a sandbox remotely via the ADC API.

```
┌──────────────────┐     API calls     ┌──────────────────┐
│  Your Agent      │ ───────────────►  │  Sandbox A       │
│  (local/server)  │ ───────────────►  │  Sandbox B       │
│                  │ ───────────────►  │  Sandbox C       │
│  Secrets stay    │                   │  (code runs here)│
│  here, never     │  ◄─── results ── │                  │
│  enter sandbox   │                   │  No secrets here │
└──────────────────┘                   └──────────────────┘
```

- Fan out work across **N sandboxes** in seconds, then fan in results
- Secrets and credentials **stay outside** — only execution happens in isolation
- Agent state (conversation, reasoning, memory) lives separately — sandbox failures don't lose agent state
- Update agent logic instantly without rebuilding environments
- **Scale to zero** — pay for sandboxes only when executing

**When to use:** You need parallel execution, want credentials outside the sandbox, want to iterate quickly on agent logic, or prefer clean separation between agent state and execution.

---

## Sandbox Lifecycle

```
  create (from disk image)
     │
     ▼
  ┌─────────┐    suspend     ┌────────────┐
  │ Running │ ─────────────► │ Suspended  │
  │         │                │ (snapshot)  │
  │         │ ◄───────────── │            │
  └─────────┘    resume      └────────────┘
     │           (sub-second)
     ▼
   delete
```

1. **Create** — from a disk image (OCI container → ext4) or from a snapshot
2. **Run** — execute commands, install packages, run servers, deploy apps
3. **Suspend** — memory + disk state saved as a snapshot; VM destroyed; zero cost
4. **Resume** — sub-second restore from snapshot; pick up exactly where you left off
5. **Delete** — remove sandbox and its resources

**Key insight:** Suspend/resume is what enables scale-to-zero. Your sandbox isn't "stopped" — it's frozen in time. Resume is not a reboot; it's restoring the exact memory state.

---

## Connections — Zero-Trust Credential Management

Credentials (OAuth tokens, secrets) are stored server-side in the [ADC Portal](https://portal.agentdevcompute.io/connectors). The egress proxy injects them into outbound requests at the network boundary — your code never handles secrets.

ADC supports all the connectors that **Azure Logic Apps** supports — GitHub, Microsoft 365, Azure, custom credentials, and more. Your agent **never sees a token or secret**.

See [connections.md](connections.md) for full details.

---

## Getting Started

### Step 1: Get Access

1. Sign in at [portal.agentdevcompute.io](https://portal.agentdevcompute.io) with your **Microsoft account**
2. Ensure Azure CLI is installed and run `az login`

### Step 2: Pick a Template

| Template | What it does | Best for | Deploy guide |
|----------|-------------|----------|--------------|
| 🎨 **Excalidraw MCP** | Host the Excalidraw MCP server — draw diagrams from VS Code, Claude, or ChatGPT | Hosting an MCP server in a sandbox | [excalidraw-mcp-template/README.md](../assets/excalidraw-mcp-template/README.md) |
| 🤖 **Personal Agent** | Personal AI workspace — Copilot SDK + Office 365 + M365 Copilot + ADC management | Trying "Agent IN Sandbox" pattern | [personal-agent-template/README.md](../assets/personal-agent-template/README.md) |
| 🔌 **adc-api.js** | ADC API helper — create sandboxes, exec commands, manage ports programmatically | Building "Sandbox as Tool" workflows | See `assets/adc-api.js` |

### Important Notes

| Topic | Details |
|-------|---------|
| **Port activation** | Ports must be enabled via the Portal — API creates but doesn't activate the proxy route |
| **Node 24** | Personal Agent and Excalidraw need Node 24+. Install: `npm install -g n && n 24` |
| **npm install** | Always run `npm config set strict-ssl false` first (ADC egress TLS inspection) |
| **Auto-suspend** | Sandboxes suspend after idle timeout. Resume with `api.resumeSandbox(id)` — sub-second |

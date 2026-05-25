/**
 * 🤖 PERSONAL AGENT — OpenClaw-inspired AI gateway powered by Copilot SDK.
 *
 * Features:
 *   - Copilot SDK brain with streaming + autonomous tool chaining
 *   - ADC connectors as MCP tools (Office 365 email/calendar, M365 Copilot, ADC Management)
 *   - Structured memory: SOUL.md (personality), USER.md (prefs), MEMORY.md (long-term facts)
 *   - Daily memory logs (memory/YYYY-MM-DD.md — continuous learning journal)
 *   - SDK hooks: onSessionStart (loads memory), onSessionEnd (flushes to daily log)
 *   - Infinite sessions with auto-compaction (SDK-native, no lost context)
 *   - Cron jobs (node-cron — "every 9am, summarize my emails")
 *   - Heartbeat watchers ("watch inbox for CEO emails")
 *   - Multi-agent sessions (@email, @research routing)
 *   - Skills system (add/remove/toggle SKILL.md skills)
 *
 * Requires Node 24+. Run `npm run setup` to install.
 * Sessions persist: SDK manages conversation state, we save messages to disk.
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, rmSync, statSync, renameSync, cpSync, appendFileSync } from "fs";
import { execSync } from "child_process";
import { CopilotClient, approveAll } from "@github/copilot-sdk";
import express from "express";
import crypto from "crypto";
import cron from "node-cron";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 80;
const HISTORY_DIR = "/home/user/.personal-agent";
const SKILLS_DIR = "/home/user/.personal-agent/skills";
const AGENTS_SKILLS_DIR = join(SKILLS_DIR, ".agents", "skills"); // npx skills add installs here
const MEMORY_FILE = join(HISTORY_DIR, "memory.md"); // legacy — migrated to identity/MEMORY.md
const CRONS_FILE = join(HISTORY_DIR, "crons.json");
const WATCHERS_FILE = join(HISTORY_DIR, "watchers.json");
const AGENTS_FILE = join(HISTORY_DIR, "agents.json");

// Structured identity & memory directories
const IDENTITY_DIR = join(HISTORY_DIR, "identity");
const SOUL_FILE = join(IDENTITY_DIR, "SOUL.md");
const USER_PREFS_FILE = join(IDENTITY_DIR, "USER.md");
const LONG_TERM_MEMORY_FILE = join(IDENTITY_DIR, "MEMORY.md");
const MEMORY_LOG_DIR = join(HISTORY_DIR, "memory");

try { mkdirSync(HISTORY_DIR, { recursive: true }); } catch {}
try { mkdirSync(SKILLS_DIR, { recursive: true }); } catch {}
try { mkdirSync(IDENTITY_DIR, { recursive: true }); } catch {}
try { mkdirSync(MEMORY_LOG_DIR, { recursive: true }); } catch {}



// Seed identity files on first run (SOUL.md, USER.md, MEMORY.md)
const IDENTITY_TEMPLATES_DIR = join(__dirname, "identity");
if (existsSync(IDENTITY_TEMPLATES_DIR)) {
  for (const file of readdirSync(IDENTITY_TEMPLATES_DIR)) {
    const dest = join(IDENTITY_DIR, file);
    if (!existsSync(dest)) {
      try { cpSync(join(IDENTITY_TEMPLATES_DIR, file), dest); console.log(`[identity] seeded: ${file}`); } catch (e) { console.warn(`[identity] failed to seed ${file}:`, e.message); }
    }
  }
}

// Migrate legacy memory.md → identity/MEMORY.md (one-time)
if (existsSync(MEMORY_FILE) && !existsSync(LONG_TERM_MEMORY_FILE + ".migrated")) {
  try {
    const oldMemory = readFileSync(MEMORY_FILE, "utf8").trim();
    if (oldMemory) {
      const existing = existsSync(LONG_TERM_MEMORY_FILE) ? readFileSync(LONG_TERM_MEMORY_FILE, "utf8") : "";
      writeFileSync(LONG_TERM_MEMORY_FILE, existing + "\n\n## Migrated from memory.md\n" + oldMemory);
      writeFileSync(LONG_TERM_MEMORY_FILE + ".migrated", new Date().toISOString());
      console.log("[memory] migrated legacy memory.md → identity/MEMORY.md");
    }
  } catch (e) { console.warn("[memory] migration failed:", e.message); }
}

// Get user name from az CLI for personalization
let userName = "User";
try {
  const acct = JSON.parse(execSync('az account show -o json 2>/dev/null', { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }));
  userName = acct.user?.name?.split("@")[0] || acct.user?.name || "User";
} catch { /* az not available in sandbox — fallback */ }

// Auto-populate USER.md name from az CLI on first boot
if (userName !== "User" && existsSync(USER_PREFS_FILE)) {
  try {
    const userContent = readFileSync(USER_PREFS_FILE, "utf8");
    if (userContent.includes("(Will be auto-detected from Azure CLI)")) {
      writeFileSync(USER_PREFS_FILE, userContent.replace("(Will be auto-detected from Azure CLI)", userName));
      console.log(`[identity] auto-populated USER.md name: ${userName}`);
    }
  } catch {}
}

if (process.env.COPILOT_GITHUB_TOKEN && !process.env.GH_TOKEN) {
  process.env.GH_TOKEN = process.env.COPILOT_GITHUB_TOKEN;
}
// In ADC sandboxes with GitHub Copilot connection, egress proxy swaps gho_placeholder for real creds
if (!process.env.GH_TOKEN && process.env.ADC_SANDBOX_ID) {
  process.env.GH_TOKEN = "gho_placeholder";
}

// Persistent memory (OpenClaw SOUL.md pattern)
function loadMemory() {
  try { return existsSync(MEMORY_FILE) ? readFileSync(MEMORY_FILE, "utf8") : ""; } catch { return ""; }
}
function saveMemory(content) { writeFileSync(MEMORY_FILE, content); }

// ── Structured memory system ──
function loadIdentityFile(filePath) {
  try { return existsSync(filePath) ? readFileSync(filePath, "utf8") : ""; } catch { return ""; }
}
function saveIdentityFile(filePath, content) {
  writeFileSync(filePath, content);
}

function todayDate() { return new Date().toISOString().slice(0, 10); }
function yesterdayDate() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }

function dailyLogPath(date) { return join(MEMORY_LOG_DIR, `${date}.md`); }
function loadDailyLog(date) {
  const f = dailyLogPath(date);
  try { return existsSync(f) ? readFileSync(f, "utf8") : ""; } catch { return ""; }
}
function appendDailyLog(date, content) {
  const f = dailyLogPath(date);
  appendFileSync(f, (existsSync(f) ? "\n" : "") + content);
}
function listDailyLogs() {
  try { return readdirSync(MEMORY_LOG_DIR).filter(f => f.endsWith(".md")).map(f => f.replace(".md", "")).sort().reverse(); } catch { return []; }
}

// Build structured context from identity + daily logs (for SDK onSessionStart)
function buildMemoryContext() {
  const parts = [];
  const soul = loadIdentityFile(SOUL_FILE);
  if (soul) parts.push("## 🧠 Soul (Personality)\n" + soul);
  const userPrefs = loadIdentityFile(USER_PREFS_FILE);
  if (userPrefs) parts.push("## 👤 User Preferences\n" + userPrefs);
  const longTerm = loadIdentityFile(LONG_TERM_MEMORY_FILE);
  if (longTerm) parts.push("## 📚 Long-Term Memory\n" + longTerm);
  const today = loadDailyLog(todayDate());
  if (today) parts.push(`## 📓 Today's Log (${todayDate()})\n` + today);
  const yesterday = loadDailyLog(yesterdayDate());
  if (yesterday) parts.push(`## 📓 Yesterday's Log (${yesterdayDate()})\n` + yesterday);
  return parts.join("\n\n---\n\n");
}

// Cron jobs — persisted to disk, loaded on startup
let cronJobs = {};
let cronEntries = [];
try { if (existsSync(CRONS_FILE)) cronEntries = JSON.parse(readFileSync(CRONS_FILE, "utf8")); } catch {}
function saveCrons() { writeFileSync(CRONS_FILE, JSON.stringify(cronEntries, null, 2)); }

// Heartbeat watchers — background polling prompts
let watcherEntries = [];
try { if (existsSync(WATCHERS_FILE)) watcherEntries = JSON.parse(readFileSync(WATCHERS_FILE, "utf8")); } catch {}
function saveWatchers() { writeFileSync(WATCHERS_FILE, JSON.stringify(watcherEntries, null, 2)); }

// Multi-agent roles — each has own system prompt
const defaultAgents = {
  general: { name: "general", prompt: `You are ${userName}'s Personal Agent, a helpful AI assistant running in a secure ADC sandbox.`, builtin: true },
  email: { name: "email", prompt: `You are ${userName}'s Email Agent. Focus on email tasks: reading, drafting, sending, searching emails. Be concise.`, builtin: true },
  research: { name: "research", prompt: `You are ${userName}'s Research Agent. Focus on finding information via M365 Copilot, Microsoft Learn, and DeepWiki. Provide citations.`, builtin: true },
};
let customAgents = {};
try { if (existsSync(AGENTS_FILE)) customAgents = JSON.parse(readFileSync(AGENTS_FILE, "utf8")); } catch {}
function saveAgents() { writeFileSync(AGENTS_FILE, JSON.stringify(customAgents, null, 2)); }
function getAllAgents() { return { ...defaultAgents, ...customAgents }; }

// Copilot SDK client
const copilot = new CopilotClient();
let availableModels = [];

// Active SDK sessions: sessionId → { sdkSession, model }
const sessions = new Map();
let disabledSkills = [];
try {
  const ds = join(HISTORY_DIR, "disabled-skills.json");
  if (existsSync(ds)) disabledSkills = JSON.parse(readFileSync(ds, "utf8"));
} catch {}

// Skills management
function parseSkillFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { name: "", description: "" };
  const fm = {};
  match[1].split("\n").forEach(line => {
    const [k, ...v] = line.split(":");
    if (k && v.length) fm[k.trim()] = v.join(":").trim();
  });
  return fm;
}

function listSkills() {
  try {
    return readdirSync(SKILLS_DIR).filter(d => {
      if (d.startsWith(".")) return false;
      try { return statSync(join(SKILLS_DIR, d)).isDirectory() && existsSync(join(SKILLS_DIR, d, "SKILL.md")); } catch { return false; }
    }).map(d => {
      const content = readFileSync(join(SKILLS_DIR, d, "SKILL.md"), "utf8");
      const fm = parseSkillFrontmatter(content);
      return { name: fm.name || d, dir: d, description: fm.description || "", enabled: !disabledSkills.includes(d) };
    });
  } catch { return []; }
}

function saveDisabledSkills() {
  writeFileSync(join(HISTORY_DIR, "disabled-skills.json"), JSON.stringify(disabledSkills));
}

// Invalidate sessions so they pick up skill changes on next message
function invalidateSessions() {
  sessions.clear();
}

// History persistence
function loadHistory(id) {
  const f = join(HISTORY_DIR, id + ".json");
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { messages: [], model: null, title: null };
}
function saveHistory(id, data) { writeFileSync(join(HISTORY_DIR, id + ".json"), JSON.stringify(data, null, 2)); }
function listHistories() {
  try {
    return readdirSync(HISTORY_DIR).filter(f => f.endsWith(".json"))
      .map(f => { try { return { id: f.replace(".json",""), ...JSON.parse(readFileSync(join(HISTORY_DIR, f), "utf8")) }; } catch { return null; } })
      .filter(Boolean).sort((a, b) => new Date(b.lastActive || 0) - new Date(a.lastActive || 0));
  } catch { return []; }
}

// MCP servers persistence
const MCP_FILE = join(HISTORY_DIR, "mcp-servers.json");
let userMcpServers = {};
try { if (existsSync(MCP_FILE)) userMcpServers = JSON.parse(readFileSync(MCP_FILE, "utf8")); } catch {}
function saveMcpServers() { writeFileSync(MCP_FILE, JSON.stringify(userMcpServers, null, 2)); }

const defaultMcpServers = {
  "microsoft-learn": { type: "http", url: "https://learn.microsoft.com/api/mcp", tools: ["*"] },
  "deepwiki": { type: "http", url: "https://mcp.deepwiki.com/mcp", tools: ["*"] },
};
// ADC connectors are exposed as MCP inside sandboxes. Auto-detect from:
// 1. ADC_MCP_ENDPOINT env var
// 2. /root/.copilot/mcp-config.json (auto-written by ADC Node Agent)
let adcMcpEndpoint = process.env.ADC_MCP_ENDPOINT || null;
if (adcMcpEndpoint) {
  defaultMcpServers["adc"] = { type: "http", url: adcMcpEndpoint, tools: ["*"] };
  console.log("🔌 ADC connector MCP enabled:", adcMcpEndpoint);
}
// Auto-load MCP servers from ADC config file (created when connections are attached)
const ADC_MCP_CONFIG = "/root/.copilot/mcp-config.json";
try {
  if (existsSync(ADC_MCP_CONFIG)) {
    const adcConfig = JSON.parse(readFileSync(ADC_MCP_CONFIG, "utf8"));
    if (adcConfig.mcpServers) {
      for (const [name, cfg] of Object.entries(adcConfig.mcpServers)) {
        if (!defaultMcpServers[name]) {
          defaultMcpServers[name] = { type: cfg.type || "http", url: cfg.url, tools: ["*"] };
          console.log(`🔌 ADC MCP [${name}]:`, cfg.url);
        }
      }
      // If adc connector found in config, set adcMcpEndpoint for system prompt
      if (!adcMcpEndpoint && adcConfig.mcpServers.adc) {
        adcMcpEndpoint = adcConfig.mcpServers.adc.url;
      }
    }
  }
} catch (e) { console.log("⚠️ Could not read ADC MCP config:", e.message); }

function getAllMcpServers() { return { ...defaultMcpServers, ...userMcpServers }; }

// Get or create SDK session (supports multi-agent routing)
async function getSession(id, model, agentRole) {
  const role = agentRole || "general";
  const sessionKey = `${id}:${role}`;
  if (sessions.has(sessionKey)) {
    const s = sessions.get(sessionKey);
    if (model && model !== s.model) {
      sessions.delete(sessionKey);
    } else {
      return s;
    }
  }

  const agents = getAllAgents();
  const agent = agents[role] || agents.general;
  const adcSection = adcMcpEndpoint
    ? "\n\nYou have ADC connector tools via MCP: Office 365 (send_mail, get_emails, reply_to_email, list_calendars, get_events), M365 Copilot (chat_copilot_conversation), and ADC sandbox management (create_sandbox, execute_command, deploy_app). Use them when the user asks about email, calendar, enterprise knowledge, or sandbox operations."
    : "";
  const cronSection = "\n\nYou can schedule recurring tasks. When the user asks to do something on a schedule (e.g., 'every morning at 9am'), create a cron job via POST /api/crons. You can also create watchers for monitoring (e.g., 'watch my inbox for emails from CEO') via POST /api/watchers.";

  // Memory-writing instructions — teach the agent how to use the memory system
  const memoryInstructions = `

## 🧠 Memory System — How to Remember

You have a structured memory system. Use it to learn and remember across sessions:

### Files you can write to:
- **identity/USER.md** — User preferences: name, timezone, communication style, tools they use. **Update immediately** when you learn any preference.
- **identity/MEMORY.md** — Long-term facts: important details, project context, recurring topics. Write here when you learn something durable.
- **memory/YYYY-MM-DD.md** — Daily journal: session notes, what was discussed, decisions made. Append here during conversations.
- **identity/SOUL.md** — Your personality: only edit if the user asks you to change your behavior.

### When to write memory:
- **First interaction**: Read identity/USER.md. If it has placeholder text like "(Not yet known)", proactively ask the user their name, timezone, and preferences, then update USER.md immediately.
- User mentions any preference (timezone, name, style, tools) → update USER.md right away
- User says "remember this" or "note that" → write to MEMORY.md
- You notice a pattern (user always asks for bullet points, prefers concise answers) → update USER.md
- At natural conversation breaks → append a brief note to today's daily log
- Before saying goodbye → summarize the session in today's daily log

### How to write:
Use your filesystem tools to read/write these files at: /home/user/.personal-agent/identity/ and /home/user/.personal-agent/memory/`;

  const sdkSession = await copilot.createSession({
    model: model || "claude-opus-4.6",
    streaming: true,
    onPermissionRequest: approveAll,
    systemMessage: { content: agent.prompt + adcSection + cronSection + memoryInstructions },
    mcpServers: getAllMcpServers(),
    skillDirectories: [SKILLS_DIR, AGENTS_SKILLS_DIR],
    disabledSkills: disabledSkills,
    hooks: {
      onSessionStart: async () => {
        const memoryContext = buildMemoryContext();
        console.log(`[memory] onSessionStart: loaded ${memoryContext.length} chars of context for ${sessionKey}`);
        return { additionalContext: memoryContext };
      },
      onSessionEnd: async (input) => {
        try {
          const today = todayDate();
          const reason = input?.reason || "unknown";
          const timestamp = new Date().toISOString().slice(11, 19);
          let entry = `\n### Session ended (${timestamp}) — reason: ${reason}`;
          if (input?.finalMessage) {
            entry += `\nLast topic: ${input.finalMessage.slice(0, 200)}`;
          }
          appendDailyLog(today, entry);
          console.log(`[memory] onSessionEnd: appended to daily log (${today})`);
        } catch (e) { console.warn("[memory] onSessionEnd error:", e.message); }
      },
    },
    infiniteSessions: {
      enabled: true,
      backgroundCompactionThreshold: 0.80,
      bufferExhaustionThreshold: 0.95,
    },
  });

  const entry = { sdkSession, model: model || "claude-opus-4.6", role };
  sessions.set(sessionKey, entry);
  return entry;
}

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// Parse @agent prefix from message: "@email check my inbox" → { agent: "email", message: "check my inbox" }
function parseAgentRoute(message) {
  const m = message.match(/^@(\w+)\s+([\s\S]+)/);
  if (m && getAllAgents()[m[1]]) return { agent: m[1], message: m[2] };
  return { agent: "general", message };
}

// Chat — batch mode (fallback)
app.post("/api/chat", async (req, res) => {
  const { message, sessionId: reqId, model } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const { agent: agentRole, message: cleanMessage } = parseAgentRoute(message);
  const id = reqId || crypto.randomUUID();
  try {
    const { sdkSession, model: sessionModel, role } = await getSession(id, model, agentRole);

    let reply = "";
    const unsub = sdkSession.on("assistant.message_delta", (e) => { reply += e.data.deltaContent; });
    const response = await sdkSession.sendAndWait({ prompt: message }, 300000); // 5min — M365 Copilot calls are slow
    unsub();

    // Fallback: use sendAndWait return value if deltas didn't fire
    if (!reply && response?.data?.content) {
      reply = response.data.content;
    }

    const h = loadHistory(id);
    h.messages.push({ role: "user", content: message, time: new Date().toISOString() });
    h.messages.push({ role: "assistant", content: reply, time: new Date().toISOString() });
    if (!h.title) h.title = message.slice(0, 40);
    h.model = sessionModel;
    h.lastActive = new Date().toISOString();
    h.messages = h.messages.slice(-200);
    saveHistory(id, h);

    res.json({ reply, sessionId: id, model: sessionModel, mode: "copilot-sdk" });
  } catch (e) {
    res.status(500).json({ error: e.message, sessionId: id });
  }
});

// Active streaming sessions (for stop/cancel support)
const activeStreamSessions = new Set(); // sessionIds with active streams

// Chat — SSE streaming mode
app.post("/api/chat/stream", async (req, res) => {
  const { message, sessionId: reqId, model } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const { agent: agentRole, message: cleanMessage } = parseAgentRoute(message);
  const id = reqId || crypto.randomUUID();
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Session-Id": id,
  });

  activeStreamSessions.add(id);

  try {
    const { sdkSession, model: sessionModel, role } = await getSession(id, model, agentRole);
    res.write(`data: ${JSON.stringify({ type: "start", sessionId: id, model: sessionModel, agent: role })}\n\n`);

    let reply = "";
    const unsubs = [];
    unsubs.push(sdkSession.on("assistant.message_delta", (e) => {
      const delta = e.data.deltaContent;
      reply += delta;
      res.write(`data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`);
    }));
    unsubs.push(sdkSession.on("tool.execution_start", (e) => {
      console.log("[event] tool.execution_start:", e.data.toolName, e.data.mcpServerName || "");
      res.write(`data: ${JSON.stringify({ type: "tool_start", toolName: e.data.toolName, mcpServer: e.data.mcpServerName || null, mcpTool: e.data.mcpToolName || null })}\n\n`);
    }));
    unsubs.push(sdkSession.on("tool.execution_complete", (e) => {
      console.log("[event] tool.execution_complete:", e.data.toolCallId);
      res.write(`data: ${JSON.stringify({ type: "tool_end", toolName: e.data.toolCallId, success: e.data.success })}\n\n`);
    }));
    unsubs.push(sdkSession.on("skill.invoked", (e) => {
      console.log("[event] skill.invoked:", e.data.name);
      res.write(`data: ${JSON.stringify({ type: "skill_invoked", name: e.data.name })}\n\n`);
    }));

    const result = await sdkSession.sendAndWait({ prompt: message }, 300000);
    unsubs.forEach(u => u());

    // Fallback: if deltas didn't fire, use sendAndWait's return value
    if (!reply && result?.data?.content) {
      reply = result.data.content;
      res.write(`data: ${JSON.stringify({ type: "delta", content: reply })}\n\n`);
    }

    // Save history
    const h = loadHistory(id);
    h.messages.push({ role: "user", content: message, time: new Date().toISOString() });
    h.messages.push({ role: "assistant", content: reply, time: new Date().toISOString() });
    if (!h.title) h.title = message.slice(0, 40);
    h.model = sessionModel;
    h.lastActive = new Date().toISOString();
    h.messages = h.messages.slice(-200);
    saveHistory(id, h);

    res.write(`data: ${JSON.stringify({ type: "done", sessionId: id, model: sessionModel })}\n\n`);
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ type: "error", error: e.message, sessionId: id })}\n\n`);
    res.end();
  } finally {
    activeStreamSessions.delete(id);
  }
});

// Stop/cancel active stream — destroys the SDK session
app.post("/api/chat/stop", (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  // Destroy SDK session to interrupt sendAndWait
  let stopped = false;
  for (const [key, sdkSession] of sessions.entries()) {
    if (key.startsWith(sessionId + ":")) {
      sessions.delete(key);
      stopped = true;
    }
  }
  activeStreamSessions.delete(sessionId);
  res.json({ stopped });
});

// Sessions
app.get("/api/sessions", (req, res) => {
  res.json(listHistories().map(h => ({
    id: h.id, title: h.title || "Untitled", model: h.model,
    messageCount: (h.messages || []).length, lastActive: h.lastActive,
    active: sessions.has(h.id),
  })));
});
app.get("/api/sessions/:id", (req, res) => {
  const h = loadHistory(req.params.id);
  res.json({ id: req.params.id, ...h, active: sessions.has(req.params.id) });
});
app.delete("/api/sessions/:id", (req, res) => {
  sessions.delete(req.params.id);
  try { unlinkSync(join(HISTORY_DIR, req.params.id + ".json")); } catch {}
  res.json({ ok: true });
});
app.patch("/api/sessions/:id", (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });
  const h = loadHistory(req.params.id);
  h.title = title;
  saveHistory(req.params.id, h);
  res.json({ ok: true, id: req.params.id, title });
});

// Skills CRUD
app.get("/api/skills", (req, res) => res.json(listSkills()));

app.get("/api/skills/:name", (req, res) => {
  const dir = join(SKILLS_DIR, req.params.name);
  const file = join(dir, "SKILL.md");
  if (!existsSync(file)) return res.status(404).json({ error: "Skill not found" });
  const content = readFileSync(file, "utf8");
  const fm = parseSkillFrontmatter(content);
  // List all files in the skill directory
  const files = [];
  function walk(d, prefix) {
    try {
      readdirSync(d).forEach(f => {
        const full = join(d, f);
        const rel = prefix ? prefix + "/" + f : f;
        if (statSync(full).isDirectory()) walk(full, rel);
        else files.push(rel);
      });
    } catch {}
  }
  walk(dir, "");
  res.json({ name: fm.name || req.params.name, dir: req.params.name, description: fm.description || "", content, files, enabled: !disabledSkills.includes(req.params.name) });
});

app.post("/api/skills", (req, res) => {
  const { name, description, content } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const dirName = name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const dir = join(SKILLS_DIR, dirName);
  if (existsSync(dir)) return res.status(409).json({ error: "Skill already exists" });
  mkdirSync(dir, { recursive: true });
  const skillContent = content || `---\nname: ${name}\ndescription: ${description || "Custom skill"}\n---\n\n# ${name}\n\n${description || "Add your instructions here."}\n`;
  writeFileSync(join(dir, "SKILL.md"), skillContent);
  invalidateSessions();
  res.json({ ok: true, name: dirName });
});

app.put("/api/skills/:name", (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "content required" });
  const dir = join(SKILLS_DIR, req.params.name);
  if (!existsSync(dir)) return res.status(404).json({ error: "Skill not found" });
  writeFileSync(join(dir, "SKILL.md"), content);
  invalidateSessions();
  res.json({ ok: true });
});

app.delete("/api/skills/:name", (req, res) => {
  const dir = join(SKILLS_DIR, req.params.name);
  if (!existsSync(dir)) return res.status(404).json({ error: "Skill not found" });
  rmSync(dir, { recursive: true, force: true });
  disabledSkills = disabledSkills.filter(s => s !== req.params.name);
  saveDisabledSkills();
  invalidateSessions();
  res.json({ ok: true });
});

app.post("/api/skills/:name/toggle", (req, res) => {
  const name = req.params.name;
  if (disabledSkills.includes(name)) {
    disabledSkills = disabledSkills.filter(s => s !== name);
  } else {
    disabledSkills.push(name);
  }
  saveDisabledSkills();
  invalidateSessions();
  res.json({ ok: true, enabled: !disabledSkills.includes(name) });
});

// Install skill from community (npx skills add)
app.post("/api/skills/install", async (req, res) => {
  // Accept either a raw command string or structured { package, skill }
  let cmd;
  if (req.body.command) {
    // Raw command: strip leading "npx " if present, always prefix with "npx -y "
    let raw = req.body.command.trim();
    if (raw.startsWith("npx ")) raw = raw.slice(4).trim();
    if (!/^skills\s+add\s/.test(raw)) return res.status(400).json({ error: "Command must be: npx skills add <repo> [--skill <name>]" });
    // Force non-interactive: --scope project --method copy --yes
    if (!raw.includes("--scope")) raw += " --scope project";
    if (!raw.includes("--method")) raw += " --method copy";
    if (!raw.includes("--yes") && !raw.includes("-y")) raw += " --yes";
    cmd = `npx -y ${raw} 2>&1`;
  } else {
    const { package: pkg, skill } = req.body;
    if (!pkg) return res.status(400).json({ error: "Paste the full command, e.g.: npx skills add anthropics/skills --skill pdf" });
    cmd = skill
      ? `npx -y skills add ${pkg} --skill ${skill} --scope project --method copy --yes 2>&1`
      : `npx -y skills add ${pkg} --scope project --method copy --yes 2>&1`;
  }
  try {
    const output = execSync(cmd, { cwd: SKILLS_DIR, timeout: 120000, encoding: "utf8" });
    // SDK reads from AGENTS_SKILLS_DIR automatically — no relocation needed
    invalidateSessions();
    res.json({ ok: true, output: output.slice(-500), skills: listSkills() });
  } catch (e) {
    res.status(500).json({ error: "Install failed: " + (e.stderr || e.message).slice(0, 300) });
  }
});

// MCP servers CRUD
app.get("/api/mcps", (req, res) => {
  const all = getAllMcpServers();
  const result = Object.entries(all).map(([name, cfg]) => ({
    name, url: cfg.url, type: cfg.type || "http", builtin: !!defaultMcpServers[name],
  }));
  res.json(result);
});

app.post("/api/mcps", (req, res) => {
  const { name, url, type } = req.body;
  if (!name || !url) return res.status(400).json({ error: "name and url required" });
  userMcpServers[name] = { type: type || "http", url, tools: ["*"] };
  saveMcpServers();
  invalidateSessions();
  res.json({ ok: true, name });
});

app.delete("/api/mcps/:name", (req, res) => {
  if (defaultMcpServers[req.params.name]) return res.status(400).json({ error: "Cannot delete built-in MCP server" });
  delete userMcpServers[req.params.name];
  saveMcpServers();
  invalidateSessions();
  res.json({ ok: true });
});

// Models
app.get("/api/models", (req, res) => res.json(availableModels));

// ───────────────── Structured Memory API ─────────────────
// Legacy endpoint (backward compat) — reads/writes long-term memory
app.get("/api/memory", (req, res) => res.json({ content: loadIdentityFile(LONG_TERM_MEMORY_FILE) }));
app.put("/api/memory", (req, res) => {
  const { content } = req.body;
  if (typeof content !== "string") return res.status(400).json({ error: "content required" });
  saveIdentityFile(LONG_TERM_MEMORY_FILE, content);
  invalidateSessions();
  res.json({ ok: true });
});

// Identity files (soul, user, long-term memory)
app.get("/api/memory/soul", (req, res) => res.json({ content: loadIdentityFile(SOUL_FILE) }));
app.put("/api/memory/soul", (req, res) => {
  const { content } = req.body;
  if (typeof content !== "string") return res.status(400).json({ error: "content required" });
  saveIdentityFile(SOUL_FILE, content);
  invalidateSessions();
  res.json({ ok: true });
});

app.get("/api/memory/user", (req, res) => res.json({ content: loadIdentityFile(USER_PREFS_FILE) }));
app.put("/api/memory/user", (req, res) => {
  const { content } = req.body;
  if (typeof content !== "string") return res.status(400).json({ error: "content required" });
  saveIdentityFile(USER_PREFS_FILE, content);
  invalidateSessions();
  res.json({ ok: true });
});

app.get("/api/memory/long-term", (req, res) => res.json({ content: loadIdentityFile(LONG_TERM_MEMORY_FILE) }));
app.put("/api/memory/long-term", (req, res) => {
  const { content } = req.body;
  if (typeof content !== "string") return res.status(400).json({ error: "content required" });
  saveIdentityFile(LONG_TERM_MEMORY_FILE, content);
  invalidateSessions();
  res.json({ ok: true });
});

// Daily memory logs
app.get("/api/memory/daily", (req, res) => res.json({ logs: listDailyLogs() }));
app.get("/api/memory/daily/:date", (req, res) => {
  const content = loadDailyLog(req.params.date);
  res.json({ date: req.params.date, content });
});
app.post("/api/memory/daily/:date", (req, res) => {
  const { content } = req.body;
  if (typeof content !== "string") return res.status(400).json({ error: "content required" });
  appendDailyLog(req.params.date, content);
  res.json({ ok: true, date: req.params.date });
});

// Full memory snapshot (all identity + recent daily logs)
app.get("/api/memory/snapshot", (req, res) => {
  res.json({
    soul: loadIdentityFile(SOUL_FILE),
    user: loadIdentityFile(USER_PREFS_FILE),
    longTermMemory: loadIdentityFile(LONG_TERM_MEMORY_FILE),
    dailyLogs: listDailyLogs().slice(0, 7).map(date => ({ date, content: loadDailyLog(date) })),
  });
});

// ───────────────── Cron Jobs API ─────────────────
app.get("/api/crons", (req, res) => res.json(cronEntries));
app.post("/api/crons", (req, res) => {
  const { schedule, prompt, name } = req.body;
  if (!schedule || !prompt) return res.status(400).json({ error: "schedule (cron expression) and prompt required" });
  if (!cron.validate(schedule)) return res.status(400).json({ error: "Invalid cron expression: " + schedule });
  const id = name || `cron-${Date.now()}`;
  const entry = { id, schedule, prompt, enabled: true, createdAt: new Date().toISOString() };
  cronEntries.push(entry);
  saveCrons();
  startCron(entry);
  res.json({ ok: true, cron: entry });
});
app.delete("/api/crons/:id", (req, res) => {
  const idx = cronEntries.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Cron not found" });
  cronEntries.splice(idx, 1);
  saveCrons();
  if (cronJobs[req.params.id]) { cronJobs[req.params.id].stop(); delete cronJobs[req.params.id]; }
  res.json({ ok: true });
});
app.post("/api/crons/:id/toggle", (req, res) => {
  const entry = cronEntries.find(c => c.id === req.params.id);
  if (!entry) return res.status(404).json({ error: "Cron not found" });
  entry.enabled = !entry.enabled;
  saveCrons();
  if (cronJobs[entry.id]) { cronJobs[entry.id].stop(); delete cronJobs[entry.id]; }
  if (entry.enabled) startCron(entry);
  res.json({ ok: true, enabled: entry.enabled });
});

function startCron(entry) {
  if (!entry.enabled) return;
  cronJobs[entry.id] = cron.schedule(entry.schedule, async () => {
    console.log(`⏰ Cron [${entry.id}]: ${entry.prompt.slice(0, 60)}`);
    try {
      const cronSessionId = `cron-${entry.id}`;
      const { sdkSession } = await getSession(cronSessionId, null, "general");
      await sdkSession.sendAndWait({ prompt: entry.prompt }, 300000);
    } catch (e) { console.error(`Cron [${entry.id}] error:`, e.message); }
  });
}
function startAllCrons() { cronEntries.filter(c => c.enabled).forEach(startCron); }

// ───────────────── Heartbeat Watchers API ─────────────────
app.get("/api/watchers", (req, res) => res.json(watcherEntries));
app.post("/api/watchers", (req, res) => {
  const { prompt, intervalMinutes, name } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  const id = name || `watcher-${Date.now()}`;
  const entry = { id, prompt, intervalMinutes: intervalMinutes || 30, enabled: true, createdAt: new Date().toISOString() };
  watcherEntries.push(entry);
  saveWatchers();
  startWatcher(entry);
  res.json({ ok: true, watcher: entry });
});
app.delete("/api/watchers/:id", (req, res) => {
  const idx = watcherEntries.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Watcher not found" });
  watcherEntries.splice(idx, 1);
  saveWatchers();
  if (watcherIntervals[req.params.id]) { clearInterval(watcherIntervals[req.params.id]); delete watcherIntervals[req.params.id]; }
  res.json({ ok: true });
});

let watcherIntervals = {};
function startWatcher(entry) {
  if (!entry.enabled) return;
  watcherIntervals[entry.id] = setInterval(async () => {
    console.log(`👁️ Watcher [${entry.id}]: ${entry.prompt.slice(0, 60)}`);
    try {
      const watchSessionId = `watcher-${entry.id}`;
      const { sdkSession } = await getSession(watchSessionId, null, "general");
      await sdkSession.sendAndWait({ prompt: entry.prompt }, 300000);
    } catch (e) { console.error(`Watcher [${entry.id}] error:`, e.message); }
  }, (entry.intervalMinutes || 30) * 60 * 1000);
}
function startAllWatchers() { watcherEntries.filter(w => w.enabled).forEach(startWatcher); }

// ───────────────── Multi-Agent API ─────────────────
app.get("/api/agents", (req, res) => {
  const all = getAllAgents();
  res.json(Object.values(all).map(a => ({ name: a.name, prompt: a.prompt.slice(0, 200), builtin: !!a.builtin })));
});
app.post("/api/agents", (req, res) => {
  const { name, prompt } = req.body;
  if (!name || !prompt) return res.status(400).json({ error: "name and prompt required" });
  if (defaultAgents[name]) return res.status(400).json({ error: "Cannot override built-in agent" });
  customAgents[name] = { name, prompt };
  saveAgents();
  res.json({ ok: true, agent: { name, prompt: prompt.slice(0, 200) } });
});
app.delete("/api/agents/:name", (req, res) => {
  if (defaultAgents[req.params.name]) return res.status(400).json({ error: "Cannot delete built-in agent" });
  delete customAgents[req.params.name];
  saveAgents();
  res.json({ ok: true });
});

// ───────────────── Status API ─────────────────
app.get("/api/status", (req, res) => {
  const mcps = getAllMcpServers();
  const hasAdc = !!adcMcpEndpoint;
  res.json({
    userName,
    appName: `${userName}'s Personal Agent`,
    engine: "copilot-sdk",
    node: process.version,
    github: !!process.env.GH_TOKEN,
    adcMcp: hasAdc ? adcMcpEndpoint : null,
    mcpServers: Object.keys(mcps),
    skills: listSkills().length,
    models: availableModels.length,
    activeSessions: sessions.size,
    crons: { total: cronEntries.length, active: cronEntries.filter(c => c.enabled).length },
    watchers: { total: watcherEntries.length, active: watcherEntries.filter(w => w.enabled).length },
    agents: Object.keys(getAllAgents()),
    memorySize: loadIdentityFile(LONG_TERM_MEMORY_FILE).length,
    memorySystem: {
      soul: existsSync(SOUL_FILE),
      user: existsSync(USER_PREFS_FILE),
      longTermMemory: loadIdentityFile(LONG_TERM_MEMORY_FILE).length,
      dailyLogs: listDailyLogs().length,
      infiniteSessions: true,
    },
  });
});

// Debug — confirm skills/mcps loaded into session config
app.get("/api/debug/config", (req, res) => {
  const skills = listSkills();
  const mcps = getAllMcpServers();
  res.json({
    skillDirectories: [SKILLS_DIR, AGENTS_SKILLS_DIR],
    disabledSkills,
    skills: skills.map(s => ({ name: s.name, dir: s.dir, enabled: s.enabled })),
    mcpServers: Object.entries(mcps).map(([name, cfg]) => ({ name, url: cfg.url, type: cfg.type })),
    activeSessions: [...sessions.keys()],
  });
});

// Health
app.get("/health", (req, res) => {
  res.json({
    status: "ok", app: "personal-agent", engine: "copilot-sdk",
    userName, node: process.version, github: !!process.env.GH_TOKEN,
    adcMcp: !!adcMcpEndpoint,
    models: availableModels.length, activeSessions: sessions.size, savedSessions: listHistories().length,
    skills: listSkills().length, crons: cronEntries.length, watchers: watcherEntries.length,
  });
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🤖 ${userName}'s PERSONAL AGENT on http://0.0.0.0:${PORT}`);
  console.log("  Engine: Copilot SDK");
  console.log("  Node: " + process.version);
  try {
    availableModels = (await copilot.listModels()).map(m => m.id);
    console.log("  Models: " + availableModels.length + " available");
  } catch (e) {
    availableModels = ["claude-opus-4.6","claude-sonnet-4","gpt-5.1","gpt-4.1"];
    console.log("  Models: using defaults (listModels failed: " + e.message.slice(0,50) + ")");
  }
  console.log("  Default: claude-opus-4.6");
  console.log("  GitHub: " + (process.env.GH_TOKEN ? "✅" : "❌"));
  console.log("  ADC MCP: " + (adcMcpEndpoint ? `✅ ${adcMcpEndpoint}` : "❌ (no connectors)"));
  console.log("  Agents: " + Object.keys(getAllAgents()).join(", "));
  console.log("  Memory: identity/" + (existsSync(SOUL_FILE) ? "✅ SOUL" : "❌ SOUL") + " " + (existsSync(USER_PREFS_FILE) ? "✅ USER" : "❌ USER") + " " + (existsSync(LONG_TERM_MEMORY_FILE) ? "✅ MEMORY" : "❌ MEMORY"));
  console.log("  Daily logs: " + listDailyLogs().length + " | Infinite sessions: ✅");
  // Start background schedulers
  startAllCrons();
  startAllWatchers();
  console.log("  Crons: " + cronEntries.length + " loaded | Watchers: " + watcherEntries.length + " loaded");
});

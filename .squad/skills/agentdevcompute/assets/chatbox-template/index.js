/**
 * 💬 CHATBOX — ChatGPT-style AI powered by Copilot SDK.
 * 
 * Uses @github/copilot-sdk for proper session management, model selection, streaming.
 * Requires Node 24+. Run `npm run setup` to install.
 * 
 * Sessions persist: SDK manages conversation state, we save messages to disk.
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, rmSync, statSync, renameSync } from "fs";
import { execSync } from "child_process";
import { CopilotClient } from "@github/copilot-sdk";
import express from "express";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 80;
const HISTORY_DIR = "/home/user/.chatbox";
const SKILLS_DIR = "/home/user/.chatbox/skills";
try { mkdirSync(HISTORY_DIR, { recursive: true }); } catch {}
try { mkdirSync(SKILLS_DIR, { recursive: true }); } catch {}

if (process.env.COPILOT_GITHUB_TOKEN && !process.env.GH_TOKEN) {
  process.env.GH_TOKEN = process.env.COPILOT_GITHUB_TOKEN;
}

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

function getAllMcpServers() { return { ...defaultMcpServers, ...userMcpServers }; }

// Get or create SDK session
async function getSession(id, model) {
  if (sessions.has(id)) {
    const s = sessions.get(id);
    // If model changed, need new session
    if (model && model !== s.model) {
      sessions.delete(id);
    } else {
      return s;
    }
  }

  const sdkSession = await copilot.createSession({
    model: model || "claude-opus-4.6",
    streaming: true,
    systemMessage: { content: "You are ChatBox, a helpful AI assistant running in a secure ADC sandbox. You can write and execute code, create files, and run commands. You have access to Microsoft Learn and DeepWiki documentation via MCP. Be concise and helpful." },
    mcpServers: getAllMcpServers(),
    skillDirectories: [SKILLS_DIR],
    disabledSkills: disabledSkills,
  });

  const entry = { sdkSession, model: model || "claude-opus-4.6" };
  sessions.set(id, entry);
  return entry;
}

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// Chat — batch mode (fallback)
app.post("/api/chat", async (req, res) => {
  const { message, sessionId: reqId, model } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const id = reqId || crypto.randomUUID();
  try {
    const { sdkSession, model: sessionModel } = await getSession(id, model);

    let reply = "";
    const unsub = sdkSession.on("assistant.message_delta", (e) => { reply += e.data.deltaContent; });
    await sdkSession.sendAndWait({ prompt: message });
    unsub();

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

// Chat — SSE streaming mode
app.post("/api/chat/stream", async (req, res) => {
  const { message, sessionId: reqId, model } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const id = reqId || crypto.randomUUID();
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Session-Id": id,
  });

  try {
    const { sdkSession, model: sessionModel } = await getSession(id, model);
    res.write(`data: ${JSON.stringify({ type: "start", sessionId: id, model: sessionModel })}\n\n`);

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

    await sdkSession.sendAndWait({ prompt: message });
    unsubs.forEach(u => u());

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
  }
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
    cmd = `npx -y ${raw} -y 2>&1`;
  } else {
    const { package: pkg, skill } = req.body;
    if (!pkg) return res.status(400).json({ error: "Paste the full command, e.g.: npx skills add anthropics/skills --skill pdf" });
    cmd = skill
      ? `npx -y skills add ${pkg} --skill ${skill} -y 2>&1`
      : `npx -y skills add ${pkg} -y 2>&1`;
  }
  try {
    const output = execSync(cmd, { cwd: SKILLS_DIR, timeout: 60000, encoding: "utf8" });
    // npx skills add installs into .agents/skills/<name>/ — move to top-level
    const nested = join(SKILLS_DIR, ".agents", "skills");
    try {
      if (existsSync(nested)) {
        for (const d of readdirSync(nested)) {
          const src = join(nested, d);
          const dest = join(SKILLS_DIR, d);
          if (statSync(src).isDirectory() && !existsSync(dest)) {
            renameSync(src, dest);
          }
        }
      }
    } catch {}
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

// Debug — confirm skills/mcps loaded into session config
app.get("/api/debug/config", (req, res) => {
  const skills = listSkills();
  const mcps = getAllMcpServers();
  res.json({
    skillDirectories: [SKILLS_DIR],
    disabledSkills,
    skills: skills.map(s => ({ name: s.name, dir: s.dir, enabled: s.enabled })),
    mcpServers: Object.entries(mcps).map(([name, cfg]) => ({ name, url: cfg.url, type: cfg.type })),
    activeSessions: [...sessions.keys()],
  });
});

// Health
app.get("/health", (req, res) => {
  res.json({
    status: "ok", app: "chatbox", engine: "copilot-sdk",
    node: process.version, github: !!process.env.GH_TOKEN,
    models: availableModels.length, activeSessions: sessions.size, savedSessions: listHistories().length,
    skills: listSkills().length,
  });
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log("💬 CHATBOX on http://0.0.0.0:" + PORT);
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
});

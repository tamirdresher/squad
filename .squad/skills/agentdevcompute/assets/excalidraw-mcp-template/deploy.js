/**
 * 🎨 Excalidraw MCP — Deploy excalidraw-mcp to an ADC sandbox.
 * 
 * Clones https://github.com/excalidraw/excalidraw-mcp, builds, and starts.
 * Connect from VS Code, Claude, or ChatGPT via the sandbox URL /mcp.
 * 
 * Usage: node deploy.js   (requires `az login` first)
 *   Or: the skill's coding agent runs this automatically.
 */

import { AdcApi } from "../adc-api.js";
// NOTE: If you copy this file elsewhere, update the import path to wherever adc-api.js is located.

const REPO = "excalidraw/excalidraw-mcp";
const api = new AdcApi();

console.log("🎨 Deploying Excalidraw MCP to ADC sandbox...\n");

// Create sandbox
console.log("Creating sandbox...");
const sbx = await api.createSandbox({
  diskName: "copilot",
  ports: [{ port: 80, anonymous: true }],
  cpu: "2000m", memory: "4096Mi",
  labels: { name: "excalidraw-mcp" },
  lifecycle: { autoSuspendPolicy: { enabled: false } },
});
console.log("Sandbox:", sbx.id);

// Wait for running
while ((await api.getSandbox(sbx.id)).state !== "Running") {
  await new Promise(r => setTimeout(r, 2000));
}
console.log("Running!\n");

// Clone + build + start
console.log("Cloning " + REPO + "...");
await api.execShell(sbx.id, "npm config set strict-ssl false");
await api.execShell(sbx.id, "git clone https://github.com/" + REPO + ".git /home/user/mcp-app --depth=1 2>&1 | tail -1");

console.log("Installing dependencies...");
await api.execShell(sbx.id, "cd /home/user/mcp-app && npm install --ignore-optional 2>&1 | tail -3");

console.log("Installing Node 24 (required for excalidraw)...");
await api.execShell(sbx.id, "npm install -g n 2>&1 | tail -1 && n 24 2>&1 | tail -1");

console.log("Building...");
await api.execShell(sbx.id, "cd /home/user/mcp-app && npm run build 2>&1 | tail -3");

console.log("Starting server...");
await api.execShell(sbx.id, "cd /home/user/mcp-app && PORT=80 nohup /usr/local/bin/node dist/index.js > /tmp/excalidraw.log 2>&1 &");
await new Promise(r => setTimeout(r, 3000));

const health = await api.execShell(sbx.id, "curl -s http://localhost:80/mcp -X POST -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"method\":\"initialize\",\"id\":1,\"params\":{\"protocolVersion\":\"2025-03-26\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0\"}}}' 2>&1 | head -1");
console.log("MCP:", (health.stdout || "").trim().slice(0, 100));

const url = "https://" + sbx.id + "--80.proxy.azuredevcompute.io/mcp";
console.log("\n" + "=".repeat(60));
console.log("🎨 EXCALIDRAW MCP DEPLOYED!");
console.log("");
console.log("MCP URL: " + url);
console.log("");
console.log("Connect from VS Code (.vscode/mcp.json):");
console.log(JSON.stringify({ mcpServers: { excalidraw: { url } } }, null, 2));
console.log("");
console.log("Connect from Claude/ChatGPT:");
console.log("  Settings → Connectors → Add: " + url);
console.log("=".repeat(60));

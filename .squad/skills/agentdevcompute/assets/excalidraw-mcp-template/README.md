# 🎨 Excalidraw MCP — Draw diagrams in chat

Host the [excalidraw-mcp](https://github.com/excalidraw/excalidraw-mcp) server in an ADC sandbox. Connect from VS Code, Claude, or ChatGPT — draw hand-drawn diagrams inline in conversation.

## Prerequisites

- Any sandbox disk (`copilot` or `ubuntu`)
- Node 24+ (install in sandbox: `npm install -g n && n 24`)
- Port 80 exposed via Portal

## Deploy

### Step 1: Create a sandbox

Create a sandbox from the Portal (any disk works) or via `adc-api.js`:

```javascript
import { AdcApi } from "./adc-api.js";
const api = new AdcApi();
const sbx = await api.createSandbox({ diskName: "ubuntu", ports: [{ port: 80, anonymous: true }] });
```

### Step 2: Clone, build, and start

```bash
# Clone and build
git clone https://github.com/excalidraw/excalidraw-mcp.git /home/user/mcp-app --depth=1
cd /home/user/mcp-app
npm config set strict-ssl false
npm install --ignore-optional

# Install Node 24 (required)
npm install -g n && n 24

# Build and start
npm run build
PORT=80 /usr/local/bin/node dist/index.js
```

### Step 3: Expose port and connect

1. Go to Portal → sandbox → Ports → expose port 80
2. Connect from VS Code (`.vscode/mcp.json`):

```json
{
  "mcpServers": {
    "excalidraw": {
      "url": "https://<sandbox-id>--80.proxy.azuredevcompute.io/mcp"
    }
  }
}
```

3. Ask: *"Draw an architecture diagram of a web app"*

### Step 4: Snapshot

> **After verifying the MCP server works, ask the user:** "Everything looks good — want me to take a snapshot so you can restore to this state instantly?"
>
> ```javascript
> await api.createSnapshot(sandboxId, { name: "excalidraw-mcp-deployed" });
> ```

## Important

> **⚠️ Do NOT add authentication to the MCP server port.** MCP ports must be anonymous so that VS Code, Claude, and other MCP clients can connect without auth headers. The deploy script creates the port as anonymous — do not change this.

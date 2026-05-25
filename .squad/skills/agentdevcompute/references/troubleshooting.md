# Troubleshooting

## Sandbox Lifecycle

| Issue | Fix |
|-------|-----|
| Sandbox auto-suspends after 5 min | Default behavior. Disable via Portal (Lifecycle Policy → Auto-Suspend off) or API (`lifecycle.autoSuspendPolicy.enabled: false`) |
| Sandbox suspended unexpectedly | `await api.resumeSandbox(id)` — resume is sub-second from memory snapshot |
| Want longer idle timeout | Set `lifecycle.autoSuspendPolicy.interval` to higher value (seconds) via API or Portal |
| Sandbox keeps suspending with app running | Ensure app listens on `0.0.0.0` (not `localhost`) and port is exposed via `api.addPort(id, port)` |

## Authentication

| Issue | Fix |
|-------|-----|
| `Not authenticated` / auth error | Run `az login` first, then retry. Ensure Azure CLI is installed. |
| Token expired | Run `az login` again to refresh your session |

## Disk Images

| Issue | Fix |
|-------|-----|
| Disk stuck in `Creating` | Large images take time. Check: `await api.getDiskImage(id)` |
| Disk in `Error` state | Check error: `await api.getDiskImage(id)`. Common: invalid image name |
| Image not found | Ensure full image path (e.g., `mcr.microsoft.com/devcontainers/javascript-node:22`) |

## Sandboxes

| Issue | Fix |
|-------|-----|
| Sandbox not starting | Ensure disk is in `Ready` state first |
| Sandbox in `Error` | Check details: `await api.getSandbox(id)` |
| Can't connect to sandbox | Verify sandbox is `Running`: `await api.getSandbox(id)` |
| Command execution fails | Use `api.execShell(id, "bash -c 'your command'")` |

## Networking & Ports

| Issue | Fix |
|-------|-----|
| Port not accessible | Check `await api.listPorts(id)`. Ensure app listens on `0.0.0.0`, not `localhost` |
| HTTPS cert errors | ADC uses TLS MITM; root CA is auto-installed in sandboxes |
| Can't reach external API | Check egress policy. Ensure the host is allowed |
| `npm install` fails | Egress must allow `registry.npmjs.org`. Check portal egress settings |

## File Operations

| Issue | Fix |
|-------|-----|
| File upload fails | Ensure sandbox is `Running`. Check: `await api.getSandbox(id)` |
| Permission denied in sandbox | Files may need `chmod`. Run: `await api.execShell(id, "chmod -R 755 /path")` |

## Connections

| Issue | Fix |
|-------|-----|
| Connection not working | Verify in [ADC Portal → Connectors](https://portal.agentdevcompute.io/connectors) |
| OAuth expired | Re-authorize the connection in the portal |
| Credentials not injected | Ensure connection is associated with your sandbox/group |
| Wrong API being matched | Check the host pattern on your connection |

## MCP Server

| Issue | Fix |
|-------|-----|
| Client can't connect | Ensure port is exposed (`api.addPort(id, 3000, { anonymous: true })`) and server listens on `0.0.0.0` |
| Session errors | Each client needs its own session. Check `/mcp` endpoint is reachable |
| Tools not showing | Check server logs: `await api.execShell(id, "cat /tmp/mcp.log")` |

## SSH / Interactive Shell

| Issue | Fix |
|-------|-----|
| `ws` package not found | Run `npm install ws` before using `ssh.mjs` or `api.sshShell()` |
| Connection refused | Ensure sandbox is `Running` and you are logged in via `az login` |
| No output after connecting | Wait a moment — the shell may take a second to start |

## Agent

| Issue | Fix |
|-------|-----|
| Model API errors | Check `MODEL_API_URL` env var. Ensure egress allows the model endpoint |
| 401 from model API | Create a connection in the portal for the model provider |
| Agent not responding | Check health endpoint: `curl https://<sandbox-url>/health` |
| MCP tools not available | Set `MCP_SERVER_URL` env var to the MCP server's sandbox URL |

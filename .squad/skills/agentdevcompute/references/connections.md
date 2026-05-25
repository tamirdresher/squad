# Connections — Secure Credential Management

## Overview

ADC connections let your sandbox code access external APIs **without handling secrets**. Credentials are stored server-side and injected at the egress proxy boundary — your code never sees them.

## How It Works

```
┌─────────────────────────────────────────┐
│  ADC Sandbox                            │
│                                         │
│  fetch("https://api.github.com/repos")  │
│  // No Authorization header needed!     │
│                                         │
└───────────────┬─────────────────────────┘
                │ plain HTTP request
                ▼
┌─────────────────────────────────────────┐
│  Egress Proxy                           │
│                                         │
│  ✓ Match request to connection          │
│  ✓ Inject Authorization header          │
│  ✓ Forward to destination               │
│  ✓ Log for audit                        │
└───────────────┬─────────────────────────┘
                │ request + credentials
                ▼
         External API (GitHub, GitHub, Azure...)
```

## Creating a Connection

1. Go to [ADC Portal → Connectors](https://portal.agentdevcompute.io/connectors)
2. Click **Add Connection**
3. Choose a connector type:
   - **GitHub** — OAuth app for GitHub API access
   - **Microsoft 365** — OAuth for Graph API, Outlook, Teams
   - **Azure** — Managed identity or service principal
   - **Custom API Key** — Any API with key-based auth
4. Complete the authorization flow (OAuth redirect or enter API key)
5. Name your connection and associate it with a sandbox or sandbox group

## Connection Types

| Type | Auth Method | Use Cases |
|------|-------------|-----------|
| GitHub | OAuth | Repository access, PR creation, issue management |
| Microsoft 365 | OAuth | Email, calendar, Teams, SharePoint |
| Azure | Managed Identity | Storage, Cosmos DB, Key Vault |
| Custom API Key | Header injection | Any REST API with key auth |

## Associating with Sandboxes

Connections can be associated at two levels:

- **Sandbox level** — Connection available only to a specific sandbox
- **Sandbox group level** — Connection shared across all sandboxes in the group

## Security Properties

| Property | Description |
|----------|-------------|
| **Zero exposure** | Secrets never enter the sandbox VM |
| **Rotation** | Tokens are refreshed automatically (OAuth) |
| **Audit** | Every credential-injected request is logged |
| **Scope binding** | Connections are scoped to sandboxes/groups |
| **Revocation** | Delete a connection to immediately revoke access |

## Example: GitHub Connection

After creating a GitHub connection in the portal:

```javascript
// Inside your sandbox — no token needed!
const response = await fetch("https://api.github.com/user/repos", {
  headers: { "Accept": "application/vnd.github.v3+json" }
});
const repos = await response.json();
console.log(repos.map(r => r.full_name));
```

The egress proxy sees the request going to `api.github.com`, matches it to your GitHub connection, and injects the `Authorization: Bearer <token>` header automatically.

## Example: Custom API Key

For services that use API key authentication:

1. Create a **Custom API Key** connection in the portal
2. Enter: host pattern (`*.openai.com`), header name (`Authorization`), header value (`Bearer sk-...`)

```javascript
// Inside your sandbox
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: "gpt-4", messages: [{ role: "user", content: "Hi" }] })
});
```

The proxy injects the API key — your code never handles it.

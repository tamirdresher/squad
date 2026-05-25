# ADC Security Model

## Overview

ADC sandboxes are purpose-built for running untrusted code — especially code generated and operated by LLMs. The security model ensures that even if sandbox code is compromised, it cannot access secrets, escape the VM, or exfiltrate data undetected.

## 1. MicroVM Isolation (KVM)

Each sandbox runs in its own **microVM** with hardware-enforced isolation via KVM — the same technology used by AWS Lambda and Fargate.

| Property | Description |
|----------|-------------|
| **Hardware boundary** | KVM enforces memory isolation at the CPU level |
| **No shared kernel** | Each VM has its own kernel — no container escape risk |
| **No host access** | Guest code cannot access host memory, filesystems, or other VMs |
| **VMM security jail** | The hypervisor process runs with filesystem restrictions, syscall filtering, and dropped privileges — defense-in-depth against VMM bugs |

## 2. Zero-Trust Token Architecture

Real Azure tokens **never enter the sandbox**. Instead:

1. Sandbox code calls the standard Azure IMDS endpoint (`169.254.169.254`)
2. ADC intercepts the request and acquires the real Azure token
3. A **sandbox token** (a scoped, signed JWT) is returned instead
4. Sandbox code uses this token normally — Azure SDK works unchanged
5. When the code makes outbound API calls, ADC's egress layer swaps the sandbox token for the real token

```
Your code in sandbox          ADC Platform                 Azure
    │                            │                           │
    │ DefaultAzureCredential()   │                           │
    │──────────────────────────► │ Acquires real token       │
    │                            │─────────────────────────► │
    │ Sandbox token (safe)       │                           │
    │◄────────────────────────── │                           │
    │                            │                           │
    │ API call with sandbox token│                           │
    │────────────── ADC swaps ───┼── Real token injected ──► │
```

**What this means for you:**
- `DefaultAzureCredential` just works — no code changes
- If your code (or an LLM) leaks the token, it's useless outside the sandbox
- Tokens are scoped to the sandbox ID, signed, and time-limited

## 3. Egress Policy Enforcement

All outbound HTTP/HTTPS traffic from the sandbox passes through ADC's **egress proxy**:

| Feature | Description |
|---------|-------------|
| **Host allowlists** | Per-sandbox rules — only approved hosts receive traffic |
| **Default deny** | Configurable to block all outbound traffic unless explicitly allowed |
| **HTTPS inspection** | Encrypted traffic is inspected transparently (root CA auto-installed in sandbox) |
| **Audit trail** | Every outbound request is logged for security review |
| **Credential injection** | Connections from the Portal are attached at the egress boundary |

**What this means for you:**
- Your code makes normal HTTP calls — the proxy handles security
- If egress is blocked, you'll get a 403 with a reason
- `npm install` works (requires `npm config set strict-ssl false` for HTTPS inspection)

## 4. Connections — Secrets Never Touch the Sandbox

See [connections.md](connections.md) for full details.

- Credentials (OAuth tokens, secrets) are stored server-side in the [ADC Portal](https://portal.agentdevcompute.io/connectors)
- The egress proxy injects them into outbound requests at the network boundary
- Sandbox code makes plain HTTP calls — no `Authorization` header needed
- Even if LLM-generated code tries to exfiltrate credentials, there are none to find

## 5. Defense-in-Depth Summary

| Layer | What it protects | How |
|-------|-----------------|-----|
| Hardware isolation | Cross-VM escape, host access | KVM virtualization — each sandbox is a separate VM |
| VMM security | Hypervisor compromise | Filesystem restrictions + syscall filtering + privilege drop |
| Network isolation | Unauthorized outbound traffic | Egress proxy with per-sandbox allowlists |
| Token isolation | Token exfiltration | Sandbox tokens useless outside the sandbox |
| Credential isolation | Secret leakage | Connections injected at egress — never in sandbox |
| Audit | Undetected data exfiltration | All egress requests logged |

## Why This Matters for LLM-Generated Code

LLM agents generate and execute code at runtime. This creates unique risks:

1. **Prompt injection** — Malicious input causes the agent to run harmful code
2. **Credential exfiltration** — Generated code leaks credentials via HTTP or logging
3. **Scope creep** — Agent accesses resources beyond its intended scope

ADC addresses all three:
- **Prompt injection** → Code runs in an isolated VM; blast radius is contained
- **Credential exfiltration** → No credentials exist in the sandbox to leak
- **Scope creep** → Egress allowlists restrict what the agent can reach

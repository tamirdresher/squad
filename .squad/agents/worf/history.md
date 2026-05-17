# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad framework, Azure, Durable Tasks/DTD, cloud deployments, CI/security gates
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Worf owns security and reliability review for this Squad's work.

## Learnings

- Prior `tamresearch1` decisions include real credential-exposure handling and strict persistence expectations for behavior-changing directives.
- This team should never commit secrets and should preserve strong reviewer-gating behavior.
- ADC execution model security review: conditionally approve periodic ephemeral (Model 2, MVP) and webhook (Model 1, future) with 5 mandatory guardrails (G1: no secret interpolation, G2: HMAC validation, G3: Key Vault for secrets, G4: sandbox TTL + auto-suspend, G5: agent execution timeout). Explicitly reject long-lived sandbox loop (Model 3) — unbounded cost, no crash recovery, violates ADC's ephemeral design philosophy. Guardrails G1–G5 are P0-P1 blocking for any production issue processing.

## 2026-05-17T09:05:10.003+05:30 — ADC Squad Runner Demo Security Review Approved

**Approval Status:** Periodic ephemeral MVP (Model B) and future webhook adapter (Model 1) conditionally approved with mandatory guardrails G1–G5.

**Guardrails Mandated (P0-P1 Blocking for Production):**
- G1: No secret interpolation into shell commands; issue payloads written to files only
- G2: HMAC validation on GitHub webhook payloads (when implemented)
- G3: Azure Key Vault for storing GitHub token, ADC credentials, webhook secrets
- G4: Sandbox TTL enforcement (30 min auto-suspend on idle); prevents unbounded cost
- G5: Agent execution timeout (30 min suggested hard limit); prevents runaway task processing

**Model Rejection:** Long-lived continuous loop sandbox (Model 3) explicitly rejected — unbounded cost, no crash recovery, violates ADC's ephemeral-by-design philosophy.

**Implementation Path:** Guardrails apply before any live GitHub issue processing begins. Demo repo ready for validation phase pending Squad SDK fixes and ADC auth setup.


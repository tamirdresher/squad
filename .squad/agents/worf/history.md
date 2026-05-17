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


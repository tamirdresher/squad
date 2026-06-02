# Session Log: ADC-Squad Planning — 2026-05-14

**Timestamp:** 2026-05-14T10:55:11.623+05:30  
**Participants:** Data, Geordi, B'Elanna, Nick Greenfield (1:1 input)  
**Context:** Planning event-driven Squad runtime integration with Azure Developer CLI (ADC).

## Key Analyses

### Data — Squad Runtime/Invocation Changes for ADC
- Proposed: `squad run --event ... --once --json` CLI + SDK `runSquadEvent(...)`
- Keep watch loop for local compatibility (dev experience)
- Do not bake ADC/AFCP specifics into core — preserve platform neutrality

### Geordi — ADC/ACA Operating Model
- Avoid always-on HQ agents; prefer event-triggered jobs/sandboxes
- Persist artifacts, logs, and state durably
- Auth and Managed Identity are sharp edges (integration risks)
- Public samples must not assume private Fleet-MCP or Agency infrastructure

### B'Elanna — DTS Orchestration Model
- DTS is the execution substrate
- AFCP remains useful vocabulary and control-plane domain model
- Coordinator/subagent runs as explicit states with:
  - Leases (bounded execution)
  - Idempotency
  - Retries
  - Cancellation
  - Compensation
- State machines enable predictable cleanup and failure recovery

### Nick Greenfield 1:1 — Key Direction
- Polling keeps ADC/ACA sandboxes alive and fights the platform design
- Better pattern: send events to Squad → sandboxes spin up when needed → execute → spin down
- Aligns with cloud-native resource efficiency and event-driven principles

## Direction Summary

**Event-Driven Squad-on-ADC Model:**
- Squad receives events (from ADC/triggers/webhooks)
- Invokes `runSquadEvent(...)` in isolated sandbox
- Coordinator manages state/leases/retries
- Sandbox exits cleanly after work completes
- State and artifacts persisted to durable storage

**Not Baking Into Core:**
- ADC authentication and Managed Identity handled at integration layer
- AFCP remains vocabulary/control-plane model, not runtime requirement
- DTS substrate provides execution and state management
- Watch loop for local dev retained; event-driven for production cloud

## Next Steps

- Evaluate DTS-squad runtime integration points
- Design event schema and SDK contract
- Assess state persistence layer (blobs/queues/etc.)
- Share direction with broader team for alignment

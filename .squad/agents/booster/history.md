# BOOSTER

> Booster Systems Engineer

## Learnings

### CI Pipeline Status
149 test files, 3,931 tests passing, ~89s runtime. Only failure: aspire-integration.test.ts (needs Docker daemon — pre-existing, expected). publish.yml triggers on `release: published` event with retry logic for npm registry propagation (5 attempts, 15s sleep).

### Known CI Patterns
SKIP_BUILD_BUMP=1 environment variable intended to prevent version mutation during CI builds. Currently unreliable — bump-build.mjs ignores it in some code paths. NPM_TOKEN must be Automation type (not user token with 2FA) to avoid EOTP errors in publish workflow.

### Workflow Inventory
9 load-bearing workflows (215 min/month) must stay as GitHub Actions. 5 migration candidates (12 min/month) could move to CLI: sync-labels, triage, assign, heartbeat, validate-labels.

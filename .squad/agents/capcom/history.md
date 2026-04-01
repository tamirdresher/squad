# CAPCOM — History

> Knowledge base for the SDK Expert. Append-only, union-merged across branches.

## Learnings

### 2026-03-14: WSL Transient API Error Investigation (Issue #363)

**Context:** User reported "Request failed due to a transient API error" on Ubuntu WSL with Copilot CLI v1.0.4, eventually hitting rate limits.

**Investigation findings:**
- Squad SDK already implements robust retry logic with exponential backoff (1s → 2s → 4s)
- Retry logic in `adapter/client.ts:820-880` handles transient connection errors (ECONNREFUSED, ECONNRESET, EPIPE)
- Rate limit detection in `adapter/errors.ts:229-245` with retry-after awareness
- Error originates **upstream** from Copilot CLI/API platform, not Squad
- Copilot CLI v1.0.4 internal retry behavior triggers the rate limiting before Squad is invoked
- Squad only interacts with CLI via `@github/copilot-sdk` adapter after CLI is already running

**Key insight:** Squad SDK does NOT contribute to transient API errors or rate limiting issues. Our retry logic follows platform patterns and only applies to SDK connection errors, not upstream API instability.

**Outcome:**
- Confirmed this is an upstream platform issue (not a Squad bug)
- Recommended user check network connectivity, WSL configuration, and GitHub auth
- Created decision in `.squad/decisions/inbox/capcom-wsl-transient.md`
- Suggested documentation improvement: add WSL troubleshooting guide

**Pattern learned:** When investigating API errors, distinguish between:
1. **SDK adapter layer** (our retry logic) — handles connection errors only
2. **Copilot CLI layer** (upstream) — handles API communication and its own retries
3. **Copilot API platform** (upstream) — source of transient errors and rate limits

Squad operates at layer #1, so issues at layers #2-3 are outside our control.

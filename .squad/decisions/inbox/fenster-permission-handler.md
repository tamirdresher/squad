# Decision: CLI sessions use approve-all permission handler

**Date:** 2025-07-14
**Author:** Fenster (Core Dev)
**Issue:** #651

## Context

The Copilot SDK requires an `onPermissionRequest` handler when creating sessions. This handler was defined in our adapter types (`SquadSessionConfig`) but was never wired in the CLI shell's 4 `createSession()` calls. External users hit a raw SDK error with no guidance.

## Decision

All CLI shell session creation calls now pass `onPermissionRequest: approveAllPermissions`, a handler that returns `{ kind: 'approved' }` for every request. The CLI runs locally with user trust — there is no interactive permission prompt.

SDK consumers (programmatic API users) still control their own handler. The SDK's `createSession` in `adapter/client.ts` now catches the raw permission error and wraps it with a clear message explaining how to fix it.

## Impact

- **CLI users:** Error is gone. All permissions auto-approved (matches existing CLI trust model).
- **SDK consumers:** Better error message if they forget to pass `onPermissionRequest`.
- **Types:** `SquadPermissionHandler`, `SquadPermissionRequest`, `SquadPermissionRequestResult` are now exported from `@bradygaster/squad-sdk/client` for reuse.

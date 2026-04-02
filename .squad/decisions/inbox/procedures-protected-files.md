# Decision: Protected Files guardrail + Sweeping Refactor Rules

**Author:** Procedures (Prompt Engineer)
**Date:** 2026-07
**Status:** DECIDED

## Context

Commit `26047dc5` accidentally converted `detect-squad-dir.ts` from raw `node:fs` to `FSStorageProvider` during a sweeping StorageProvider abstraction refactor, breaking the insider build. Bootstrap utilities run before the SDK is loaded — SDK imports cause startup crashes.

EECOM fixed the code and added regression tests. Flight identified 4 additional zero-dependency bootstrap files. Procedures added preventive guardrails to Copilot instructions.

## Decision

### Protected Files section (`.github/copilot-instructions.md`)
- Lists 5 files that MUST only use Node.js built-ins: `detect-squad-dir.ts`, `errors.ts`, `gh-cli.ts`, `output.ts`, `history-split.ts`
- Explains the SDK/CLI package boundary — `core/` directory is bootstrap territory
- Placed after Git Safety, before Team Context (safety rule, not workflow)

### Sweeping Refactor Rules section
Added a 5-step checklist for codebase-wide pattern changes:
1. Check the protected files list
2. Scan for `— zero dependencies` header markers
3. Verify SDK barrel exports before adding imports
4. Never convert all files blindly
5. Test after each logical group

## Implications

- New bootstrap utilities must be added to the protected files table + get a regression test
- Sweeping refactors must follow the 5-step checklist
- Three defense layers: header markers → instructions list → regression tests
- The `core/` directory is flagged as extra-cautious territory

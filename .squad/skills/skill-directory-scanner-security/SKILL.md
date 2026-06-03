---
name: skill-directory-scanner-security
domain: security
audience: [worf, picard, geordi, data]
origin: ws:skill-discovery-paths review (2026-06-03)
status: earned
---

# Skill-Directory Scanner Security Checklist

Use this checklist whenever Squad (or any agent platform) adds, expands, or refactors a scanner that walks user-controlled directories to surface "skill" / "plugin" / "instruction" files into agent prompts. Applies to **both** prompt-only governance rules AND runtime-enforced code.

## When to apply
- Adding a new skill-source path to the coordinator
- Implementing a runtime scanner that does `readdir` on a user path
- Reviewing any change that increases the number of directories scanned per spawn
- Writing the prompt language an LLM coordinator uses to decide what to attach

## The checklist

1. **Directory-name denylist (MUST):**
   - Null bytes (`\x00`) — anywhere in name
   - C0 control characters `\x00`–`\x1F`
   - DEL `\x7F`
   - Path separators: POSIX `/`, Windows `\`, parent-dir token `..`

2. **Homoglyph hardening (SHOULD):**
   - Fullwidth solidus `U+FF0F` (`／`)
   - Fraction slash `U+2044` (`⁄`)
   - Other Unicode separators NFC does NOT collapse to ASCII
   - Note: NFKC catches these but causes false-positive dedup of legitimate distinct skill names (ligatures, fullwidth digits). Prefer explicit denylist over normalization-form swap.

3. **Reparse-point / symlink handling (MUST on Windows):**
   - Skip POSIX symlinks
   - **Also** skip NTFS junctions (`mklink /J`) and other reparse points — `FILE_ATTRIBUTE_REPARSE_POINT` check, not just `IsSymbolicLink`
   - macOS aliases: not POSIX symlinks; `readdir` typically returns them as regular files or skips them — acceptable
   - WSL symlinks: `/mnt/`-based absolute paths are unaffected by skip rule — safe
   - Rationale to ship in user-facing docs: symlink-following enables traversal attacks (`../../.env`) and adds Windows-permission friction. Hardlinks are a safe alternative for monorepo skill sharing.

4. **Traversal depth (MUST):**
   - State the max depth explicitly (one level for skill-dir/SKILL.md convention)
   - LLMs without explicit depth limits may go arbitrarily deep

5. **Whitespace and zero-width normalization (SHOULD):**
   - Trim **leading AND trailing** whitespace
   - Also trim zero-width: ZWSP `U+200B`, ZWNJ `U+200C`, ZWJ `U+200D`, BOM `U+FEFF`

6. **Case normalization (MUST decide and document):**
   - Pick one consistent cross-platform behavior (case-insensitive recommended for routing identity)
   - Document that the choice is intentional regardless of underlying filesystem case sensitivity (Windows insensitive, Linux sensitive, macOS configurable)
   - Warn on case-mismatch dedup so users can observe it: `⚠ Skill '{name}' found in multiple paths (case-variant); using {winner-path}.`

7. **Windows reserved names (SHOULD):**
   - Reject `CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9` even on Linux scanners
   - Why: cross-platform repo portability — a skill checked in from Linux must work for Windows team members

8. **Personal-vs-project scope (MUST):**
   - If excluding personal paths on the grounds that "the runtime already injects them," **scope the claim to the specific runtime surface**: don't say "Copilot injects them," say "Copilot CLI injects them for CLI spawns."
   - Other surfaces (VS Code extension, JetBrains plugin, web) may not inject personal skills — flag the exclusion for re-review if Squad ever supports those surfaces.

## Governance-vs-runtime rule

When the only enforcement is an LLM prompt, the prompt must be **precise enough to serve as a spec** for a future runtime implementer. Two tests:

- Could a careful engineer ship a correct gate from this prompt alone, with no out-of-band questions?
- If the rule lives in a design doc but **not** in the shipped prompt, treat it as unshipped. Always grep the deployed artifact for the rule, not the design doc.

Mirror-invariant check (SHA-256 across template copies) tells you mirrors are in sync; it does **not** tell you the right content is in them. Both checks are needed.

## Origin

Captured during Worf's security review of the `skill-discovery-paths` workstream (`{TEAM_ROOT}/.squad/workstreams/active/skill-discovery-paths/decisions/inbox/worf-skill-discovery-review.md`, 2026-06-03), which expanded the coordinator's skill scan from 2 paths to 5 and surfaced exactly these gaps.

---
'@bradygaster/squad-cli': patch
---

Widen changelog-gate coverage for template and scaffolding paths

Previously, the changelog gate only required a changeset for `packages/squad-(sdk|cli)/src/` changes, so template and scaffolding updates under `packages/squad-(sdk|cli)/templates/`, `.squad-templates/`, top-level `templates/`, and agent charters under `.squad/agents/*/charter.md` could reach users with no release-note entry. This widens the gate to those paths so user-facing template and scaffolding changes are no longer silently omitted from release notes. Closes #1156.

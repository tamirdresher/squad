---
'@bradygaster/squad-cli': patch
---

Widen changelog-gate coverage for template and scaffolding paths

Previously, the changelog gate only required a changeset for `packages/squad-(sdk|cli)/src/` changes, so template and scaffolding updates under `packages/squad-(sdk|cli)/templates/`, `.squad-templates/`, and top-level `templates/` could reach users with no release-note entry. This widens the gate to those paths so user-facing template changes are no longer silently omitted from release notes. Closes #1156.

---
"@bradygaster/squad-cli": minor
"@bradygaster/squad-sdk": minor
---

Squad coordinator now scans all 5 official Copilot CLI project skill paths:
`.squad/skills/` > `.copilot/skills/` > `.github/skills/` > `.claude/skills/`
> `.agents/skills/` (in precedence order, dedup by directory name). Personal
paths (`~/.copilot/skills/`, `~/.agents/skills/`) are deliberately excluded
from explicit routing — Copilot CLI injects them ambiently. This closes a gap
where skills placed in `.github/skills/` (a common location alongside other
`.github/` tooling) were loaded by Copilot CLI but invisible to Squad's
coordinator-attached skill-aware routing.

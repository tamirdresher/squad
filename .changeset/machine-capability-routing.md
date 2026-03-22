---
"@bradygaster/squad-sdk": minor
---

feat: Machine capability discovery and needs:* label-based issue routing

Added capability filtering to Ralph. Issues with needs:* labels are only
processed by Ralph instances with matching capabilities in machine-capabilities.json.

Closes #514

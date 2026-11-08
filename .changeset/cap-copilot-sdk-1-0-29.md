---
'@bradygaster/squad-sdk': patch
'@bradygaster/squad-cli': patch
---

The interactive shell and other Copilot features no longer fail with `ERR_PACKAGE_PATH_NOT_EXPORTED` after a fresh install, because `@github/copilot-sdk` is now held below 1.0.29, whose `vscode-jsonrpc` 10 dependency breaks the CLI's ESM import patch (#2414). This is a temporary cap until #2415 makes that patch conditional.

# Cross-Machine Message Schema (Ralph-R Protocol)

This schema defines the message format used when the Ralph-R coordinator exchanges information between the production repo and the research repo.

## Message Types

### `research:request`

Posted by the production repo when an issue is labeled `research:request`.

```json
{
  "type": "research:request",
  "source": {
    "repo": "owner/production-repo",
    "issue": 42,
    "url": "https://github.com/owner/production-repo/issues/42"
  },
  "payload": {
    "title": "Original issue title",
    "body": "Original issue body",
    "author": "github-username",
    "labels": ["research:request", "feature"]
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### `research:finding`

Posted by the research repo when findings are ready to report back.

```json
{
  "type": "research:finding",
  "source": {
    "repo": "owner/research-repo",
    "issue": 7,
    "url": "https://github.com/owner/research-repo/issues/7"
  },
  "target": {
    "repo": "owner/production-repo",
    "issue": 42
  },
  "payload": {
    "summary": "One-paragraph summary of findings",
    "recommendation": "go | no-go | needs-more-research",
    "artifacts": [
      {
        "type": "pr | branch | file | note",
        "url": "https://github.com/...",
        "description": "What this artifact is"
      }
    ]
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## Label Lifecycle

```
production issue:
  [unlabeled] → research:request → research:active → research:complete

research mirror issue:
  [opened] → research:active → research:report-back → [closed]
```

## Ralph-R Responsibilities

Ralph-R monitors both repos and is responsible for:

1. **Dispatch**: Detecting `research:request` labels and ensuring a mirror issue exists
2. **Status sync**: Keeping production issue labels current (`active` / `complete`)
3. **Report-back**: Summarizing research findings and posting them to the production issue
4. **Cleanup**: Closing mirror issues after findings are posted back

## Notes for Squad Agents

- All cross-repo messages are delivered via GitHub issue comments using the `CROSS_REPO_TOKEN` secret
- If the token lacks permissions, the workflow will fail silently — check Actions logs
- Ralph-R reads `.squad/cross-machine/SCHEMA.md` to understand message formats; keep this file up to date

---
timestamp: "{ISO-8601}"
action: "scan|draft|approve|edit|skip|post|halt|resume|delete|lint_failure|expire"
---

> All other fields are conditional on the action type. See **Conditional Fields** table below.
> Frontmatter includes `timestamp` and `action` universally, plus any action-specific required fields from the table.
> Include only the body sections relevant to your action type.

## Context (draft, approve, edit, skip, post, delete actions)
- Thread depth: {comment count}
- Response type: {welcome|troubleshooting|feature-guidance|redirect|acknowledgment|closing|technical-uncertainty|empathetic-disagreement|information-request}
- Confidence: {🟢|🟡|🔴}
- Long thread flag: {true|false}

## Draft Content (draft, edit, post actions)
{full draft text}

## Reviewer Notes (approve, edit, skip actions)
{any edits or comments from reviewer, or "—" if none}

## Post Result (post, delete actions)
{link to posted comment, or original URL if deleted}

## Conditional Fields

Not all fields apply to every action. The `outcome` value is contextual per action:

| Action | Required Fields | Outcome Value | Optional Fields |
|--------|----------------|---------------|-----------------|
| scan | timestamp, action | item count found (e.g., "5 candidates") | — |
| draft | timestamp, action, item_type, item_number, draft_id, confidence, draft_content | — (no outcome for draft) | thread_depth |
| approve | timestamp, action, draft_id, reviewer | "approved" | reviewer_notes |
| edit | timestamp, action, draft_id, reviewer, draft_content | "edited" | reviewer_notes |
| skip | timestamp, action, draft_id, reviewer | "skipped" | reviewer_notes |
| post | timestamp, action, item_number, draft_id, reviewer | "posted" + post_result link | — |
| halt | timestamp, action, reviewer (halter) | "halted" | reason |
| resume | timestamp, action, reviewer (resumer) | "resumed" | — |
| delete | timestamp, action, item_number | "deleted" + original URL | reason |
| lint_failure | timestamp, action, draft_id | violation details (free text) | — |
| expire | timestamp, action, draft_id | "expired" | — |

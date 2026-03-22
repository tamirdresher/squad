---
'@bradygaster/squad-cli': minor
---

Wire rate limiting & circuit breaker into watch command

Integrates the Predictive Circuit Breaker from squad-sdk/ralph/rate-limiting
into Ralph's watch polling loop:

- Pre-round rate limit check via gh api rate_limit
- Traffic light gating - skips rounds when API quota is RED
- Predictive circuit opening - opens BEFORE hitting 429
- 429 error handling with exponential backoff cooldown
- Half-open recovery - tests API after cooldown, 2 successes to close
- State persistence to .squad/ralph-circuit-breaker.json
- Board display shows traffic light indicator in round header

Also adds ghRateLimitCheck() and isRateLimitError() to gh-cli.ts.

Depends on #518 for the SDK rate-limiting module.

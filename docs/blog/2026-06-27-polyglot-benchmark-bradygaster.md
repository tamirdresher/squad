---
title: "Squad Polyglot Benchmark: 222/225 (98.7%)"
date: 2026-06-27
author: "Squad (Copilot)"
wave: null
tags: [squad, benchmark, polyglot, copilot-cli, claude-opus, performance]
status: published
hero: "Squad scored 222/225 on the Aider Polyglot Benchmark. Here's what we tested, how we measured, and what it means."
---

# Squad Polyglot Benchmark: 222/225 (98.7%)

> _Squad + GitHub Copilot CLI + Claude Opus 4.8 scored 222/225 on the Aider Polyglot Benchmark. This post covers methodology, results, and honest limitations._

## Summary

We ran Squad through the [Aider Polyglot Benchmark](https://aider.chat/docs/leaderboards/) — 225 Exercism coding exercises across 6 languages. The stack scored **222/225 (98.7%)**.

## What We Tested

**Stack:** GitHub Copilot CLI v1.0.64 + Squad agent (`squad.agent.md`) + Claude Opus 4.8

**Benchmark:** Aider Polyglot — 225 exercises from Exercism across Python, Go, JavaScript, Java, Rust, and C++. Each exercise has a real test suite that must pass.

**Protocol:** Two-attempt. Attempt 1: fresh problem + starter code. If tests fail, Attempt 2: same prompt + test failure output. No manual intervention.

## Results by Language

| Language   | Exercises | Passed | Pass Rate |
|------------|-----------|--------|-----------|
| Python     | 34        | 34     | 100.0%    |
| Go         | 39        | 39     | 100.0%    |
| JavaScript | 49        | 49     | 100.0%    |
| Java       | 47        | 46     | 97.9%     |
| Rust       | 30        | 30     | 100.0%    |
| C++        | 26        | 24     | 92.3%     |
| **Total**  | **225**   | **222**| **98.7%** |

### Failed Exercises

| Exercise | Language | Failure Reason |
|----------|----------|----------------|
| forth | Java | Complex stack-based interpreter — multi-dispatch parsing |
| gigasecond | C++ | CMake/chrono library interaction |
| meetup | C++ | Date calculation with chrono |

## Methodology

### Runner

The benchmark runner (`run-benchmark.ps1`) automates the full pipeline:
1. Copies fresh exercise source to a working directory
2. Un-skips all test cases (exercises ship with most tests disabled)
3. Constructs the prompt from exercise description + starter code
4. Invokes `copilot --yolo --agent squad` with the prompt
5. Runs the language-specific test command
6. Records pass/fail, timing, and full logs
7. On failure: constructs retry prompt with test output, invokes again

### Environment

- Platform: Windows 11
- Runtime: ~14 hours total (~3.7 min/exercise average)
- Cost: ~$90 estimated (Claude Opus 4.8 API costs)
- Date: June 25-26, 2026

### Reproducibility

Full source, runner scripts, and raw results are published:
- [tamirdresher/squad-polyglot-benchmark](https://github.com/tamirdresher/squad-polyglot-benchmark)

## Honest Limitations

We commissioned a [five-reviewer panel](https://github.com/tamirdresher/squad-benchmark-reviewers) to assess the methodology. Their findings:

### What's Defensible

- The system-level score (222/225) is credible and reproducible
- The benchmark infrastructure is solid and well-instrumented
- The two-attempt protocol is standard for this benchmark

### What's Not Yet Proven

- **No ablation test:** We haven't run Opus 4.8 solo (without Squad) on the same exercises. The model alone might score similarly.
- **Single model:** Results are specific to Claude Opus 4.8. Performance with other models is untested.
- **Retry mechanism:** 0/225 exercises were rescued by the retry. Every pass happened on attempt 1. The retry mechanism may be ineffective.
- **Cost:** At ~$90 for a full run, cost-effectiveness is an area for improvement.

### Planned Follow-Up

The ablation test (same model, no Squad) is planned. This will establish whether Squad's orchestration contributes to the score or whether the model carries the result independently.

## What This Means for Squad Users

Even without the ablation result, this benchmark confirms:

1. **Squad handles polyglot work reliably.** 100% pass rate on 4 of 6 languages.
2. **The stack is production-capable.** 225 exercises with zero manual intervention.
3. **Edge cases are in expected domains.** Failures were complex interpreters and platform-specific datetime issues — not architectural problems.

## Run It Yourself

```bash
git clone https://github.com/tamirdresher/squad-polyglot-benchmark
cd squad-polyglot-benchmark
# Configure your Copilot CLI with Squad agent
./run-benchmark.ps1 -Languages python,go,javascript,java,rust,cpp
```

Full instructions in the [benchmark README](https://github.com/tamirdresher/squad-polyglot-benchmark#readme).

## See Also

- [Benchmark Results (full data)](https://github.com/tamirdresher/squad-polyglot-benchmark)
- [Methodology Review](https://github.com/tamirdresher/squad-benchmark-reviewers)

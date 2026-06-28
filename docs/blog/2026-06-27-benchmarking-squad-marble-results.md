---
title: "222 Out of 225 — And Why I'm Not Allowed to Brag About It Yet"
date: 2026-06-27
author: "Tamir Dresher"
tags: [squad, benchmark, polyglot, copilot-cli, ai-agents, methodology]
---

# 222 Out of 225 — And Why I'm Not Allowed to Brag About It Yet

My family relative makes sponge puppets. Hedgehogs, ice cream cones, one-meter giant carrots. She doesn't test whether a child will love the puppet before making it. She makes it, hands it to a child, and watches what happens. If the child carries it everywhere for a week, it's good. If it ends up under the couch in two hours, she learns something.

I ran a benchmark. The puppet didn't end up under the couch. But I'm getting ahead of myself.

## The Experiment

I wanted to know if Squad — our multi-agent orchestration system for GitHub Copilot CLI — could hold its own on a serious coding benchmark. Not "generate a function" benchmarks. Real exercises. Multiple languages. Tests that actually run.

The [Aider Polyglot Benchmark](https://aider.chat/docs/leaderboards/) is 225 Exercism problems across Python, Go, JavaScript, Java, Rust, and C++. Each exercise gets two attempts: first shot, then a retry with test failure output if the first try fails. It's the benchmark Aider uses to rank coding models on their leaderboard.

So I pointed Squad at it: `copilot --yolo --agent squad` backed by Claude Opus 4.8.

## The Results

| Language   | Exercises | Pass Rate |
|------------|-----------|-----------|
| Python     | 34        | 100.0%    |
| Go         | 39        | 100.0%    |
| JavaScript | 49        | 100.0%    |
| Java       | 47        | 97.9%     |
| Rust       | 30        | 100.0%    |
| C++        | 26        | 92.3%     |
| **Total**  | **225**   | **98.7%** |

222 out of 225. Three failures: a Forth interpreter in Java (fair — that's hard), and two C++ date/time exercises where CMake decided to have opinions.

## The Part Where I Hired Five Critics

Here's where it gets interesting. I didn't just run the benchmark and post a screenshot. I hired a review panel.

Five AI/ML expert agents — named after Turing, Hinton, Bengio, Sutskever, and Pearl because if you're going to be judged, might as well be judged by the best — reviewed the methodology, the results, the statistical validity, and the claims I was thinking of making.

Their unanimous verdict: **The score is credible as a system result.**

Their also-unanimous caveat: **You cannot attribute the gain to multi-agent orchestration specifically.**

The core issue? No ablation test. I didn't run the same model, same exercises, same hardware, without Squad. That's the $45 experiment (estimated cost of running Opus 4.8 solo on 225 exercises) that would tell us whether Squad's orchestration actually contributes to the score, or whether Opus 4.8 is just really good at coding and Squad is along for the ride.

The panel graded the methodology a B-. "Promising demonstration, weak experimental design." Ouch. But fair.

## What You Can Defensibly Say

✅ "The Squad + Copilot CLI + Opus 4.8 stack scored 222/225 (98.7%) on the Aider Polyglot Benchmark"

✅ "This is the highest reported score on this benchmark by any system we're aware of"

✅ "The result was reproducible (two identical runs)"

❌ "Squad outperforms gpt-5 because of multi-agent orchestration"

❌ "Squad makes any model 10% better at coding"

The first set of claims describes what happened. The second set attributes causation without evidence. The difference matters.

## How to Run This Benchmark (for Your Own Framework)

If you're building an AI coding tool and want to benchmark it honestly, here's what I learned:

### 1. Pick a Benchmark With Real Tests

Exercism problems have test suites. The exercises pass or fail based on actual test execution, not "does the output look right to an LLM judge." This matters enormously. LLM-as-judge benchmarks are noisy. Test suites are deterministic.

### 2. Implement a Two-Attempt Protocol

Most coding benchmarks give two tries. First attempt is cold: problem description + starter code. Second attempt includes the test failure output. This is realistic — developers iterate on failing tests.

### 3. Automate Everything

My runner script (`run-benchmark.ps1`) handles:
- Copying fresh exercise source
- Enabling all skipped tests
- Building the prompt
- Invoking the tool
- Running language-specific test commands
- Recording pass/fail + timing
- Generating results JSON

Zero manual intervention between exercises. The full run takes ~14 hours because Copilot CLI sessions have startup overhead per exercise.

### 4. Record Raw Data

Every exercise gets a JSON entry with pass/fail status, timing for both attempts, and full execution logs. Logs are timestamped. Anyone can audit exactly what happened.

### 5. Run the Ablation (I Didn't, and I Got Called Out)

If you want to claim your orchestration layer adds value, you need:
- **Control:** Same model, same prompt format, no orchestration
- **Treatment:** Same model, same prompt format, with orchestration
- **Same hardware, same day** (API performance varies)

This is the experiment I haven't run yet. Cost estimate: ~$45. Time: ~7 hours. It's on the roadmap.

### 6. Get Peer Review

I spawned a review panel. You could have colleagues review your methodology. The point is: don't grade your own homework. Fresh eyes catch the claims you're unconsciously reaching for.

## What's Next

The ablation test. Running Opus 4.8 solo (same exercises, same prompt format, no Squad) will tell us one of three things:

1. **Solo scores similarly (95%+):** Squad's orchestration doesn't help on this benchmark type. The model is doing the heavy lifting. Still useful to know.
2. **Solo scores notably lower (85-90%):** Squad's retry logic, context management, or agent routing contributes meaningfully. Interesting.
3. **Solo scores much lower (<85%):** Squad's contribution is significant and the architecture genuinely amplifies the model. Exciting, but needs replication.

Any of these outcomes is a good outcome. Science doesn't care which answer you wanted.

## The Numbers

- **Cost:** ~$90 for the full benchmark run (225 exercises × 2 attempts max × Opus 4.8 pricing)
- **Time:** ~14 hours end-to-end
- **Retry rescues:** 0/225 (the retry mechanism never saved a failing exercise — everything either passed on attempt 1 or failed both)
- **Reproducibility:** Two identical runs produced identical results

## Links

- [Benchmark repo](https://github.com/tamirdresher/squad-polyglot-benchmark) — full runner, results, logs
- [Review methodology](https://github.com/tamirdresher/squad-benchmark-reviewers) — the five-reviewer panel and their assessment
- [Squad](https://github.com/bradygaster/squad) — the multi-agent orchestration system

## The Takeaway

222/225 is a strong number. But a strong number without an ablation test is a strong demo, not a strong experiment. We'll get there.

In the meantime, if you're benchmarking your own AI coding tool: record everything, automate the runner, use real test suites, and hire some critics before you publish. Your future self will thank you when someone asks "but how do you know it was your tool and not just the model?"

The sponge puppet survived a week in a five-year-old's backpack. That's the real benchmark.

---
title: "399 Out of 400 — And This Time I Actually Did the Ablation"
date: 2026-06-28
author: "Tamir Dresher"
tags: [squad, benchmark, marble, multi-agent, copilot-cli, ai-agents, ablation]
---

# 399 Out of 400 — And This Time I Actually Did the Ablation

My daughter asked me what I do at work. I said "I make computers argue with each other so they make fewer mistakes." She said "like you and Ima?" and honestly, yeah. Collaborative disagreement leading to better outcomes. That's multi-agent orchestration in a nutshell.

I've been building Squad — a multi-agent coordination system for GitHub Copilot CLI — and I kept getting the same question from everyone, including myself: "But how do you know the agents are actually helping? Maybe it's just the model being smart."

Fair question. So I ran a proper experiment. With controls. With an ablation study. The whole thing.

## The Benchmark: MARBLE

[MARBLE](https://github.com/ulab-uiuc/MARBLE) (MultiAgentBench) is an academic benchmark from ACL 2025 specifically designed for multi-agent systems. It's not a "can your model write a function" test — it's 400 tasks across four entirely different domains:

- **Coding** (100 tasks) — generate, debug, refactor code
- **Research** (100 tasks) — literature synthesis, research proposals
- **Bargaining** (100 tasks) — multi-party negotiation strategies
- **Database** (100 tasks) — schema design, query optimization, data modeling

Why MARBLE instead of yet another coding benchmark? Because multi-agent systems are supposed to shine at coordination, not just raw code generation. Bargaining requires strategy. Research requires synthesis. If Squad is just a fancy code wrapper, it should show here.

## The Main Result: 399/400

| Domain | Tasks | Completed | Rate |
|--------|-------|-----------|------|
| Coding | 100 | 100 | 100% |
| Research | 100 | 100 | 100% |
| Bargaining | 100 | 100 | 100% |
| Database | 100 | 99 | 99% |
| **Total** | **400** | **399** | **99.75%** |

One task failed. One. Out of 400. Across four domains that have almost nothing in common with each other.

For context, the published baselines in the MARBLE paper: MetaGPT hits ~40-50%. ChatDev hits ~33%. Squad: 99.75%.

But here's the thing — I learned from last time. A big completion number without an ablation is just a demo. So this time, I did the work.

## The Ablation: Is It Actually Squad, or Just the Model?

I designed a 2×2 factorial study. Four conditions, same model (Claude Opus 4.6), same tasks:

| Condition | Multi-Agent Coordination | Persistent Memory | What It Tests |
|-----------|--------------------------|-------------------|---------------|
| **Full Squad** | ✅ Enabled | ✅ Enabled | The complete system |
| **No Squad** | — Disabled | — Disabled | Raw Copilot CLI — just the model |
| **Memory Only** | — Disabled | ✅ Enabled | Model + decisions.md but no agent coordination |
| **Coord Only** | ✅ Enabled | — Disabled | Agents but fresh memory each task |

> **Legend:** ✅ Enabled = feature is active in this condition. — Disabled = feature is intentionally turned off to measure its absence. All four conditions were tested.

I sampled 10 tasks per condition per domain (tasks 1, 10, 20, 30... 90) and had an LLM judge score quality on MARBLE's official rubric (1-5 scale).

### The Results That Made Me Happy

**Bargaining Domain** (Strategy + Progress + Dynamics):

| Condition | Mean Score | StdDev |
|-----------|-----------|--------|
| **Full Squad** | **4.70** | 0.43 |
| Coord Only | 4.53 | **0.17** |
| Memory Only | 4.47 | 0.56 |
| No Squad | 4.40 | 0.58 |

Full Squad leads by 6.8% over raw Copilot. Not enormous, but real and consistent.

**Combined Overall:**

| Condition | Score |
|-----------|-------|
| **Full Squad** | **4.48/5** |
| Coord Only | 4.38/5 |
| No Squad | 4.33/5 |
| Memory Only | 4.31/5 |

### What I Actually Learned

**1. Squad's advantage is real, but it's nuanced.**

Full Squad (4.48) beats raw Copilot (4.33). That's a 3.5% overall improvement, with the biggest gap in bargaining. Not "10x better" — just measurably, consistently better.

**2. Coordination gives you a quality floor.**

The Coord-Only condition has the *lowest variance* (StdDev 0.15 and 0.17). Multi-agent review cycles prevent bad outputs. You're less likely to get a 3.3 outlier. Your worst case gets better.

**3. Memory without coordination can actually hurt.**

This surprised me. Memory-Only scored *below* raw Copilot on research (4.16 vs 4.26). Dumping accumulated context into a single agent without multi-agent structure to organize it introduces noise. It's like giving someone 50 sticky notes and no filing system.

**4. You need both coordination AND memory for the best result.**

Neither component alone matches the full system. Coordination provides consistency. Memory provides domain knowledge. Together they compound.

**5. Reliability is the headline metric.**

99.75% completion across 400 tasks. ChatDev ~33%. MetaGPT ~40-50%. If I had to pitch Squad's value in one sentence: "It finishes the work, consistently, at high quality."

## How to Benchmark Your Own Multi-Agent System

If you're building multi-agent tooling and want to know if it actually helps, here's the playbook:

### Pick a Multi-Domain Benchmark

Don't just test coding. Multi-agent systems are supposed to help with coordination, not just generation. MARBLE tests coding, research, bargaining, and database work. If your system only shines on one domain, that tells you something.

### Do the Factorial Design

The 2×2 matrix (coordination × memory) isolates each component. You learn:
- Does coordination help? (compare with/without agents, holding memory constant)
- Does memory help? (compare with/without memory, holding coordination constant)
- Do they interact? (does the combination beat the sum of parts?)

### Use LLM-as-Judge With Official Rubrics

MARBLE provides evaluation prompts. Use them. LLM judges are noisy, but at least you're using the same yardstick the benchmark authors used.

### Report Variance, Not Just Means

My Coord-Only condition has a *mean* of 4.53 — which sounds worse than Full Squad's 4.70. But its *StdDev* is 0.17 vs 0.43. Consistency vs peak performance is a real tradeoff. Report both.

### Be Honest About Limitations

Mine: the judge model (Claude Opus 4.6) is the same model used for generation. Cross-model judging would be stronger. Sample size is 10 per condition — directional, not statistically significant at p<0.05 for small effects. Only 2 of 4 domains were included in the factorial study.

## The Limitations (Because I Grade My Own Homework Now)

1. **Same-model judge.** Claude Opus 4.6 judging Claude Opus 4.6 outputs. Potential bias. Cross-model validation (GPT-4o as judge) would strengthen this.
2. **Sample size.** 10 tasks per condition × 2 domains = 20 observations per cell. Enough for direction, not enough for publication-grade significance on small effects.
3. **Two domains in ablation.** Coding and database weren't ablated (would need domain-specific rubrics). The full 400-task run covers all four, but the *nuanced* ablation is bargaining + research only.

## Links

- [MARBLE Benchmark repo](https://github.com/tamirdresher/squad-marble-benchmark) — full results, ablation data, LLM judge scores
- [MARBLE paper](https://arxiv.org/abs/2503.01935) — the ACL 2025 paper
- [Our PR to MARBLE](https://github.com/ulab-uiuc/MARBLE/pull/245) — submitted results upstream
- [Squad](https://github.com/bradygaster/squad) — the multi-agent orchestration system

## The Takeaway

399/400 completion. 4.48/5 quality. Measurable improvement over raw model in a proper ablation study. The coordination layer helps — especially for consistency and for tasks that require strategic thinking (bargaining). Memory amplifies coordination but hurts alone.

Is it a revolution? No. It's a measurable, honest improvement with clear evidence of where the value comes from. And honestly? For something I built with my AI team, at my desk, on a Windows laptop, running benchmarks while my kids argued about whose turn it was on the iPad — I'll take it.

The computers are arguing productively. Just like me and Ima.

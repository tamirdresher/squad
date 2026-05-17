# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad CLI/SDK, GitHub Copilot agent workflows, TypeScript/Node.js, Azure, Durable Tasks/DTD, AKS, ACA, ADC, AI agent frameworks, Clawpilot/m
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Picard was created to lead a Star Trek-themed Squad for developing Squad and adjacent distributed AI agent systems.

Seed sources:
- `C:\Users\tamirdresher\tamresearch1` — existing Star Trek squad patterns, broad research history, Tamir voice/content conventions.
- `C:\Users\tamirdresher\source\repos\squad` — Brady Squad repo / Squad SDK and CLI product conventions.
- `C:\Users\tamirdresher\source\repos\squad-squad` — this team state and future work.

## Learnings

- The team should preserve Squad's coordinator/dispatcher discipline: domain work is routed to specialists and reviewer rejections lock out the original author for that revision cycle.
- Tamir wants this Squad to focus on new Squad features, agent frameworks, Durable Tasks/DTD, Azure distributed systems, and Clawpilot/m.
- Periodic ephemeral ADC sandbox is optimal MVP for event-driven execution: operationally simple (no new Azure infra), naturally resilient to duplicate events, fully reversible to webhook adapter once managed identity token acceptance is verified. Architect for forward-compat: same ADC API calls (resumeSandbox + execShell + stopSandbox) work for both cron-triggered (MVP) and event-triggered (future) execution patterns.


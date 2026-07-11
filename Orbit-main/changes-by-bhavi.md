# Changes by Bhavi

Append one entry per prompt/session below, newest at the bottom. Use this template:

```
## [YYYY-MM-DD] — <short title>
**Prompt/ask:** what was requested
**Changes made:** files touched + what changed
**Why:** context/decision
```

---

## Scope

Bhavi owns the multi-agent research/orchestration track:

- Research Agent: competitor scan, market size, pricing benchmarks, pain-point signals (ORBIT.md Section 7, item 2)
- Agent-to-agent communication models underlying the whole roster — how Manager, Research, Legal, Brand, Build, Sales, Support, and Conflict Resolution agents pass structured context to each other (ORBIT.md Sections 6–7)
- Conflict Resolution Agent logic: arbitrating disagreements between agents (e.g. Marketing vs. Legal, Sales vs. margins) — the reasoning behind the arbitration, not the UI that displays it (ORBIT.md Section 7, item 8)
- Managed Agents cloud orchestrator (iAPI) — planning, delegation, shared multilingual context across agents and profiles (ORBIT.md Section 6)

## Interfaces owed to Preethesh & Deepthi (see progress.md → Integration Points)

- Research Agent output shape: schema for structured market/competitor data — needed for workflow + dashboard views
- Agent-to-agent conflict events — schema/log format needed for the Conflict Resolution feed UI

---

## [2026-07-11] — Orbit OS monorepo merged to main (branch `bhavii`, merged by Preethesh)
**Prompt/ask:** Bhavi pushed branch `bhavii`; Preethesh reviewed and merged it.
**Changes made:** New npm-workspaces monorepo under `packages/`: `client` (Vite + React app, warm beige theme, progressive unlocks UI), `server` (Express-style API with Gemini chat integration — `GEMINI_API_KEY` read from a local `.env`, not committed — plus Excel downloads and a budget refiner), `core` (shared types + schemas), and `orbit_secure_db.json` (local demo DB with the agent-communication log). Branch had no shared history with main, so it was merged with `--allow-unrelated-histories`; no file conflicts.
**Why:** First working implementation of the agent orchestration/server track. Note for cleanup: compiled artifacts (`*.js.map`, `*.d.ts`, `tsconfig.tsbuildinfo`, `App.js`) are committed alongside sources and should probably be gitignored; the repo now has three separate frontends (`landing/`, `workspace/`, `packages/client/`) that need consolidating.

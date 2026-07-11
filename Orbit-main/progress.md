# Orbit — Progress Tracker (Preethesh & Deepthi)

Team split across the project:

- **Ashish** — Gemma local vault, document ingestion (OCR), Antigravity code-editing automation. *(tracked in `changes-by-ashish.md`)*
- **Bhavi** — Research multi-agent models (agent-to-agent communication). *(tracked in `changes-by-bhavi.md`)*
- **Preethesh & Deepthi** — Landing page (all features), workspace platform, and the end-to-end workflow UI. *(tracked below)*

This file is the shared source of truth for what Preethesh and Deepthi are each building, so neither has to re-ask the other what's done. Update the status table whenever a task's state changes. Per-session detail (what changed and why) goes in `changes-by-preethesh.md` / `changes-by-deepthi.md`, not here.

---

## Task Split

### Preethesh — Landing page, onboarding, workflow visualization

- Marketing landing page covering all Orbit features: core insight, multilingual pitch, solo/team model, Antigravity continuous editing, privacy story (Gemma)
- Onboarding flow: Solo vs Team mode choice screen (Section 2 of ORBIT.md), team invite + role assignment UI
- Workflow/roadmap view: visualizes Step 0 → Step 9 (ORBIT.md Section 9) — Manager Agent roadmap, live step status per founder
- Founder-facing language selector + i18n plumbing for landing + onboarding + workflow pages (Section 3)

### Deepthi — Workspace platform (the dashboard)

- Workspace shell: navigation, per-profile switching, role-scoped permission UI (who sees what, per Section 2's sync table)
- Agent activity dashboard: live cards per agent (Research, Legal, Brand, Build, Sales, Support) with conversation view
- Conflict Resolution view: visible, auditable arbitration feed (Section 7, item 8)
- Antigravity edit-history / version rollback UI + edit-request approval flow (Section 5)
- Shared-context vs. private-vault indicator — what synced to the team vs. what stayed local to a profile (Section 2 table)

---

## Status Board

| Owner | Task | Status | Notes | Date |
|---|---|---|---|---|
| Preethesh | Landing page (all features) | Done (v1) | `landing/index.html` on branch `preethesh/landing-page` | 2026-07-11 |
| Preethesh | Onboarding: solo/team mode screen | Done (v1) | `landing/onboarding.html` | 2026-07-11 |
| Preethesh | Team invite + role assignment UI | Done (v1) | In `onboarding.html`; in-memory only, needs Ashish/backend wiring | 2026-07-11 |
| Preethesh | Workflow/roadmap visualization (Step 0–9) | Done (v1) | `landing/workflow.html`; statuses hardcoded, needs Manager Agent API | 2026-07-11 |
| Preethesh | Language selector + i18n plumbing | Done (v1) | `landing/assets/i18n.js` — EN/HI/TA, data-i18n contract | 2026-07-11 |
| Deepthi | Global UI theme / design system (tokens, type scale, motion presets) | Done | `workspace/` app scaffolded (Vite + React + TS + Tailwind + framer-motion); all pages must inherit from `workspace/src/theme/` | 2026-07-11 |
| Deepthi | Workspace shell + navigation + profile switching | Done (v1) | Sidebar nav, 3 mock profiles, role-scoped access (`workspace/src/components/Sidebar.tsx`) | 2026-07-11 |
| Deepthi | Agent activity dashboard | Done (v1) | 6 agent cards + conversation drawer, mock data (`views/AgentsView.tsx`) | 2026-07-11 |
| Deepthi | Conflict Resolution feed UI | Done (v1) | Arbitration feed w/ rulings (`views/ConflictsView.tsx`); needs Bhavi/Ashish event format | 2026-07-11 |
| Deepthi | Antigravity edit-history + rollback UI | Done (v1) | Version list, approve/deny/rollback local-state flow (`views/AntigravityView.tsx`); needs Ashish API | 2026-07-11 |
| Deepthi | Shared vs. private vault indicator | Done (v1) | Synced vs device-only panels, role-gated (`views/VaultView.tsx`); needs Gemma vault API | 2026-07-11 |

*(Update Status to "In progress" / "Done" as work happens; add a one-line Note + Date.)*

---

## Integration Points (interfaces with other tracks)

| Depends on | Owner | What's needed |
|---|---|---|
| Gemma vault API surface (what profile data, sync status, and privacy flags the UI can read) | Ashish | API/schema for reading profile scope, sync state, ingested-document status flags |
| Antigravity edit/version API (propose edit, list versions, rollback, approve/deny) | Ashish | API contract for the edit-history + approval UI |
| Research Agent output shape (structured market/competitor data) | Bhavi | Schema for rendering Research results in workflow + dashboard views |
| Agent-to-agent conflict events (what Conflict Resolution needs to display) | Bhavi (agents) + Ashish (Antigravity conflicts) | Event/log format for the Conflict Resolution feed |

---

## Unassigned / Remaining Work

Not yet owned by anyone — flagged here per the plan so the team can pick these up:

- Managed Agents cloud orchestrator (iAPI) wiring — the actual orchestration logic tying agents together
- Firestore shared-context store — schema + read/write layer for the multi-profile shared context
- Auth + team invite/sync backend (who can join a workspace, role enforcement server-side)
- Legal & Compliance Agent, Sales/GTM Agent, Support Agent — agent prompts/logic (distinct from Bhavi's inter-agent research models)
- Deployment/hosting pipeline for the generated multilingual sites
- End-to-end testing across the full Step 0–9 workflow

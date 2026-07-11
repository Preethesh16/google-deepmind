# Onboarding — Ashish (Code Support / Antigravity track)

Welcome! Your multi-agentic code system (code editing/building driven by customer feedback, Gemma-local) plugs into the **Code Support** slot we've already wired in the dashboard. This doc gets you from zero to merged.

## Repo

- SSH: `git@github.com:bhavi7711/Orbit.git`
- Web: https://github.com/bhavi7711/Orbit
- Ask Bhavi for collaborator access if you can't push.

## Setup (5 minutes)

```bash
git clone git@github.com:bhavi7711/Orbit.git && cd Orbit
npm install
cp packages/server/.env.example packages/server/.env
# → paste the real GEMINI_API_KEY into packages/server/.env
#   (Preethesh will DM it to you — it is NOT in the repo, and expires ~24h per key)
npm run build:core
npm run dev            # server on :5000, dashboard on :3000
```

Open http://localhost:3000 — you'll see the 7-agent dashboard. Your slot is the **Code** department in the sidebar.

## Where your work plugs in

| What | Where |
|---|---|
| Dashboard UI slot | `packages/client/src/App.tsx` — the `activeView === 'Code'` panel, marked `ANTIGRAVITY INTEGRATION SLOT` |
| Your agent's system prompt | `AGENT_SYSTEM_PROMPTS.code` in `packages/server/src/index.ts` — currently a stack-advice placeholder; replace with your real agent behavior |
| Your API endpoints | Create `packages/server/src/code.ts` and register it in `index.ts` exactly like `registerCreative()` does (`packages/server/src/creative.ts` is the pattern: hooks give you `getContext`, `getSharedContext`, `logAgentAction`) |
| Cross-agent shared memory | Every agent's prompt includes `getSharedAgentContext()` — the last 14 entries of `local_agent_communication_log` plus uploaded-doc summaries. Call `logAgentAction('code', 'ACTION_NAME', 'detail')` (passed via hooks) so the other agents see what your agent did |
| Customer-feedback docs | Founder uploads land in `packages/server/uploads/` with Gemini summaries in `uploads/index.json` — read these for your feedback-driven builds |
| Gemma-local pieces | The Gemma vault story lives in `ORBIT.md` Sections 4–5; the landing pages under `landing/` describe the founder-facing contract your track fulfills |

## Workflow rules

1. Branch as `ashish/<feature>`, merge to `main` via PR (or coordinate on the group before direct pushes — Deepthi, Preethesh, and Bhavi all push to main).
2. **Never commit**: `.env`, `dist/`, `*.tsbuildinfo`, or compiled `.js`/`.d.ts` next to `.tsx` sources. Compiled `App.js` once shadowed `App.tsx` in Vite and served a stale UI for hours — `.gitignore` now blocks these, don't override it.
3. Log every session in `changes-by-ashish.md` (it already has your scope + the interfaces you owe Preethesh & Deepthi's UI).
4. `packages/orbit_secure_db.json` is a local demo DB that mutates as you run — avoid committing noisy changes to it.

## Current agent roster (all real, Gemini-powered)

Research (Google-Search grounded) · Finance · Marketing (Nano Banana posters + Veo ad videos) · Creative (captions + TTS voiceover) · Deck (PPTX generator) · **Code (yours)** · Conflict (arbitration, blocks agents while disputes are active — your agent is subject to this gate too).

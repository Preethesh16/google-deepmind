# Changes by Deepthi

Append one entry per prompt/session below, newest at the bottom. Use this template:

```
## [YYYY-MM-DD] — <short title>
**Prompt/ask:** what was requested
**Changes made:** files touched + what changed
**Why:** context/decision
```

---

## [2026-07-11] — Repo docs bootstrapped
**Prompt/ask:** Turn the Orbit concept doc into project files, split landing/workspace/workflow work between Preethesh and Deepthi, and track progress.
**Changes made:** Created `ORBIT.md` (full plan), `progress.md` (shared tracker with task split), `changes-by-preethesh.md`, `changes-by-deepthi.md`.
**Why:** Establish a shared reference doc and a place to track who's doing what, so Preethesh and Deepthi don't have to re-explain context to each other or to future sessions.

## [2026-07-11] — Global UI theme / design system (branch: deepthi/workspace-theme)
**Prompt/ask:** As Deepthi, on a separate branch, set up the global UI theme only (no pages): strict color palette (cream #F7F5F1 bg, burnt orange #F0632A primary, etc.), Inter typography scale, style rules (radii, card style, spacing, buttons, icons), and framer-motion motion tokens — matching Preethesh's landing page aesthetic. Guided by the `ui-ux-pro-max` and `antigravity-design-expert` skills.
**Changes made:** Scaffolded `workspace/` (Vite + React + TypeScript, Tailwind v3, framer-motion). Created `workspace/src/theme/tokens.css` (CSS variables + base styles + `.card`/`.btn-primary`/`.btn-secondary`/`.tag`), `workspace/tailwind.config.js` (utilities mapped onto the CSS variables: colors, full type scale, `rounded-card/button/pill`, `shadow-card/lift`, section spacing, motion easings), `workspace/src/theme/motion.ts` (`fadeIn`, `slideUp`, `staggerContainer`, `hoverScale`, `hoverLift` — 0.35s easeOut entrances, 0.3s easeInOut hovers), `workspace/src/theme/index.ts` (JS token mirrors for charts), `workspace/src/theme/README.md` (conventions doc). `index.html` loads Inter 400–700; `main.tsx` wraps the app in `<MotionConfig reducedMotion="user">`; `App.tsx` is a token smoke-test placeholder only. Production build verified.
**Why:** Every future workspace page (agent dashboard, conflict feed, Antigravity history, vault indicator) must pull from one token source instead of ad-hoc values, and stay visually consistent with the landing page. Work kept off `main` per instruction — nothing merged until Deepthi says so.

## [2026-07-11] — Merged workspace theme into main
**Prompt/ask:** Pull latest main and merge `deepthi/workspace-theme` into it (merge explicitly authorized by Deepthi).
**Changes made:** Pulled main (picked up Preethesh's landing v1: `landing/` pages + i18n). Merged `deepthi/workspace-theme` → main (merge commit `eeb4930`); resolved a `progress.md` conflict by keeping Preethesh's Done rows and re-adding the Deepthi theme row. Pushed main to origin.
**Why:** Theme foundation needs to be on main so both tracks build on the same tokens; landing (`landing/assets/theme.js`) and workspace (`workspace/src/theme/`) now share the same palette, worth unifying later.

## [2026-07-11] — Workspace dashboard v1 (branch: deepthi/workspace-dashboard)
**Prompt/ask:** Build all five pending Deepthi tasks (the dashboard), no unnecessary changes.
**Changes made:** All in `workspace/src/`, everything on theme tokens, zero new dependencies. `data/mock.ts` — typed mock data shaped like the future Ashish/Bhavi API contracts (profiles w/ role scopes, agents + conversations, conflicts, versions, vault items). `components/icons.tsx` — small inline SVG icon set (no icon lib). `components/Sidebar.tsx` — workspace shell: nav (4 views), profile switcher (Founder/Co-founder/Marketing hire), role-scope indicator. `views/AgentsView.tsx` — 6 agent cards (status, stat, last activity) + slide-in conversation drawer; agents filtered by profile's role scope. `views/ConflictsView.tsx` — arbitration feed with vs-parties, detail, ruling, resolved/arbitrating status. `views/AntigravityView.tsx` — version timeline with live/pending badges; approve/deny/rollback flows (local state; approval buttons hidden for non-approver roles). `views/VaultView.tsx` — shared-context vs device-only panels with derived-fact lines; private vault gated by role. `App.tsx` — shell wiring (replaced the token smoke test). Typecheck + production build pass; verified live on the running dev server. `progress.md`: all five Deepthi rows → Done (v1).
**Why:** Ships Deepthi's whole track as a working v1 on mock data so the UI is reviewable now; each mock type is documented as the integration point to swap for Ashish's vault/Antigravity APIs and Bhavi's agent/conflict events. Kept on branch — not merged to main until Deepthi says.

## [2026-07-11] — Dev-server fix + landing↔workspace integration
**Prompt/ask:** Browser still showed the old smoke-test page; also make Preethesh's landing flow work together with the dashboard.
**Changes made:** `workspace/vite.config.ts` — (1) `usePolling` file watching: on WSL with the repo on `/mnt/d`, inotify events never fire, so Vite silently served stale code; (2) tiny middleware serving repo-root `landing/` at `/landing` so one dev server runs the whole product. `landing/workflow.html` — final CTA now says "Open your workspace" and links to `/` (the dashboard); rest of Preethesh's flow (index → onboarding → workflow) already chained via relative links and is untouched. `workspace/src/components/Sidebar.tsx` — small "Landing site →" link back to `/landing/`.
**Why:** Full journey now works at one URL: `/landing/` (marketing) → onboarding → workflow → `/` (workspace dashboard) — and dashboard back to landing. One-line edit to Preethesh's file was the minimal way to connect the two tracks.

## [2026-07-11] — Palette retuned to match landing (token values only)
**Prompt/ask:** Dashboard colors looked different from Preethesh's landing; match his theme without altering any code.
**Changes made:** Token *values* only — zero component/logic changes. `workspace/src/theme/tokens.css`: background `#F7F5F1`→`#FFF8F6` (landing `surface`), primary `#F0632A`→`#A53600` (landing `primary`), hover `#812800`, text `#1A1A1A`→`#261814` (landing `on-surface`), secondary text `#8A8580`→`#625E59` (landing `secondary`), border `#E8E4DE`→`#F2E0D8` (landing `outline-variant` at card weight). Mirrored in `theme/index.ts` and the theme README table.
**Why:** This is exactly what the token system was built for — a palette swap touches one file and the entire dashboard re-skins; landing and workspace now read as one product.

## [2026-07-11] — Sidebar logo matched to landing
**Prompt/ask:** The workspace logo differed from the landing page's; make them identical.
**Changes made:** `workspace/src/components/Sidebar.tsx` — logo block now uses the exact landing markup: orange circle + Material Symbols `orbit` glyph + extrabold "Orbit" wordmark (was a plain "O" initial + Orbit/Workspace two-liner). `workspace/index.html` — loads the Material Symbols Outlined font (same stylesheet the landing uses) and Inter 800 for the wordmark weight.
**Why:** One brand mark across landing and workspace.

## [2026-07-11] — Dashboard merged into main
**Prompt/ask:** Pull any new main changes, then merge Deepthi's dashboard work into main (authorized).
**Changes made:** Pulled main — picked up Bhavi's `packages/` monorepo (client/server/core, Gemini chat) and Preethesh's rewritten stateful `workflow.html`. Merged `deepthi/workspace-dashboard` → main (merge `6a7c380`): one conflict in `landing/workflow.html` (Preethesh had replaced the block holding the old dashboard CTA) — kept his new version and re-added an "Open your workspace dashboard" link at the end of his workspace roadmap section. Pushed to origin.
**Why:** Dashboard v1, WSL watcher fix, landing integration, palette + logo match are now shared with the team. Note: repo now has three frontends (`landing/`, `workspace/`, `packages/client/`) — Bhavi flagged the same; consolidation needed.

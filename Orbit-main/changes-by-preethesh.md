# Changes by Preethesh

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

## [2026-07-11] — Landing page v1 built (branch `preethesh/landing-page`)
**Prompt/ask:** Given an HTML design inspiration (warm orange Material-style theme), build Preethesh's whole track in one shot on a separate branch.
**Changes made:**
- `landing/index.html` — full marketing landing page: hero, dark dashboard mockup with live agent feed, multilingual showcase with working language toggle, 6-agent feature grid, document-ingestion section, continuous-improvement loop strip, integrations strip, CTA, footer. All branding is **Orbit** (inspiration said "Ordbit"; corrected). Hotlinked mockup images from the inspiration replaced with CSS-built mockups so the page has no external image dependencies.
- `landing/onboarding.html` — Solo vs Team mode choice (ORBIT.md Section 2); Team path reveals invite + role assignment UI (email + role, add/remove, in-memory list) and the syncs-vs-stays-local scope table; done state links to workflow.
- `landing/workflow.html` — Step 0 → 9 roadmap visualization (ORBIT.md Section 9) rendered from a JS STEPS array with done/active/queued status badges, ready to be fed later by the Manager Agent API.
- `landing/assets/theme.js` — shared Tailwind CDN config (colors/spacing/type from the inspiration design).
- `landing/assets/i18n.js` — i18n plumbing: `data-i18n` attribute contract, EN/HI/TA dictionaries, language selector auto-mounted into `#lang-selector`, choice persisted in localStorage. Same contract Gemma's on-device translation will replace later.
**Why:** Ships all five of Preethesh's tasks as a static, dependency-free v1 (Tailwind via CDN, no build step) so it can be opened directly in a browser and iterated on; the design follows the provided inspiration but with Orbit branding and self-contained assets.

## [2026-07-11] — Interactive workflow demo (`landing/demo.html`)
**Prompt/ask:** Preethesh wanted to try the Step 0–9 workflow with his own details (solo founder, clothing brand CAZ) — entering them in a form rather than a hardcoded dummy.
**Changes made:** `landing/demo.html` — intake form (name, email, brand, category, one-line idea, solo/team mode, optional unit cost) that generates a personalized workspace simulation: dark workspace header with masked email, Gemma vault banner, all 12 workflow cards streaming in one-by-one with Done/Live/Queued badges, pricing/margin computed from the entered unit cost, category-aware copy (clothing gets streetwear-specific research/conflict content), and a "Pending your approval" card with clickable Approve buttons (GST filing, launch kit, Antigravity edit). Runs fully client-side; the step data shape mirrors what the Manager Agent roadmap API will return, so it can be wired to live agents later without changing the rendering. Verified headlessly with Playwright (CAZ / ₹210 unit cost → ₹549 price, 62% margin, 12 steps, 3 approvals, no JS errors).
**Why:** Gives the team a tangible end-to-end demo of the product story to show and test against, before any backend exists.

## [2026-07-11] — Workflow page made stateful (no more pre-filled statuses)
**Prompt/ask:** Preethesh flagged that `workflow.html` showed hardcoded statuses (Steps 0–1 "Done", Step 2 "In progress") as if work already happened — he wanted to enter his own details and progress through steps himself.
**Changes made:**
- `landing/assets/store.js` — new shared localStorage state module (`orbit.workspace`: founder details + progress index) so progress survives reloads and can be shared across pages.
- `landing/workflow.html` — rewritten: with no saved workspace it shows an intake form (name, email, brand, category, idea, mode, unit cost); submitting counts as Step 0 and everything else starts Queued. The next step shows an "Up next" ring with a "Run this step" button; running it swaps the generic description for a personalized result (pricing/margin from unit cost, category-aware research/conflict content, masked email in header). Reset workspace button in navbar clears state.
- Verified with Playwright: fresh visit shows intake; creating CAZ workspace → 1/11; ran 3 steps → 4/11; reload persists at 4/11; reset returns to intake; no JS errors.
**Why:** Demo state was misleading — the roadmap must reflect the founder's actual progress, and the progress-driven rendering is the same contract the Manager Agent API will fill later.

## [2026-07-11] — Workflow intake reduced to name + Gmail only
**Prompt/ask:** Preethesh: drop category/brand/idea/cost from the intake — just name and Gmail; the business context will come from Ashish's Gemma vault/document-ingestion side.
**Changes made:** `landing/workflow.html` — intake form now has only name + Gmail with an info note that brand/idea/financials sync from the Gemma vault; `enrich()` fills vault-pending placeholders (workspace titled "<Name>'s workspace", "(idea pending — will sync from your Gemma vault)", fallback site URL, benchmark pricing) until the vault API exists. Verified with Playwright: 2-field form, all 10 remaining steps run without errors on placeholder context.
**Why:** Matches the real architecture — identity is the only thing the founder types; everything else is ground truth owned by the Gemma vault (Ashish's integration point, see progress.md Integration Points).

## [2026-07-11] — Real AI agent ecosystem: Gemini agents, creative studio, context upload
**Prompt/ask:** Preethesh provided a 24h Gemini API key. Replace Bhavi's mock agents with real ones: search-grounded research, cross-agent shared context, Nano Banana posters, ad videos, captions + voiceover, PPTX decks, finance support, trimmed dashboard with Code Support (Ashish) + context upload.
**Changes made:**
- `packages/server/src/index.ts` — `callGemini` upgraded to `gemini-3.5-flash` with key via header (from gitignored `.env`, never committed), optional Google Search grounding (Research/Marketing get live web data), and `getSharedAgentContext()`: last 14 cross-agent log entries + uploaded-document summaries injected into every agent prompt so agents know each other's work. Agent roster prompts rewritten for real-world build-and-scale advice. `DEPT_SEQUENCE` trimmed to 7 (both server and client).
- `packages/server/src/creative.ts` (new) — real endpoints: `/api/marketing/poster` (nano-banana-pro-preview, 2-3 options saved as JPEG), `/api/marketing/adkit` (Veo 3.1 fast → real MP4, storyboard fallback), `/api/creative/captions` (multilingual + VO script), `/api/creative/voiceover` (Gemini TTS → WAV), `/api/deck/generate` (Gemini content → pptxgenjs PPTX grounded in live agent context), `/api/context/upload` (file → local save → Gemini summary → shared agent memory). Assets served from `/generated`.
- `packages/client/src/App.tsx` — dashboard trimmed to 7 agents: Research, Finance, Marketing, Creative, Deck, Code (Ashish's Antigravity placeholder), Conflict. New panels: Poster & Ad Studio (prompt → image options → Veo video/storyboard), Caption & Voiceover Studio (with audio player), Investor Deck Builder (PPTX download), Code Support slot. Gemma vault panel gained context-file upload.
- Removed committed build artifacts (`App.js` etc. — they SHADOWED `App.tsx` in Vite's resolver, serving stale UI) and gitignored them + `*.tsbuildinfo` + `uploads/`.
**Verified end-to-end with Playwright + curl:** grounded research cites live market data; finance agent quotes the uploaded invoice; 2 real posters rendered; real 4.5MB Veo MP4 ad; Hinglish captions; TTS voiceover playing in an `<audio>` element; 10-slide PPTX downloaded; doc upload summarized into agent memory. Key expires in 24h — replace `packages/server/.env` after that.

## [2026-07-11] — Ashish onboarding: repo link, env template, Code-slot integration guide
**Prompt/ask:** Get Ashish (multi-agentic code system + Gemma, customer-feedback-driven builds) everything needed to merge his work into the Code section.
**Changes made:** `ONBOARDING-ASHISH.md` (repo links, 5-min setup, exact integration points — Code panel in App.tsx, `AGENT_SYSTEM_PROMPTS.code`, `registerCreative()` pattern for his endpoints, shared-memory logging, uploads location — plus workflow rules) and `packages/server/.env.example` (key template; real key shared privately, never committed).
**Why:** Key stays out of git per Preethesh's decision; the doc encodes the artifact-shadowing lesson so it doesn't happen again.

## [2026-07-11] — Dashboard retheme to match Bhavi's onboarding styling
**Prompt/ask:** Bhavi's latest commit rebuilt `workspace/` (port 3001) as a React onboarding flow using the landing-page orange theme, redirecting into the :3000 dashboard. Align the dashboard's styling with it — UI only, no agent-logic changes.
**Changes made:** `packages/client/src/App.tsx` + `index.css` — pure color-token swap from the old beige/gold theme to the landing theme Bhavi used: accent `#8c6d3b`→`#a53600` (hover `#812800`), gradients `#bca374`/`#c29f68`→`#cc490e`, surfaces `#f6f4ee`/`#fbfaf7`→`#fff8f6` and `#faf9f6`→`#fff1ec`, shadow tints from gold rgba to orange rgba, dark stone button gradients → primary orange gradients. Zero logic changes; typecheck clean; verified in browser — dashboard, sidebar, vault, and conflict center all render in the unified orange/cream palette.
**Why:** Landing (Preethesh), onboarding (Bhavi, :3001), and dashboard (:3000) now read as one product instead of two clashing themes.

## [2026-07-11] — Code section: chatbot removed, replaced with MVP action buttons
**Prompt/ask:** Remove the chat UI from the Code department; show "Build our MVP now" / "Fix your MVP software" buttons that log the request and refresh/redirect.
**Changes made:** `packages/client/src/App.tsx` — the Code view no longer renders the chatbot column; instead a centered panel with the two MVP buttons. Clicking logs the request to the vault (`mvp_build_request`/`mvp_fix_request`) and reloads the page; an `ANTIGRAVITY_URL` constant is ready for Ashish to point at his app, at which point the buttons redirect there instead. Side-panel copy updated. Verified with Playwright: chat input gone, both buttons render, click logs + refreshes back to Mission Control, no JS errors.
**Why:** The Code section is a handoff point to Ashish's Antigravity build system, not a chat surface.

## [2026-07-11] — Landing ↔ Bhavi's onboarding integrated into one funnel; StartupForge button
**Prompt/ask:** Integrate Preethesh's landing pages with Bhavi's React onboarding (workspace/, :3001); rename the Code section's "Build our MVP now" button to "StartupForge".
**Changes made:**
- `landing/index.html` — all 6 "Get Started" CTAs now point to `/?view=onboarding` (Bhavi's React onboarding, since the landing is served by her vite server at :3001/landing/).
- `workspace/src/App.tsx` — reads `?view=` on mount so the landing CTAs deep-link straight into the onboarding step (skipping her duplicate mini-hero); nav gained "Full site" (→ /landing/) and "Workflow" (→ /landing/workflow.html) links back into the static site.
- `packages/client/src/App.tsx` — Code section primary button renamed "Build our MVP now" → "StartupForge" (side-panel copy updated).
**Verified with Playwright:** :3001/landing/ serves the full landing; Get Started lands on "How are you building this?"; solo onboarding → ideation → launch triggers the backend and redirects to the :3000 dashboard; StartupForge button renders, old label gone, no JS errors.
**Why:** One continuous product funnel — landing (:3001/landing/) → onboarding (:3001) → agent dashboard (:3000) — instead of three disconnected UIs.

## [2026-07-11] — Removed the fake GDPR conflict that blocked all agents
**Prompt/ask:** Research query got blocked by the "Landing Page GDPR compliance validation check" dispute again. Fix it.
**Changes made:** `packages/server/src/index.ts` — the workspace-launch simulation seeded a hardcoded legal-vs-marketing GDPR conflict on every launch, re-blocking every agent each time someone completed onboarding. Removed the seeding (the Conflict Center and resolve API remain fully functional for real agent disputes); resolved the active instance. Verified: research chat answers normally, and a fresh execution trigger produces 0 active conflicts.
**Why:** Conflicts should come from actual agent disagreements, not a demo fixture that deadlocks the product after every onboarding.

## [2026-07-11] — Fix unstyled landing at :3001/landing (missing trailing slash)
**Prompt/ask:** Landing page UI broken at 3001/landing; fix only that.
**Changes made:** `workspace/vite.config.ts` — visiting `/landing` without the trailing slash made the pages' relative `assets/theme.js` + `assets/i18n.js` resolve against the site root and 404, so the page rendered unstyled with no i18n. The serve-landing middleware now 301-redirects `/landing` → `/landing/`. Verified: curl shows the 301, browser lands on `/landing/` with zero 404s and full styling.
**Why:** Both URL forms must work — people don't type trailing slashes.

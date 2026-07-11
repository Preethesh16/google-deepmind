# Orbit — The Autonomous Founder Operating System

**From "I have an idea" to "I have a live, tested, marketed, continuously-improving business" — one agent team, zero hired employees, in any language, solo or with a team.**

This is the next iteration of the original BuildOS concept, kept on the exact same validated architectural pattern — **Gemma as the local privacy gateway, Managed Agents as the cloud orchestrator** — now extended with three things real founders actually asked for: work in their own language, keep editing the product after launch (not just generate it once), and let a co-founder or early team join without starting from zero.

---

## 1. The Core Insight (updated)

The original insight still holds: a solo founder needs to be a researcher, lawyer, brand designer, developer, salesperson, and support agent all at once, and doing all six badly is worse than doing one well.

Three gaps became obvious once real founders tried the first version:

1. **Founders don't all think in English.** A founder in Coimbatore or Jaipur validating a spice business wants to read the market research, legal checklist, and landing page copy in Tamil or Hindi — and wants their *customers'* website to be multilingual too, not just the founder's dashboard.
2. **A business isn't "generated once."** The website, pricing page, and app aren't a one-time output — they need to keep changing as the founder gets feedback, as Legal clears new claims, as Sales learns what converts. A static handoff to a codegen pipeline goes stale in a week.
3. **Founders aren't always solo.** The moment a co-founder or first hire joins, all their private context — pricing conversations, drafts, legal docs — needs to sync into a shared vault without either person re-explaining the business from scratch.

Orbit answers all three without changing the core architecture: it's still Gemma protecting what's private, Managed Agents orchestrating what's collaborative — just with a translation layer, a persistent editing loop, and a multi-profile vault added on top.

---

## 2. Onboarding: Solo or Team

The very first screen a founder sees is a mode choice, because it changes how the vault behaves for the rest of the product's life.

```
┌─────────────────────────────────────────────┐
│              WELCOME TO ORBIT               │
│                                                │
│   How are you building this?                  │
│                                                │
│   [ Solo founder ]     [ With a team ]         │
└───────────────┬───────────────┬───────────────┘
                │                │
        ┌───────▼──────┐  ┌──────▼────────────────┐
        │ Single Gemma   │  │ Team Gemma Vault        │
        │ vault, single   │  │ (multi-profile)         │
        │ profile         │  │                          │
        │                 │  │ • Founder creates a       │
        │                 │  │   workspace, invites       │
        │                 │  │   co-founders/hires        │
        │                 │  │ • Each person gets their    │
        │                 │  │   own Gemma-protected        │
        │                 │  │   profile (role, access       │
        │                 │  │   scope, own device vault)     │
        │                 │  │ • Profiles sync into ONE        │
        │                 │  │   shared business context via    │
        │                 │  │   the cloud orchestrator, but      │
        │                 │  │   personal data (salary asks,       │
        │                 │  │   equity notes, individual DMs)      │
        │                 │  │   stays profile-local, never synced   │
        └─────────────────┘  └──────────────────────────────────────┘
```

**What a profile actually is:** a role (Founder, Co-founder, Ops hire, Marketer, etc.), a permission scope (what agents this person can talk to and what they can see — e.g. a marketing hire may see Brand/Sales agent output but not raw financials), and a personal Gemma vault on their own device.

**What syncs vs. what doesn't:**

| Syncs to shared team context | Stays profile-local (never synced) |
|---|---|
| Validated market research | Personal notes, private doubts |
| Legal/compliance status | Individual salary/equity discussions |
| Approved brand positioning | Draft messages not yet sent to team |
| Live product/pricing state | Any document a profile marks "private" |
| Agent conversation history relevant to the business | Personal identity documents (PAN/Aadhaar) |

Adding a team member later doesn't restart the business — they get read access to the shared context instantly (scoped by role) and start their own private vault from that point forward.

---

## 3. Multilingual Layer

Every agent in Orbit runs a language-detection-and-translation pass at both ends, handled locally by Gemma before anything leaves the device — so the founder never has to translate their own thinking, and customers never get a machine-translated-looking storefront.

- **Founder-facing:** the entire dashboard, agent conversations, legal checklists, and roadmap render in the founder's chosen language. A founder can type "Tamil-la spice business start pannanum" and get back a fully Tamil roadmap.
- **Customer-facing:** the Build Agent generates the actual website/app in multiple languages from a single source of positioning — not separate translated copies that drift out of sync, but one content model with locale variants that all agents (Brand, Sales, Support) read from.
- **Support Agent** answers customer questions in whatever language the customer writes in, using the same underlying product/legal/pricing truth regardless of language — so a Hindi-speaking customer and an English-speaking customer never get inconsistent answers about the same policy.
- **Gemma's role:** language detection and first-pass translation happen on-device, so raw customer messages (which can contain personal data — phone numbers, addresses) aren't sent to the cloud unnecessarily; only the scoped, translated intent goes to the relevant cloud agent.

---

## 4. Existing Document Ingestion — Gemma as a Real Financial/Legal Vault, Not Just a Data Store

Everything so far assumes the vault only holds data the *agents* generate — drafts, pricing the system produced. But most founders don't start from a blank slate: they already have bank statements, past ITRs, GST returns, invoices, incorporation certificates, ID scans. Gemma is where those go, and it's where they get turned into ground truth the whole system can actually use.

**How ingestion works (fully on-device):**

1. Founder uploads or scans existing documents directly into the local vault — ITR filings, bank statements, invoices, GST returns, incorporation certs, PAN/Aadhaar.
2. Gemma runs OCR/parsing **locally**, no cloud call, and extracts structured fields: revenue figures, expense categories, existing GST number and filing status, registration dates, ID details.
3. These extracted facts become part of the founder's private financial/legal ground-truth store — the same vault Antigravity and every agent already reference — seeded from real documents instead of only from conversation.

**What this unlocks, specifically on the financial/tax side:**

- **Legal & Compliance Agent** checks *actual* filing status against what's required — e.g. "your GST returns show you're already registered, no re-filing needed" — instead of assuming a blank slate every time.
- **Research Agent's** margin and pricing benchmarks get grounded in the founder's real cost structure, not industry averages.
- **Conflict Resolution Agent** arbitrating a Sales discount against margin limits uses the founder's real numbers, not a placeholder.
- Orbit can pre-fill draft filings — the next GST return, an updated Udyam entry — using the real historical documents as the base, ready for the founder to review and submit, rather than starting from zero each cycle.

**Privacy enforcement stays identical to the rest of the system:**

| Stays in Gemma (raw, on-device) | What syncs to cloud agents (derived only) |
|---|---|
| Actual bank statements, invoices | Nothing raw — ever |
| Full ITR/GST filings | A status flag: "GST registered, filings current" |
| PAN/Aadhaar scans | Nothing — identity never leaves the device |
| Line-item revenue/expenses | A derived figure: "gross margin ~34%" |

No cloud agent ever sees a raw document. They see the fact the document proves — nothing more.

---

## 5. Continuous Editing — Gemma Antigravity

The single biggest gap in the original version: the Build Agent generated a website *once*, then the founder was on their own for every change after that. Orbit closes that gap with **Gemma Antigravity** — a continuous, on-device-anchored build-and-edit loop instead of a one-shot generation step.

**How it works:**

1. The Build Agent's first output (landing page, MVP scaffold) is never treated as "done" — it's a live working tree that Antigravity keeps watching.
2. The founder can ask for a change in plain language, in any language ("make the hero section warmer, add a Tamil toggle, move pricing above the fold") and Antigravity translates that into real code edits, applies them, and redeploys — without a founder ever touching a codebase.
3. Every edit still passes through the same conflict-resolution discipline as the rest of Orbit: if a founder asks Antigravity to add a claim the Legal Agent hasn't cleared, the edit is flagged and routed to Conflict Resolution before it ships, not after.
4. Antigravity keeps a rolling, on-device-synced history of every version, so founders can roll back a change instantly — Gemma holds the version vault locally, and only the live, published state is mirrored to the cloud for hosting.
5. Because it's continuous rather than one-shot, the loop also runs proactively: if Sales Agent learns a pricing page phrase isn't converting, it can propose an edit to Antigravity, which drafts the change and asks the founder (or the relevant team profile) to approve it — the site keeps improving even when no one is actively "building."

This turns the Build Agent from a one-time generator into a standing team member — the "developer" who never actually leaves after the first deploy.

---

## 6. Full System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         FOUNDER(S)                                │
│   Solo, or Team — each with their own device & profile             │
│   "Organic spice subscription box for urban Indian households"      │
│   (typed in any language)                                             │
└───────────────────────────┬───────────────────────────────────────┘
                             │ one-line intent, any language
                             ▼
┌────────────────────────────────────────────────────────────────┐
│           GEMMA 4 — LOCAL VAULT + PRIVACY GATEWAY                  │  ← per-device, per-profile
│                                                                      │
│  • Holds: idea details, financials, personal ID docs, draft            │
│    contracts, pricing, raw customer messages                            │
│  • Ingests EXISTING documents (ITRs, GST returns, bank                   │
│    statements, invoices, incorporation certs) via on-device OCR           │
│  • Runs on-device language detection + first-pass translation             │
│  • Decides what scoped, anonymized, translated context each                │
│    cloud agent is allowed to see                                             │
│  • Hosts the Antigravity version vault (rollback history, local diffs)        │
│  • For team mode: syncs only the approved shared-context slice to the           │
│    cloud; keeps profile-private data local                                       │
│  • Keeps working fully offline; resyncs when connected                            │
└───────────────────────────┬───────────────────────────────────────────────────────┘
                             │ scoped, translated, anonymized context only
                             ▼
┌────────────────────────────────────────────────────────────────┐
│              MANAGED AGENTS ORCHESTRATOR (iAPI)                   │  ← cloud
│   Plans the roadmap → delegates → resolves conflicts → maintains    │
│   shared, multilingual context across every agent + every profile     │
└──┬─────────┬─────────┬─────────┬─────────┬─────────┬────────┬────┘
   ▼         ▼         ▼         ▼         ▼         ▼        ▼
[Research] [Legal]  [Brand/   [Build +   [Sales/   [Support] [Conflict
 Agent      Agent    Marketing  Antigravity GTM       Agent    Resolution
                      Agent]     Agent]      Agent]                Agent]
                             │
                             ▼
                  ┌───────────────────────┐
                  │  Live product surface   │
                  │  (multilingual website/  │
                  │   app), continuously        │
                  │   edited by Antigravity        │
                  └───────────────────────────────┘
```

---

## 7. The Agents — What Each One Does Now

1. **Manager Agent (the "COO")** — owns the roadmap end to end; the only agent every profile talks to directly for planning; now also arbitrates *which team profile* owns which next step.
2. **Research Agent** — validates the idea first: competitor scan, market size, pricing benchmarks, real pain-point signals — output rendered in the founder's chosen language.
3. **Legal & Compliance Agent** — incorporation structure, required registrations, drafts agreements; has veto power over Marketing and now also over Antigravity edits that touch public claims.
4. **Brand & Marketing Agent** — positioning, name options, brand voice, multilingual landing copy and channel plan, grounded in Research's findings.
5. **Build Agent + Gemma Antigravity** — generates the first working site/app, then keeps it continuously editable in plain language, any language, with every change conflict-checked before it ships.
6. **Sales/GTM Agent** — outbound scripts, cold email sequences, pricing page, live customer conversations in the customer's language; can propose Antigravity edits based on what's converting.
7. **Support Agent** — first-layer customer support in whatever language the customer writes, grounded in the real legal/product/pricing truth the rest of the team produced.
8. **Conflict Resolution Agent** — arbitrates every disagreement in the system: Marketing vs. Legal, Sales discounting vs. Finance margins (private, Gemma-held), and now also Antigravity edit requests vs. cleared claims — visible, auditable, on screen every time.

---

## 8. Tech Stack (updated)

| Layer | Technology |
|---|---|
| Local Agent / Vault | Gemma 4 (on-device, per-profile vault + privacy gateway) |
| Continuous Build/Edit | Gemma Antigravity (on-device-anchored, agentic code-edit loop) |
| Cloud Orchestrator | Managed Agents (iAPI) |
| Per-agent intelligence | Gemini for research/legal/marketing/support reasoning |
| Translation layer | On-device Gemma translation, locale-variant content model |
| Frontend | React dashboard — live agent-activity + edit-history visualization |
| Website/App generation | Antigravity-driven codegen pipeline, real HTML/React output |
| Local storage | Encrypted per-profile local DB (SQLite) — private vault + version history |
| Cloud storage/context | Shared context store (Firestore) — typed, structured, multi-profile, agent-to-agent |
| External data | Web search, GST/Udyam public data, competitor pricing sources |
| Team sync | Role-scoped context sync between per-profile Gemma vaults and the shared cloud context store |

---

## 9. End-to-End Workflow

**Step 0 — Onboarding.** Founder chooses Solo or Team. If Team, they invite co-founders/hires; each gets a role, a permission scope, and their own Gemma vault on their own device.

**Step 0.5 — Document ingestion (if the founder isn't starting from zero).** Existing ITRs, GST returns, bank statements, invoices, incorporation certs, or ID docs get uploaded straight into the local Gemma vault. Gemma OCRs and parses them on-device, extracting structured facts (revenue, filing status, existing registrations) that become ground truth for every downstream agent — without the raw documents ever leaving the device.

**Step 1 — Intent.** Founder types the one-line idea, in any language. Gemma detects the language, holds the raw input locally, and passes a scoped, translated version to the Manager Agent.

**Step 2 — Validation.** Manager Agent spawns Research Agent, which returns a structured, validated shape of the business (competitors, market size, pricing gap) — grounded in the founder's real financials if documents were ingested, and rendered back in the founder's own language.

**Step 3 — Parallel build-out.** Legal Agent determines registration/compliance requirements — checking actual filing status from ingested documents where available — in parallel with Brand & Marketing Agent drafting positioning and multilingual landing copy, both grounded in Research's output.

**Step 4 — Conflict resolution.** Wherever Marketing's claims outrun what Legal has actually cleared (e.g., "certified organic" before FSSAI registration), the Conflict Resolution Agent arbitrates in real time and reports the tradeoff to the Manager Agent, visibly.

**Step 5 — First build.** Build Agent + Antigravity generate the real, live, multilingual website/MVP from the reconciled positioning and legal constraints.

**Step 6 — Go-to-market.** Sales/GTM Agent drafts outbound and pricing — checked against real margin data from ingested financials where available — and starts real customer conversations in the customer's language, checked against what Legal has cleared.

**Step 7 — Live support.** Once customers exist, Support Agent handles first-layer questions in whatever language they write in, grounded in the same product/legal/pricing truth the rest of the team produced.

**Step 8 — Continuous improvement (ongoing, not a phase).** Antigravity keeps the product editable indefinitely — founder-requested changes, or agent-proposed changes (e.g. Sales noticing a phrase isn't converting) — every edit conflict-checked, versioned, and rolled back instantly if needed via Gemma's local vault.

**Step 9 — Team growth.** If a new team member joins at any point, their profile syncs into the existing shared context immediately (scoped by role); private data from other profiles — including ingested financial documents — never leaks to them, and their own private vault starts fresh from that point forward.

This loop never really ends — Orbit doesn't hand the founder a finished business and walk away; it stays on as the standing team, continuously validating, defending, marketing, building, selling, and supporting, in whatever language and with whatever team size the founder actually has.

---

## 10. The Pitch, In One Paragraph

63 million MSMEs and countless first-time founders in India lose months to the same five problems every time: they don't know if their idea is validated, they don't know what's legally required, their positioning is generic, their website goes stale the moment it's built, and they can't afford a real team to fix any of it. Orbit runs an actual team that does the work — with the same internal tension a real company has, resolved autonomously and transparently — in the founder's own language, editable forever instead of generated once, and ready to onboard a real co-founder the moment one shows up. Every sensitive number stays on the founder's own device via Gemma. It's not a business-plan chatbot. It's a company that runs itself, keeps improving itself, and grows with you.

---

## 11. Why This Beats the Original Version

- **Wider reach:** multilingual support opens Orbit to founders and customers who were structurally excluded by an English-only tool.
- **Real retention, not a one-time output:** Antigravity turns the product from "here's your website, good luck" into a standing relationship — the reason a founder keeps coming back.
- **Matches how businesses actually start:** almost no real company stays solo forever; the team/profile model means Orbit doesn't have to be rebuilt or re-explained the moment a co-founder joins.
- **Same proven architecture, no new risk:** Gemma still owns privacy, Managed Agents still owns orchestration, Conflict Resolution still owns arbitration — the new features extend the pattern instead of replacing it.

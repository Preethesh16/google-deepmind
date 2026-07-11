# Changes by Ashish

Append one entry per prompt/session below, newest at the bottom. Use this template:

```
## [YYYY-MM-DD] — <short title>
**Prompt/ask:** what was requested
**Changes made:** files touched + what changed
**Why:** context/decision
```

---

## Scope

Ashish owns the Gemma local vault and on-device automation track:

- Gemma 4 local vault: per-profile storage, privacy gateway, on-device language detection/translation (ORBIT.md Section 3)
- Existing document ingestion: on-device OCR/parsing of ITRs, GST returns, bank statements, invoices, incorporation certs, ID docs into structured ground-truth facts (ORBIT.md Section 4)
- Gemma Antigravity: continuous, on-device-anchored code-edit loop for the Build Agent's output — propose edit, apply, version, rollback (ORBIT.md Section 5)
- Privacy enforcement: ensuring only derived/scoped facts (never raw documents) cross from the local vault to cloud agents

## Interfaces owed to Preethesh & Deepthi (see progress.md → Integration Points)

- Gemma vault API surface: profile scope, sync status, ingested-document status flags — needed for the shared-vs-private vault indicator UI
- Antigravity edit/version API: propose edit, list versions, rollback, approve/deny — needed for the edit-history + approval UI
- Antigravity conflict events (edit requests vs. cleared claims) — needed for the Conflict Resolution feed

---

*(No entries yet — log here as work happens.)*

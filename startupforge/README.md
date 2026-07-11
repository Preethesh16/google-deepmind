# StartupForge

Build production-ready MVPs from a business profile using a local **Gemma** brain (via Ollama) and an **Antigravity / Gemini** code orchestrator, with live file streaming and auto-deploy.

## Architecture

```
User fills business profile →
Gemma (local, Ollama) compiles context →
User clicks "CREATE MVP" →
Backend sends context to Antigravity/Gemini API →
Files written to disk & streamed live to UI (Socket.io) →
Auto-deploy to Vercel (or local preview) →
Live URL returned
```

- `client/` — React + Vite + TypeScript + Tailwind onboarding wizard + control panel
- `server/` — Node.js + Express + Socket.io + better-sqlite3 + Ollama + Google GenAI
- `generated-mvps/` — output projects

## Prerequisites

```bash
# Ollama with a local Gemma model (you pulled gemma4:e2b)
ollama run gemma4:e2b

# Vercel CLI (optional, for auto-deploy)
npm install -g vercel
vercel login
```

## Setup

```bash
# Server
cd server
cp .env.example .env   # then edit values
npm install
npm run dev            # http://localhost:3001

# Client (new terminal)
cd client
npm install
npm run dev            # http://localhost:5173
```

## Notes

- `server/.env` is git-ignored. Put your `GOOGLE_API_KEY` there — never hardcode it.
- The default local model is set via `GEMMA_MODEL` in `server/.env`. Set it to whatever tag you pulled (e.g. `gemma4:e2b`).

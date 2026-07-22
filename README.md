# AI Product Workspace

This repository contains a collection of tools for turning an idea into a working digital product. It combines a workspace interface, backend services, automated project generation, feedback collection, and supporting experiments.

The system is designed around replaceable providers. Models, code-generation services, deployment platforms, and other integrations can be swapped without changing the overall workflow.

## Repository layout

- `Orbit-main/` — the main workspace application and its shared packages.
- `startupforge/` — a product-generation workflow with a web client and API server.
- `MultiVideo/` — supporting services for media and publishing workflows.

For details about an individual application, see its local README where available.

## Main capabilities

- Capture a product or business idea through a guided interface.
- Use configurable AI services to plan, generate, and improve project files.
- Stream progress and generated changes to the client in real time.
- Store project data and feedback locally or through a replaceable data layer.
- Preview or deploy generated applications using the hosting provider of your choice.

## Requirements

- Node.js 18 or newer
- npm
- API credentials for any optional external services you enable

## Run the workspace application

```bash
cd Orbit-main
npm install
npm run dev
```

The package scripts also support running the client and server independently:

```bash
npm run dev:client
npm run dev:server
```

## Run StartupForge

Install and start the server:

```bash
cd startupforge/server
cp .env.example .env
npm install
npm run dev
```

In a second terminal, start the client:

```bash
cd startupforge/client
npm install
npm run dev
```

Configure model, generation, and deployment providers through environment variables. Keep secrets in local `.env` files and never commit them.

## Development notes

- Keep provider-specific code behind service boundaries so integrations remain easy to replace.
- Use local preview/development modes when testing generated applications.
- Review generated files before deploying them to a public environment.
- Run the relevant package build command before opening a pull request.

## Status

This is an active prototype. The applications and integrations are evolving as workflows are tested and refined.

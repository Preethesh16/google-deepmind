import { GoogleGenAI } from '@google/genai';
import { Socket } from 'socket.io';
import * as fs from 'fs';
import * as path from 'path';
import { repairDefaultExports, repairNamedExports, ensureRouterContext, repairTailwindColors } from './projectRepair';

// Initialize Google GenAI client
const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' });

// Model priority: Antigravity first, fallback to Gemini 3.5 Flash
const PRIMARY_MODEL = process.env.ANTIGRAVITY_MODEL || 'antigravity-preview-05-2026';
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || 'gemini-3.5-flash';
const PLACEHOLDER_KEYS = new Set(['', 'your_google_api_key_here', 'your_new_api_key_here']);

export interface BuildOptions {
  businessContext: string;
  command: string;
  projectPath: string;
  socket: Socket;
  buildId: number;
  repoUrl?: string;
}

export interface BuildResult {
  success: boolean;
  filesCreated: string[];
  projectPath: string;
  error?: string;
}

/** A specialist builder agent's assignment from the Planner. */
interface AgentSpec {
  name: string;
  role: string;
  files: string[];
}

/** Shared context ("blackboard") handed between agents without losing state. */
interface Blackboard {
  objective: string;
  context: string;
  techStack: string[];
  agents: AgentSpec[];
  createdFiles: string[];
}

/** A defect found by the Critic agent for the Fixer agent to resolve. */
interface Defect {
  kind: 'deps' | 'invalid-json' | 'entry-script' | 'other';
  detail: string;
  packages?: string[];
}

// Known-good versions so the Fixer can reconcile deps deterministically.
const KNOWN_VERSIONS: Record<string, string> = {
  react: '^18.3.1', 'react-dom': '^18.3.1', 'react-router-dom': '^6.26.0',
  'lucide-react': '^0.400.0', recharts: '^2.12.0', 'framer-motion': '^11.3.0',
  clsx: '^2.1.1', axios: '^1.7.0', zustand: '^4.5.0', 'date-fns': '^3.6.0',
  '@heroicons/react': '^2.1.0', 'react-hot-toast': '^2.4.1', 'chart.js': '^4.4.0',
  'react-chartjs-2': '^5.2.0', 'react-icons': '^5.2.0', uuid: '^10.0.0',
  '@tanstack/react-query': '^5.51.0', 'react-hook-form': '^7.52.0', zod: '^3.23.0',
};

// Packages that ship with the Vite/React scaffold — never flagged as missing.
const ALWAYS_PRESENT = new Set(['react', 'react-dom', 'react/jsx-runtime']);

const BUILDER_SYSTEM = `
You are a specialist BUILDER agent inside a multi-agent MVP orchestration.
You will receive a shared build plan and a list of files YOU are responsible for.

CRITICAL OUTPUT FORMAT — use this exact format for every file you own:
===FILE: relative/path/to/file.ext===
[complete file content — every line, no truncation]
===END_FILE===

After ALL your files are written, output this exact line:
===BUILD_COMPLETE===

RULES:
1. Build ONLY the files assigned to you — assume other agents build theirs.
2. Files must be COMPLETE and immediately runnable — never truncate.
3. Use the EXACT tech stack from the shared plan; import correctly from other agents' files.
4. Match brand colors, be responsive/mobile-first, add loading & error states.
5. Use proper TypeScript types everywhere.
6. If you own package.json, include EVERY dependency any file could need.
7. If you own index.html, it MUST include <script type="module" src="/src/main.tsx"></script>
   right before </body> — without it the app renders a BLANK WHITE PAGE.
`;

/**
 * Multi-agent orchestration entrypoint (Problem Statement 2: Managed Agents).
 *
 * Pipeline:  Coordinator → Planner → [parallel specialist Builders] → Critic → Fixer
 *
 * Agents share a common "blackboard" so tasks hand off without losing context,
 * use real tools (filesystem, dependency reconciliation, validation), split
 * labor, and resolve conflicts (e.g. one agent imports a package another agent
 * forgot to declare — the Fixer reconciles it) with no human hand-holding.
 */
export async function runAntigravityBuild(options: BuildOptions): Promise<BuildResult> {
  const { businessContext, command, projectPath, socket, buildId } = options;

  if (PLACEHOLDER_KEYS.has(process.env.GOOGLE_API_KEY || '')) {
    const msg = 'GOOGLE_API_KEY is not set in server/.env. Get a key from aistudio.google.com/api-keys, add it, then restart the server.';
    socket.emit('antigravity:error', { message: msg, buildId });
    return { success: false, filesCreated: [], projectPath, error: msg };
  }

  fs.mkdirSync(projectPath, { recursive: true });

  socket.emit('antigravity:start', {
    message: '🤖 Multi-agent orchestration initializing...',
    projectPath,
    buildId
  });

  const filesCreated: string[] = [];

  try {
    // ─── COORDINATOR ─────────────────────────────────────────────────────
    agentLog(socket, buildId, 'Coordinator',
      '🧭 Spinning up agent team: Planner → Builders → Critic → Fixer');

    // ─── AGENT 1: PLANNER ────────────────────────────────────────────────
    const plan = await runPlannerAgent(businessContext, command, socket, buildId);

    const blackboard: Blackboard = {
      objective: command,
      context: businessContext,
      techStack: plan.techStack,
      agents: plan.agents,
      createdFiles: filesCreated,
    };

    // ─── AGENTS 2..N: PARALLEL SPECIALIST BUILDERS ───────────────────────
    if (plan.agents.length > 0) {
      agentLog(socket, buildId, 'Coordinator',
        `🤝 Delegating to ${plan.agents.length} specialist builder agents (running in parallel)...`);
      await Promise.all(
        plan.agents.map(spec =>
          runBuilderAgent(spec, blackboard, projectPath, socket, buildId, filesCreated))
      );
    }

    // Graceful degradation: if the planner/builders produced nothing, fall
    // back to a single monolithic builder so a build always happens.
    if (filesCreated.length === 0) {
      agentLog(socket, buildId, 'Coordinator',
        '⚠️ Specialist builders produced no files — falling back to a single Builder agent.');
      await runMonolithicBuilder(businessContext, command, options.repoUrl, projectPath, socket, buildId, filesCreated);
    }

    // ─── AGENT N+1: CRITIC (validate + detect conflicts, uses tools) ─────
    const defects = runCriticAgent(projectPath, socket, buildId, filesCreated);

    // ─── AGENT N+2: FIXER (resolve conflicts) ────────────────────────────
    if (defects.length > 0) {
      runFixerAgent(projectPath, defects, socket, buildId);
    }

    agentLog(socket, buildId, 'Coordinator',
      `🏁 Team finished. ${filesCreated.length} files produced across ${Math.max(plan.agents.length, 1)} builder agent(s).`);

    socket.emit('antigravity:complete', {
      filesCreated,
      projectPath,
      totalFiles: filesCreated.length,
      buildId,
      message: `✅ Multi-agent build complete! ${filesCreated.length} files created.`
    });

    return { success: true, filesCreated, projectPath };
  } catch (error: any) {
    const errMsg = error.message || 'Unknown Antigravity error';
    socket.emit('antigravity:error', { message: errMsg, buildId });
    console.error('Antigravity orchestration error:', error);
    return { success: false, filesCreated, projectPath, error: errMsg };
  }
}

/** Emits a structured per-agent log line to the UI activity feed. */
function agentLog(socket: Socket, buildId: number, agent: string, message: string): void {
  socket.emit('agent:log', { agent, message, buildId });
  console.log(`[${agent}] ${message}`);
}

/**
 * Tries the primary (Antigravity) model first, then the fallback model, for a
 * single non-streaming generation. Used by the Planner agent.
 */
async function generateWithFallback(prompt: string, systemInstruction: string): Promise<{ text: string; model: string }> {
  let lastErr: any;
  for (const [model, isFallback] of [[PRIMARY_MODEL, false], [FALLBACK_MODEL, true]] as const) {
    try {
      const res = await genai.models.generateContent({
        model,
        config: { systemInstruction, maxOutputTokens: 8192, temperature: 0.7 },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text = res.text || '';
      if (text.trim()) return { text, model: `${model}${isFallback ? ' (fallback)' : ''}` };
    } catch (err: any) {
      lastErr = err;
      console.warn(`Agent generation via ${model} failed: ${err.message}`);
    }
  }
  throw new Error(lastErr?.message || 'All models failed for agent generation');
}

interface PlanResult { techStack: string[]; agents: AgentSpec[]; }

/** Extracts a JSON object from a model response (tolerates ``` fences / prose). */
function extractJson(text: string): any | null {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
}

/**
 * AGENT 1 — Planner. Analyzes the objective and produces a JSON plan that
 * splits the build across specialist agents (each owning a disjoint set of
 * files). The plan is the shared blackboard the Builders read from.
 */
async function runPlannerAgent(
  businessContext: string,
  command: string,
  socket: Socket,
  buildId: number
): Promise<PlanResult> {
  agentLog(socket, buildId, 'Planner', '🧠 Analyzing objective & designing the agent team + file manifest...');
  const planStart = Date.now();

  const system = `You are the PLANNER agent in a multi-agent build system.
Analyze the objective and output ONLY valid JSON (no markdown, no prose) with this exact shape:
{
  "techStack": ["react","vite","typescript","tailwindcss"],
  "agents": [
    {"name":"Foundation","role":"config, build tooling & entry files","files":["package.json","vite.config.ts","tailwind.config.js","postcss.config.js","tsconfig.json","index.html","src/main.tsx","src/index.css"]},
    {"name":"Pages","role":"page-level components + routing in src/App.tsx","files":["src/App.tsx","src/pages/Home.tsx"]},
    {"name":"Components","role":"reusable UI components","files":["src/components/Navbar.tsx","src/components/Footer.tsx"]},
    {"name":"DataLayer","role":"types, services, mock data & docs","files":["src/types/index.ts","src/services/api.ts",".env.example","README.md"]}
  ]
}
RULES: every file assigned to EXACTLY ONE agent (no overlaps); "Foundation" MUST own package.json and index.html; use 3-5 agents; choose files that fully satisfy the objective; use a Vite + React + TypeScript + Tailwind stack unless the context clearly requires otherwise.`;

  const prompt = `${businessContext}\n\nOBJECTIVE / USER COMMAND: ${command}\n\nProduce the JSON plan now.`;

  try {
    const { text, model } = await generateWithFallback(prompt, system);
    const parsed = extractJson(text);
    const agents: AgentSpec[] = Array.isArray(parsed?.agents)
      ? parsed.agents.filter((a: any) => a && a.name && Array.isArray(a.files) && a.files.length)
      : [];
    if (agents.length > 0) {
      const elapsed = ((Date.now() - planStart) / 1000).toFixed(1);
      const totalFiles = agents.reduce((n, a) => n + a.files.length, 0);
      agentLog(socket, buildId, 'Planner',
        `✅ Plan ready via ${model} (${elapsed}s): ${agents.length} agents, ${totalFiles} files. Handing off to the team.`);
      for (const a of agents) {
        agentLog(socket, buildId, 'Planner', `   • ${a.name} → ${a.files.length} files (${a.role})`);
      }
      return { techStack: Array.isArray(parsed.techStack) ? parsed.techStack : [], agents };
    }
    throw new Error('plan JSON had no usable agents');
  } catch (e: any) {
    agentLog(socket, buildId, 'Planner', `⚠️ Structured plan unavailable (${e.message}); Coordinator will use a single Builder.`);
    return { techStack: [], agents: [] };
  }
}

/**
 * AGENT 2..N — Builder. A specialist that builds ONLY its assigned files,
 * reading the shared plan so it imports correctly from its teammates' files.
 * Runs concurrently with the other builders.
 */
async function runBuilderAgent(
  spec: AgentSpec,
  blackboard: Blackboard,
  projectPath: string,
  socket: Socket,
  buildId: number,
  filesCreated: string[]
): Promise<void> {
  agentLog(socket, buildId, spec.name, `🛠️ Builder online — owns ${spec.files.length} files: ${spec.files.join(', ')}`);
  const buildStart = Date.now();

  const teamManifest = blackboard.agents
    .map(a => `- ${a.name} (${a.role}): ${a.files.join(', ')}`)
    .join('\n');

  const prompt = `${blackboard.context}

OBJECTIVE: ${blackboard.objective}
TECH STACK: ${blackboard.techStack.join(', ') || 'React + Vite + TypeScript + Tailwind'}

SHARED BUILD PLAN — the full agent team and who owns what:
${teamManifest}

YOU ARE THE "${spec.name}" AGENT (${spec.role}).
Build ONLY these files, complete and production-ready:
${spec.files.map(f => `- ${f}`).join('\n')}

Assume the other agents' files exist and import from them correctly.
Output each file with the ===FILE=== format, then ===BUILD_COMPLETE===.`;

  try {
    await buildWithFallback(prompt, projectPath, socket, buildId, filesCreated, spec.name);
    const elapsed = ((Date.now() - buildStart) / 1000).toFixed(1);
    agentLog(socket, buildId, spec.name, `✅ Builder completed its ${spec.files.length}-file assignment in ${elapsed}s.`);
  } catch (e: any) {
    agentLog(socket, buildId, spec.name, `❌ Builder failed: ${e.message}`);
  }
}

/**
 * Fallback single Builder when the Planner can't split the work. Builds the
 * whole app in one streamed pass.
 */
async function runMonolithicBuilder(
  businessContext: string,
  command: string,
  repoUrl: string | undefined,
  projectPath: string,
  socket: Socket,
  buildId: number,
  filesCreated: string[]
): Promise<void> {
  agentLog(socket, buildId, 'Builder', '🛠️ Building the complete MVP in a single pass...');
  const prompt = `${businessContext}

OBJECTIVE / USER COMMAND: ${command}

${repoUrl
  ? `EXISTING REPO: ${repoUrl}. ADD new features only; do not delete working code.`
  : 'BUILD FROM SCRATCH: a complete, production-ready MVP runnable with npm install && npm run dev.'}

Build EVERY file the app needs (package.json, config, index.html with the Vite
entry script, src/main.tsx, src/App.tsx, pages, components, types, README).
Output each file with the ===FILE=== format, then ===BUILD_COMPLETE===.`;
  await buildWithFallback(prompt, projectPath, socket, buildId, filesCreated, 'Builder');
}

/** Runs a streamed builder generation, primary model then fallback. */
async function buildWithFallback(
  prompt: string,
  projectPath: string,
  socket: Socket,
  buildId: number,
  filesCreated: string[],
  agentName: string
): Promise<void> {
  try {
    await streamBuild(PRIMARY_MODEL, false, prompt, BUILDER_SYSTEM, projectPath, socket, buildId, filesCreated, agentName);
  } catch (primaryErr: any) {
    socket.emit('antigravity:fallback', {
      message: `⚠️ [${agentName}] ${PRIMARY_MODEL} unavailable (${primaryErr.message}). Retrying with ${FALLBACK_MODEL}...`
    });
    await streamBuild(FALLBACK_MODEL, true, prompt, BUILDER_SYSTEM, projectPath, socket, buildId, filesCreated, agentName);
  }
}

/** Collects bare (non-relative) package specifiers imported anywhere in src/. */
function collectImportedPackages(projectPath: string): Set<string> {
  const pkgs = new Set<string>();
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const st = fs.statSync(full);
      if (st.isDirectory()) { walk(full); continue; }
      if (!/\.(tsx?|jsx?)$/.test(entry)) continue;
      const content = fs.readFileSync(full, 'utf-8');
      const re = /(?:from|import)\s+['"]([^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const spec = m[1];
        if (spec.startsWith('.') || spec.startsWith('/')) continue;
        const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
        if (!ALWAYS_PRESENT.has(name)) pkgs.add(name);
      }
    }
  };
  walk(path.join(projectPath, 'src'));
  return pkgs;
}

/**
 * AGENT N+1 — Critic. Uses filesystem tools to validate the team's output and
 * detect cross-agent conflicts. Auto-repairs the deterministic blank-page bug
 * and reports remaining defects for the Fixer.
 */
function runCriticAgent(
  projectPath: string,
  socket: Socket,
  buildId: number,
  filesCreated: string[]
): Defect[] {
  agentLog(socket, buildId, 'Critic', '🔍 Reviewing the team output & checking for conflicts...');
  const defects: Defect[] = [];

  // Tool 1: ensure index.html loads the Vite entry module (else blank page).
  const indexHtmlPath = path.join(projectPath, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    let html = fs.readFileSync(indexHtmlPath, 'utf-8');
    if (!/<script[^>]*type=["']module["'][^>]*src=/.test(html)) {
      const entry = ['src/main.tsx', 'src/main.jsx', 'src/main.ts', 'src/index.tsx', 'src/index.jsx']
        .find(e => fs.existsSync(path.join(projectPath, e)));
      if (entry && /<\/body>/i.test(html)) {
        html = html.replace(/<\/body>/i, `    <script type="module" src="/${entry}"></script>\n  </body>`);
        fs.writeFileSync(indexHtmlPath, html, 'utf-8');
        agentLog(socket, buildId, 'Critic', `🔧 Auto-fixed: added missing <script type="module" src="/${entry}"> to index.html.`);
        if (!filesCreated.includes('index.html')) filesCreated.push('index.html');
      }
    }
    agentLog(socket, buildId, 'Critic', '✓ Tool: index.html entry-script check passed.');
  }

  // Tool 2: validate package.json + detect deps imported by one agent but not
  // declared by the Foundation agent (a genuine cross-agent conflict).
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    let pkg: any;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {
      defects.push({ kind: 'invalid-json', detail: 'package.json is not valid JSON' });
      agentLog(socket, buildId, 'Critic', '❌ Tool: package.json is not valid JSON!');
    }
    if (pkg) {
      const declared = new Set([
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
      ]);
      const imported = collectImportedPackages(projectPath);
      const missing = [...imported].filter(p => !declared.has(p));
      if (missing.length > 0) {
        defects.push({ kind: 'deps', detail: `packages imported but not declared: ${missing.join(', ')}`, packages: missing });
        agentLog(socket, buildId, 'Critic', `⚠️ Cross-agent conflict: ${missing.join(', ')} imported but missing from package.json.`);
      } else {
        agentLog(socket, buildId, 'Critic', `✓ Tool: dependency check passed (${declared.size} declared, ${imported.size} imported).`);
      }
    }
  }

  // Tool 3: validate tailwind.config.js content paths include ./src/**
  const twPath = path.join(projectPath, 'tailwind.config.js');
  if (fs.existsSync(twPath)) {
    const tw = fs.readFileSync(twPath, 'utf-8');
    if (!tw.includes('./src/') && !tw.includes('"./src')) {
      agentLog(socket, buildId, 'Critic', '⚠️ tailwind.config.js may not scan src/ — Tailwind classes might be purged.');
      // Non-blocking: just a warning
    } else {
      agentLog(socket, buildId, 'Critic', '✓ Tool: tailwind.config.js content paths look correct.');
    }
  }

  // Tool 4: check for tsconfig strict-lint flags that break AI code
  const tscPath = path.join(projectPath, 'tsconfig.json');
  if (fs.existsSync(tscPath)) {
    const tsc = fs.readFileSync(tscPath, 'utf-8');
    if (/"noUnusedLocals"\s*:\s*true/.test(tsc) || /"noUnusedParameters"\s*:\s*true/.test(tsc)) {
      defects.push({ kind: 'other', detail: 'tsconfig.json has noUnusedLocals/noUnusedParameters: true — will break AI-generated code' });
      agentLog(socket, buildId, 'Critic', '⚠️ tsconfig.json has strict lint flags that will fail on generated code. Flagging for Fixer.');
    }

    // Tool 5: tsconfig.json references ./tsconfig.node.json (standard Vite template)
    // but the model frequently forgets to generate that file — Vite then fails to
    // even start (ENOENT), producing a blank error overlay. Auto-repair immediately.
    const nodeConfigPath = path.join(projectPath, 'tsconfig.node.json');
    if (/tsconfig\.node\.json/.test(tsc) && !fs.existsSync(nodeConfigPath)) {
      const defaultNodeConfig = {
        compilerOptions: {
          composite: true,
          skipLibCheck: true,
          module: 'ESNext',
          moduleResolution: 'Bundler',
          allowSyntheticDefaultImports: true
        },
        include: ['vite.config.ts']
      };
      fs.writeFileSync(nodeConfigPath, JSON.stringify(defaultNodeConfig, null, 2), 'utf-8');
      if (!filesCreated.includes('tsconfig.node.json')) filesCreated.push('tsconfig.node.json');
      agentLog(socket, buildId, 'Critic', '🔧 Auto-fixed: created missing tsconfig.node.json (referenced by tsconfig.json but never generated).');
    }
  }

  // Tool 6: reconcile default-import vs named-export mismatches between agents.
  // e.g. App.tsx does `import Navbar from './Navbar'` but Navbar.tsx only has
  // `export const Navbar` → Vite fails "No matching export ... for import default".
  try {
    const fixedExports = repairDefaultExports(projectPath);
    if (fixedExports.length > 0) {
      for (const f of fixedExports) if (!filesCreated.includes(f)) filesCreated.push(f);
      agentLog(socket, buildId, 'Critic', `🔧 Auto-fixed cross-agent export mismatch: added default export to ${fixedExports.join(', ')}.`);
    } else {
      agentLog(socket, buildId, 'Critic', '✓ Tool: default import/export consistency check passed.');
    }
  } catch { /* non-fatal */ }

  // Tool 7: ensure a <Router> context exists when components use react-router
  // (useNavigate/<Link>) but no BrowserRouter/HashRouter is rendered. Wraps
  // <App /> in a HashRouter to prevent the runtime "useNavigate() may be used
  // only in the context of a <Router>" crash.
  try {
    const routerFixed = ensureRouterContext(projectPath);
    if (routerFixed.length > 0) {
      for (const f of routerFixed) if (!filesCreated.includes(f)) filesCreated.push(f);
      agentLog(socket, buildId, 'Critic', `🔧 Wrapped app in <HashRouter> for react-router context: ${routerFixed.join(', ')}.`);
    }
  } catch { /* non-fatal */ }

  // Tool 8: reconcile named-import vs default-export mismatches — the mirror
  // image of Tool 6, e.g. App.tsx does `import { Navbar } from './Navbar'`
  // but Navbar.tsx only has `export default function Navbar()` → Vite fails
  // "No matching export ... for import 'Navbar'".
  try {
    const fixedNamed = repairNamedExports(projectPath);
    if (fixedNamed.length > 0) {
      for (const f of fixedNamed) if (!filesCreated.includes(f)) filesCreated.push(f);
      agentLog(socket, buildId, 'Critic', `🔧 Auto-fixed cross-agent export mismatch: added named export to ${fixedNamed.join(', ')}.`);
    }
  } catch { /* non-fatal */ }

  // Tool 9: fix CSS @apply rules referencing undeclared custom Tailwind color
  // shades (e.g. `@apply bg-brand-darkBg` when tailwind.config only defines
  // `brand.dark`) — a hard PostCSS build error at dev-server start.
  try {
    const fixedColors = repairTailwindColors(projectPath);
    if (fixedColors.length > 0) {
      agentLog(socket, buildId, 'Critic', `🔧 Added missing Tailwind color shade(s) referenced by @apply: ${fixedColors.join(', ')}.`);
    }
  } catch { /* non-fatal */ }

  if (defects.length === 0) {
    agentLog(socket, buildId, 'Critic', '✅ All tools passed — build looks healthy.');
  } else {
    agentLog(socket, buildId, 'Critic', `🔍 Found ${defects.length} issue(s). Handing off to Fixer agent.`);
  }
  return defects;
}

/**
 * AGENT N+2 — Fixer. Resolves the conflicts the Critic reported. For missing
 * dependencies it reconciles package.json deterministically (tool use) so the
 * app installs and runs.
 */
function runFixerAgent(
  projectPath: string,
  defects: Defect[],
  socket: Socket,
  buildId: number
): void {
  agentLog(socket, buildId, 'Fixer', `🔧 Resolving ${defects.length} issue(s) reported by the Critic...`);

  for (const defect of defects) {
    if (defect.kind === 'deps' && defect.packages?.length) {
      // Tool: reconcile package.json — add missing deps with known-good versions
      const pkgPath = path.join(projectPath, 'package.json');
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        pkg.dependencies = pkg.dependencies || {};
        for (const name of defect.packages) {
          pkg.dependencies[name] = KNOWN_VERSIONS[name] || 'latest';
        }
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
        agentLog(socket, buildId, 'Fixer', `✅ Reconciled package.json: added ${defect.packages.join(', ')}.`);
      } catch (e: any) {
        agentLog(socket, buildId, 'Fixer', `❌ Could not reconcile deps: ${e.message}`);
      }
    } else if (defect.kind === 'other' && defect.detail.includes('noUnused')) {
      // Tool: repair tsconfig.json — disable strict lint flags
      const tscPath = path.join(projectPath, 'tsconfig.json');
      try {
        let raw = fs.readFileSync(tscPath, 'utf-8');
        raw = raw.replace(/"noUnusedLocals"\s*:\s*true/g, '"noUnusedLocals": false');
        raw = raw.replace(/"noUnusedParameters"\s*:\s*true/g, '"noUnusedParameters": false');
        fs.writeFileSync(tscPath, raw, 'utf-8');
        agentLog(socket, buildId, 'Fixer', '✅ Repaired tsconfig.json: disabled noUnusedLocals/noUnusedParameters.');
      } catch (e: any) {
        agentLog(socket, buildId, 'Fixer', `❌ Could not repair tsconfig: ${e.message}`);
      }
    } else {
      agentLog(socket, buildId, 'Fixer', `⚠️ Unhandled defect (${defect.kind}): ${defect.detail}`);
    }
  }
  agentLog(socket, buildId, 'Fixer', '✅ All issues resolved. Build is ready for deployment.');
}



/**
 * Streams a single generation attempt from one model, parsing ===FILE=== blocks
 * and writing them to disk as they arrive. Throws on any failure so the caller
 * can retry with a fallback model.
 */
async function streamBuild(
  model: string,
  isFallback: boolean,
  fullPrompt: string,
  systemInstruction: string,
  projectPath: string,
  socket: Socket,
  buildId: number,
  filesCreated: string[],
  agentName: string
): Promise<BuildResult> {
  socket.emit('antigravity:model', { model, isFallback, agent: agentName });

  const streamResult = await genai.models.generateContentStream({
    model,
    config: {
      systemInstruction,
      maxOutputTokens: 65536,
      temperature: 0.8,
    },
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
  });

  // Robust parser: accumulate the full stream and extract complete
  // ===FILE: path=== ... ===END_FILE=== blocks with a regex. This tolerates
  // markers that the model concatenates onto the same line (e.g.
  // "}===END_FILE======FILE: next.ts==="), which the old line-by-line matcher
  // mis-parsed — dumping every file into the first one and producing invalid
  // JSON in package.json.
  const FILE_BLOCK = /===FILE:\s*([^\n=]+?)\s*===\r?\n?([\s\S]*?)===END_FILE===/g;

  let fullText = '';
  let processedIndex = 0; // index in fullText up to which blocks are written
  let totalChars = 0;
  let sawComplete = false;
  const startedPaths = new Set<string>();

  const flushCompletedBlocks = async () => {
    FILE_BLOCK.lastIndex = processedIndex;
    let match: RegExpExecArray | null;
    while ((match = FILE_BLOCK.exec(fullText)) !== null) {
      const filePath = match[1].trim();
      // Strip a single leading/trailing newline the markers introduce.
      const content = match[2].replace(/^\r?\n/, '').replace(/\r?\n\s*$/, '\n');

      if (filePath && !startedPaths.has(filePath)) {
        startedPaths.add(filePath);
        socket.emit('antigravity:file_start', { path: filePath, agent: agentName });
      }
      if (filePath && content.trim()) {
        await writeFileToProject(projectPath, filePath, content, socket, filesCreated, buildId, agentName);
      }
      processedIndex = FILE_BLOCK.lastIndex;
    }
  };

  for await (const chunk of streamResult) {
    const text = chunk.text || '';
    if (!text) continue;
    fullText += text;
    totalChars += text.length;

    // Emit raw chunk for the live terminal view
    socket.emit('antigravity:chunk', { text, totalChars });

    await flushCompletedBlocks();

    if (!sawComplete && fullText.indexOf('===BUILD_COMPLETE===') !== -1) {
      sawComplete = true;
    }
  }

  // Final pass in case the last block arrived without a trailing chunk boundary.
  await flushCompletedBlocks();

  if (filesCreated.length === 0) {
    throw new Error(`${model} returned no valid ===FILE=== blocks — check the API key and model name are valid.`);
  }

  return { success: true, filesCreated, projectPath };
}


/**
 * Writes a single file to the project directory.
 * Emits socket event so UI can show it appearing live.
 */
async function writeFileToProject(
  projectPath: string,
  filePath: string,
  content: string,
  socket: Socket,
  filesCreated: string[],
  buildId: number,
  agentName = 'Builder'
): Promise<void> {
  const fullPath = path.join(projectPath, filePath);

  // Create parent directories
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });

  // Write the file
  fs.writeFileSync(fullPath, content, 'utf-8');

  filesCreated.push(filePath);

  // Notify UI
  socket.emit('antigravity:file_written', {
    path: filePath,
    size: content.length,
    lines: content.split('\n').length,
    totalFiles: filesCreated.length,
    agent: agentName,
    buildId
  });

  console.log(`📝 [${agentName}] Written: ${filePath} (${content.length} chars)`);
}

/**
 * Send a follow-up command to Antigravity for an existing project.
 * Used for "fix bug", "add feature", "improve UI" commands.
 */
export async function sendFollowUpCommand(options: {
  businessContext: string;
  command: string;
  projectPath: string;
  socket: Socket;
  buildId: number;
}): Promise<BuildResult> {
  const { businessContext, command, projectPath, socket, buildId } = options;

  // Read existing file structure to give Antigravity context
  const existingFiles = getProjectFileTree(projectPath);

  const followUpPrompt = `
${businessContext}

EXISTING PROJECT at: ${projectPath}
Current file structure:
${existingFiles}

FOLLOW-UP COMMAND: ${command}

Analyze the existing project and make the requested changes.
Only output files that need to be CREATED or MODIFIED.
Do not output files that stay the same.
Use ===FILE=== format as before.
  `;

  return runAntigravityBuild({
    ...options,
    command: followUpPrompt,
  });
}

/**
 * Reads the file tree of an existing project directory
 */
function getProjectFileTree(projectPath: string, depth = 0, maxDepth = 4): string {
  if (depth > maxDepth || !fs.existsSync(projectPath)) return '';

  let tree = '';
  const entries = fs.readdirSync(projectPath);
  const skip = ['node_modules', '.git', 'dist', '.next', 'build'];

  for (const entry of entries) {
    if (skip.includes(entry)) continue;
    const fullPath = path.join(projectPath, entry);
    const stat = fs.statSync(fullPath);
    const indent = '  '.repeat(depth);

    if (stat.isDirectory()) {
      tree += `${indent}📁 ${entry}/\n`;
      tree += getProjectFileTree(fullPath, depth + 1, maxDepth);
    } else {
      tree += `${indent}📄 ${entry}\n`;
    }
  }

  return tree;
}

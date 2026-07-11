/**
 * projectRepair.ts
 * ------------------------------------------------------------------
 * Deterministic, filesystem-level repairs for AI-generated projects.
 *
 * The multi-agent builders frequently disagree on module export style: one
 * agent writes `import Navbar from './components/Navbar'` (a DEFAULT import)
 * while the agent that authored Navbar.tsx used a NAMED export
 * (`export const Navbar = ...`) with no `export default`. Vite/esbuild then
 * fails at dev-server start with:
 *   "No matching export in 'src/components/Navbar.tsx' for import 'default'"
 *
 * repairDefaultExports() scans the project, finds every local default import,
 * and — where the target file has a matching named/declared symbol but no
 * default export — appends `export default <Symbol>;` so the import resolves.
 */
import fs from 'fs';
import path from 'path';

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'build', '.next']);

function walkSourceFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    let stat: fs.Stats;
    try { stat = fs.statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walkSourceFiles(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function resolveLocalModule(fromDir: string, spec: string): string | null {
  const base = path.resolve(fromDir, spec);
  const candidates = [
    `${base}.tsx`, `${base}.ts`, `${base}.jsx`, `${base}.js`,
    path.join(base, 'index.tsx'), path.join(base, 'index.ts'),
    path.join(base, 'index.jsx'), path.join(base, 'index.js'),
  ];
  return candidates.find((c) => fs.existsSync(c)) || null;
}

function hasDefaultExport(content: string): boolean {
  return /export\s+default\b/.test(content) ||
    /export\s*\{[^}]*\bas\s+default\b[^}]*\}/.test(content) ||
    /export\s*\{[^}]*\bdefault\b[^}]*\}/.test(content);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Choose the best symbol in `content` to default-export for import `binding`. */
function pickExportSymbol(content: string, binding: string, targetFile: string): string | null {
  const fileName = path.basename(targetFile).replace(/\.(tsx?|jsx?)$/, '');
  const preferred = [binding, fileName];

  for (const name of preferred) {
    if (!name) continue;
    // `export const/function/class Name`
    if (new RegExp(`export\\s+(?:const|let|var|function|async\\s+function|class)\\s+${escapeRe(name)}\\b`).test(content)) {
      return name;
    }
    // `const/function/class Name ...` declared, then `export { Name }`
    if (new RegExp(`(?:const|let|var|function|class)\\s+${escapeRe(name)}\\b`).test(content) &&
        new RegExp(`export\\s*\\{[^}]*\\b${escapeRe(name)}\\b[^}]*\\}`).test(content)) {
      return name;
    }
  }

  // Exactly one named export in the whole file → safe to default it.
  const named = [...content.matchAll(/export\s+(?:const|let|var|function|async\s+function|class)\s+([A-Za-z_$][\w$]*)/g)]
    .map((m) => m[1]);
  const uniqueNamed = Array.from(new Set(named));
  if (uniqueNamed.length === 1) return uniqueNamed[0];

  // Any top-level declaration matching the binding name (even if not exported).
  if (binding && new RegExp(`(?:const|let|var|function|class)\\s+${escapeRe(binding)}\\b`).test(content)) {
    return binding;
  }
  return null;
}

/**
 * Scan the project and add missing default exports where a local default
 * import expects one. Returns the list of repaired files (project-relative).
 */
export function repairDefaultExports(projectPath: string): string[] {
  const srcDir = path.join(projectPath, 'src');
  const files = walkSourceFiles(srcDir);
  if (files.length === 0) return [];

  // Matches `import X from '...'` and `import X, { ... } from '...'` (default
  // imports). Named-only (`import { X }`) and namespace (`import * as X`)
  // imports don't start with an identifier, so they're naturally excluded.
  const defaultImportRe = /import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\})?\s+from\s+['"]([^'"]+)['"]/g;

  // resolved target file -> the binding name used by the importer
  const needsDefault = new Map<string, string>();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    let m: RegExpExecArray | null;
    defaultImportRe.lastIndex = 0;
    while ((m = defaultImportRe.exec(content)) !== null) {
      const binding = m[1];
      const spec = m[2];
      if (binding === 'type') continue; // `import type ...`
      if (!spec.startsWith('.')) continue; // only local modules
      const resolved = resolveLocalModule(path.dirname(file), spec);
      if (resolved && !needsDefault.has(resolved)) needsDefault.set(resolved, binding);
    }
  }

  const fixed: string[] = [];
  for (const [target, binding] of needsDefault) {
    let content: string;
    try { content = fs.readFileSync(target, 'utf-8'); } catch { continue; }
    if (hasDefaultExport(content)) continue;

    const symbol = pickExportSymbol(content, binding, target);
    if (!symbol) continue;

    const trimmed = content.replace(/\s*$/, '');
    fs.writeFileSync(target, `${trimmed}\n\nexport default ${symbol};\n`, 'utf-8');
    fixed.push(path.relative(projectPath, target).replace(/\\/g, '/'));
  }

  return fixed;
}

/**
 * ensureRouterContext()
 * ------------------------------------------------------------------
 * Parallel builders frequently disagree on routing: one agent writes a Navbar
 * or Footer that uses react-router (`useNavigate`, `useLocation`, `<Link>`),
 * while the agent that authored App.tsx wires up its own custom router (or none
 * at all) and never renders a `<BrowserRouter>`. At runtime this throws:
 *   "useNavigate() may be used only in the context of a <Router> component."
 *   "Cannot destructure property 'basename' of 'React.useContext(...)' as null"
 * and blanks the page.
 *
 * If any file uses react-router primitives but NO Router is rendered anywhere,
 * this wraps `<App />` in the entry file with a <HashRouter>. HashRouter is
 * chosen deliberately: it coexists with app-level `window.location.hash`
 * routers (same `#/path` format) and is the safest option for static/GitHub
 * Pages hosting. Returns the list of files it changed.
 */
export function ensureRouterContext(projectPath: string): string[] {
  const srcDir = path.join(projectPath, 'src');
  const files = walkSourceFiles(srcDir);
  if (files.length === 0) return [];

  const HOOK_RE = /\b(useNavigate|useLocation|useParams|useSearchParams|useRoutes|useMatch|Link|NavLink|Routes|Route|Navigate|Outlet)\b/;
  const ROUTER_RENDER_RE = /<(BrowserRouter|HashRouter|MemoryRouter|Router)[\s/>]|create(Browser|Hash|Memory)Router|RouterProvider/;

  let usesRouter = false;
  let hasRouterContext = false;

  for (const file of files) {
    let content: string;
    try { content = fs.readFileSync(file, 'utf-8'); } catch { continue; }
    if (/from\s+['"]react-router-dom['"]/.test(content) && HOOK_RE.test(content)) usesRouter = true;
    if (ROUTER_RENDER_RE.test(content)) hasRouterContext = true;
  }

  // Router primitives are unused, or a Router is already rendered — nothing to do.
  if (!usesRouter || hasRouterContext) return [];

  // Locate the entry file that renders <App />.
  const entryCandidates = ['main.tsx', 'main.jsx', 'main.ts', 'index.tsx', 'index.jsx']
    .map((f) => path.join(srcDir, f));
  const entry = entryCandidates.find((f) => {
    if (!fs.existsSync(f)) return false;
    const c = fs.readFileSync(f, 'utf-8');
    return /<App(\s[^>]*)?\/>|<App(\s[^>]*)?>/.test(c);
  });
  if (!entry) return [];

  let content = fs.readFileSync(entry, 'utf-8');
  const original = content;

  // Wrap the <App /> element (self-closing or with props) in <HashRouter>.
  content = content.replace(/(<App(?:\s[^>]*?)?\/>)/, '<HashRouter>$1</HashRouter>');
  if (content === original) return []; // couldn't locate a wrappable <App />

  // Add the HashRouter import if it isn't already present.
  if (!/import\s+\{[^}]*\bHashRouter\b[^}]*\}\s+from\s+['"]react-router-dom['"]/.test(content)) {
    const importLine = `import { HashRouter } from 'react-router-dom';\n`;
    const firstImport = content.match(/^import[^\n]*\n/m);
    content = firstImport
      ? content.replace(firstImport[0], firstImport[0] + importLine)
      : importLine + content;
  }

  fs.writeFileSync(entry, content, 'utf-8');
  return [path.relative(projectPath, entry).replace(/\\/g, '/')];
}


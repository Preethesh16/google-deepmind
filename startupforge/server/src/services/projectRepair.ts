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

/**
 * repairNamedExports()
 * ------------------------------------------------------------------
 * The MIRROR IMAGE of repairDefaultExports(): one agent writes
 * `import { Navbar } from './components/Navbar'` (a NAMED import) while the
 * agent that authored Navbar.tsx used `export default function Navbar(...)`
 * (a DEFAULT export only, no matching named export). Vite/esbuild fails with:
 *   "No matching export in 'src/components/Navbar.tsx' for import 'Navbar'"
 *
 * Since the file already has a default export, the fix is simple and safe:
 * append `export { default as Navbar };` so the named binding resolves too,
 * without touching the existing default export or any other symbols.
 */
function hasNamedExport(content: string, name: string): boolean {
  const escaped = escapeRe(name);
  return new RegExp(`export\\s+(?:const|let|var|function|async\\s+function|class)\\s+${escaped}\\b`).test(content) ||
    new RegExp(`export\\s*\\{[^}]*\\b${escaped}\\b[^}]*\\}`).test(content);
}

export function repairNamedExports(projectPath: string): string[] {
  const srcDir = path.join(projectPath, 'src');
  const files = walkSourceFiles(srcDir);
  if (files.length === 0) return [];

  // Matches `import { A, B as C } from '...'` (named imports only — a
  // preceding default binding, e.g. `import X, { A } from '...'`, is handled
  // separately and doesn't change how the named specifiers are parsed here).
  const namedImportRe = /import\s+(?:[A-Za-z_$][\w$]*\s*,\s*)?\{([^}]+)\}\s*from\s+['"]([^'"]+)['"]/g;

  // resolved target file -> set of named bindings the importers expect
  const needsNamed = new Map<string, Set<string>>();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    let m: RegExpExecArray | null;
    namedImportRe.lastIndex = 0;
    while ((m = namedImportRe.exec(content)) !== null) {
      const spec = m[2];
      if (!spec.startsWith('.')) continue; // only local modules
      const resolved = resolveLocalModule(path.dirname(file), spec);
      if (!resolved) continue;
      for (const rawSpecifier of m[1].split(',')) {
        const specifier = rawSpecifier.trim();
        if (!specifier || specifier.startsWith('type ')) continue;
        // `Foo as Bar` — the export the target module must provide is `Foo`.
        const exportName = specifier.split(/\s+as\s+/)[0].trim();
        if (!exportName || exportName === 'default') continue;
        if (!needsNamed.has(resolved)) needsNamed.set(resolved, new Set());
        needsNamed.get(resolved)!.add(exportName);
      }
    }
  }

  const fixed: string[] = [];
  for (const [target, names] of needsNamed) {
    let content: string;
    try { content = fs.readFileSync(target, 'utf-8'); } catch { continue; }
    if (!hasDefaultExport(content)) continue; // nothing safe to alias

    const toAdd: string[] = [];
    for (const name of names) {
      if (hasNamedExport(content, name)) continue;
      const reExportRe = new RegExp(`export\\s*\\{[^}]*\\bdefault\\s+as\\s+${escapeRe(name)}\\b[^}]*\\}`);
      if (reExportRe.test(content)) continue; // already re-exported by a previous run
      toAdd.push(name);
    }
    if (toAdd.length === 0) continue;

    const trimmed = content.replace(/\s*$/, '');
    const lines = toAdd.map((name) => `export { default as ${name} };`).join('\n');
    fs.writeFileSync(target, `${trimmed}\n\n${lines}\n`, 'utf-8');
    fixed.push(path.relative(projectPath, target).replace(/\\/g, '/'));
  }

  return fixed;
}

/**
 * repairTailwindColors()
 * ------------------------------------------------------------------
 * Parallel builders sometimes reference a custom color shade in a CSS
 * `@apply` rule (e.g. `@apply bg-brand-darkBg`) that was never actually
 * declared in tailwind.config.js's `theme.extend.colors` (only `brand.dark`
 * exists, not `brand.darkBg`). Unlike a plain className usage (which Tailwind
 * JIT silently ignores if unresolvable), an unresolvable class inside
 * `@apply` is a HARD PostCSS build error:
 *   "The `bg-brand-darkBg` class does not exist."
 *
 * Fix: parse the custom color groups out of tailwind.config.js, scan every
 * CSS file's `@apply` rules for `<prefix>-<group>-<shade>` tokens, and for
 * any shade missing from its group, add it to the config aliased to the
 * closest existing shade in that same group (name-similarity heuristic,
 * falling back to DEFAULT / first shade). This preserves the design intent
 * instead of just deleting the broken utility.
 */
function findMatchingBrace(text: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

interface ColorGroup {
  braceOpenAbs: number;
  shades: Map<string, string>;
}

function parseTailwindColorGroups(configContent: string): Map<string, ColorGroup> {
  const groups = new Map<string, ColorGroup>();
  const colorsMatch = /colors\s*:\s*\{/.exec(configContent);
  if (!colorsMatch) return groups;

  const colorsOpenAbs = colorsMatch.index + colorsMatch[0].length - 1;
  const colorsCloseAbs = findMatchingBrace(configContent, colorsOpenAbs);
  if (colorsCloseAbs === -1) return groups;

  const groupRe = /([A-Za-z_$][\w$-]*)\s*:\s*\{/g;
  let m: RegExpExecArray | null;
  // Search only within the colors object body.
  groupRe.lastIndex = colorsOpenAbs + 1;
  while ((m = groupRe.exec(configContent)) !== null) {
    const braceOpenAbs = groupRe.lastIndex - 1;
    if (braceOpenAbs >= colorsCloseAbs) break; // past the end of `colors: {...}`
    const braceCloseAbs = findMatchingBrace(configContent, braceOpenAbs);
    if (braceCloseAbs === -1 || braceCloseAbs > colorsCloseAbs) { groupRe.lastIndex = braceOpenAbs + 1; continue; }

    const groupName = m[1];
    const inner = configContent.slice(braceOpenAbs + 1, braceCloseAbs);
    const shades = new Map<string, string>();
    const shadeRe = /([A-Za-z_$][\w$-]*)\s*:\s*(['"][^'"]*['"])/g;
    let sm: RegExpExecArray | null;
    while ((sm = shadeRe.exec(inner)) !== null) {
      shades.set(sm[1], sm[2]);
    }
    if (shades.size > 0) groups.set(groupName, { braceOpenAbs, shades });

    groupRe.lastIndex = braceCloseAbs + 1; // skip past nested content
  }

  return groups;
}

function pickClosestShadeValue(shades: Map<string, string>, target: string): string {
  const lower = target.toLowerCase();
  let best: string | null = null;
  let bestScore = -1;
  for (const [name, value] of shades) {
    if (name.toUpperCase() === 'DEFAULT') continue;
    const nameLower = name.toLowerCase();
    if (!lower.includes(nameLower) && !nameLower.includes(lower)) continue;
    const score = Math.min(nameLower.length, lower.length);
    if (score > bestScore) { bestScore = score; best = value; }
  }
  if (best) return best;
  if (shades.has('DEFAULT')) return shades.get('DEFAULT')!;
  const first = shades.values().next();
  return first.done ? "'#000000'" : first.value;
}

export function repairTailwindColors(projectPath: string): string[] {
  const configCandidates = ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.ts', 'tailwind.config.mjs']
    .map((f) => path.join(projectPath, f));
  const configPath = configCandidates.find((f) => fs.existsSync(f));
  if (!configPath) return [];

  let configContent = fs.readFileSync(configPath, 'utf-8');
  const groups = parseTailwindColorGroups(configContent);
  if (groups.size === 0) return [];

  const srcDir = path.join(projectPath, 'src');
  const allCssFiles: string[] = [];
  (function walkCss(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      let stat: fs.Stats;
      try { stat = fs.statSync(full); } catch { continue; }
      if (stat.isDirectory()) {
        if (!SKIP_DIRS.has(entry)) walkCss(full);
      } else if (/\.css$/.test(entry)) {
        allCssFiles.push(full);
      }
    }
  })(srcDir);

  const UTILITY_PREFIXES = ['bg', 'text', 'border', 'from', 'via', 'to', 'ring', 'fill', 'stroke',
    'divide', 'outline', 'decoration', 'caret', 'accent', 'shadow', 'placeholder'];

  // groupName -> set of missing shade names
  const missing = new Map<string, Set<string>>();

  for (const cssFile of allCssFiles) {
    const content = fs.readFileSync(cssFile, 'utf-8');
    const applyRe = /@apply\s+([^;]+);/g;
    let am: RegExpExecArray | null;
    while ((am = applyRe.exec(content)) !== null) {
      const tokens = am[1].split(/\s+/).map((t) => t.split(':').pop()!.split('/')[0]).filter(Boolean);
      for (const token of tokens) {
        const prefixMatch = UTILITY_PREFIXES.find((p) => token.startsWith(`${p}-`));
        if (!prefixMatch) continue;
        const remainder = token.slice(prefixMatch.length + 1);
        for (const [groupName, group] of groups) {
          if (!remainder.startsWith(`${groupName}-`)) continue;
          const shadeName = remainder.slice(groupName.length + 1);
          if (!shadeName || group.shades.has(shadeName)) continue;
          if (!missing.has(groupName)) missing.set(groupName, new Set());
          missing.get(groupName)!.add(shadeName);
          break;
        }
      }
    }
  }

  if (missing.size === 0) return [];

  // Build insertions (absolute position right after each group's opening
  // brace), then apply from the highest offset down so earlier offsets stay
  // valid as we splice.
  const insertions: { pos: number; text: string; labels: string[] }[] = [];
  for (const [groupName, shadeNames] of missing) {
    const group = groups.get(groupName)!;
    const labels: string[] = [];
    const lines = Array.from(shadeNames).map((shadeName) => {
      const value = pickClosestShadeValue(group.shades, shadeName);
      labels.push(`${groupName}.${shadeName}`);
      return `\n      ${shadeName}: ${value},`;
    }).join('');
    insertions.push({ pos: group.braceOpenAbs + 1, text: lines, labels });
  }
  insertions.sort((a, b) => b.pos - a.pos);

  const fixed: string[] = [];
  for (const { pos, text, labels } of insertions) {
    configContent = configContent.slice(0, pos) + text + configContent.slice(pos);
    fixed.push(...labels);
  }

  fs.writeFileSync(configPath, configContent, 'utf-8');
  return fixed;
}


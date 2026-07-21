/**
 * githubService.ts
 * ------------------------------------------------------------------
 * Connects StartupForge to GitHub so a generated MVP can be:
 *   1) Logged into via GitHub OAuth (or a pasted Personal Access Token)
 *   2) Pushed to a brand-new (or existing) GitHub repository
 *   3) Published live via GitHub Pages (builds the Vite app and pushes
 *      `dist/` to a `gh-pages` branch, then enables Pages via the API)
 *
 * Requires the `git` CLI to be installed and on PATH.
 */
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { Socket } from 'socket.io';
import { repairDefaultExports, repairNamedExports, ensureRouterContext, repairTailwindColors } from './projectRepair';

const execAsync = promisify(exec);

const GITHUB_API = 'https://api.github.com';

// ─── OAuth ──────────────────────────────────────────────────────────────────

export function isOAuthConfigured(): boolean {
  return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || '',
    redirect_uri: redirectUri,
    scope: 'repo user:email',
    state
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const { data } = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    },
    { headers: { Accept: 'application/json' } }
  );
  if (data.error) throw new Error(data.error_description || data.error);
  return data.access_token;
}

export async function fetchGithubUser(token: string): Promise<{ username: string; avatarUrl: string }> {
  const { data } = await axios.get(`${GITHUB_API}/user`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  return { username: data.login, avatarUrl: data.avatar_url };
}

// ─── Repo creation ──────────────────────────────────────────────────────────

async function createOrFindRepo(token: string, name: string, isPrivate: boolean): Promise<{ owner: string; repo: string }> {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
  const user = await fetchGithubUser(token);

  try {
    await axios.post(`${GITHUB_API}/user/repos`, {
      name, private: isPrivate, description: 'Built with StartupForge — autonomous multi-agent MVP builder', auto_init: false
    }, { headers });
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message;
    // 422 "name already exists on this account" → repo already exists, reuse it.
    if (!/already exists/i.test(msg)) throw new Error(`GitHub repo creation failed: ${msg}`);
  }

  return { owner: user.username, repo: name };
}

// ─── Git CLI helpers ────────────────────────────────────────────────────────

async function run(cmd: string, cwd: string): Promise<string> {
  const { stdout } = await execAsync(cmd, { cwd, timeout: 300000, maxBuffer: 40 * 1024 * 1024 });
  return stdout;
}

async function runIgnoreError(cmd: string, cwd: string): Promise<void> {
  try { await run(cmd, cwd); } catch { /* best-effort */ }
}

function remoteUrl(token: string, owner: string, repo: string): string {
  return `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
}

// ─── Pages enablement ───────────────────────────────────────────────────────

async function enableGithubPages(token: string, owner: string, repo: string, branch = 'gh-pages'): Promise<void> {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
  try {
    await axios.post(`${GITHUB_API}/repos/${owner}/${repo}/pages`, {
      source: { branch, path: '/' }
    }, { headers });
  } catch (err: any) {
    // 409 = Pages site already exists → update its source branch instead.
    if (err.response?.status === 409) {
      await axios.put(`${GITHUB_API}/repos/${owner}/${repo}/pages`, {
        source: { branch, path: '/' }
      }, { headers }).catch(() => { /* non-fatal */ });
    }
    // Other errors are non-fatal — the repo push still succeeded.
  }
}

// ─── Main orchestration ─────────────────────────────────────────────────────

export interface PublishResult {
  repoUrl: string;
  pagesUrl: string;
  owner: string;
  repo: string;
}

export async function publishToGithub(options: {
  token: string;
  projectPath: string;
  repoName: string;
  isPrivate: boolean;
  socket: Socket;
}): Promise<PublishResult> {
  const { token, projectPath, repoName, isPrivate, socket } = options;

  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project path does not exist: ${projectPath}`);
  }

  const emit = (message: string) => socket.emit('github:progress', { message });

  emit(`🔗 Preparing GitHub repository "${repoName}"...`);
  const { owner, repo } = await createOrFindRepo(token, repoName, isPrivate);
  const repoUrl = `https://github.com/${owner}/${repo}`;
  const url = remoteUrl(token, owner, repo);

  // ── Push source code to `main` ──────────────────────────────────────────
  emit('📦 Committing source code...');
  const hasGit = fs.existsSync(path.join(projectPath, '.git'));
  if (!hasGit) await run('git init -b main', projectPath);

  // Keep build artifacts out of the source push.
  const gitignore = path.join(projectPath, '.gitignore');
  const ignoreLines = ['node_modules', 'dist', '.env'];
  let existingIgnore = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, 'utf-8') : '';
  for (const line of ignoreLines) {
    if (!existingIgnore.includes(line)) existingIgnore += `\n${line}`;
  }
  fs.writeFileSync(gitignore, existingIgnore.trim() + '\n', 'utf-8');

  await run('git add -A', projectPath);
  await runIgnoreError(
    `git -c user.email="startupforge@local" -c user.name="StartupForge" commit -m "Update via StartupForge"`,
    projectPath
  );
  await runIgnoreError('git remote remove origin', projectPath);
  await run(`git remote add origin ${url}`, projectPath);

  emit('🚀 Pushing source to GitHub (main branch)...');
  await run('git push -u origin HEAD:main --force', projectPath);

  // ── Auto-repair the project so the production build cannot fail ──────────
  emit('🔧 Auto-repairing project before build (tsconfig, entry script, build script)...');
  autoRepairForBuild(projectPath, emit);

  // ── Build the app and publish `dist/` to `gh-pages` ─────────────────────
  emit('🏗️ Installing dependencies...');
  await run('npm install --legacy-peer-deps', projectPath);

  // GitHub Pages serves from https://<owner>.github.io/<repo>/ so assets must
  // be built with that base path, otherwise the published site is a blank page.
  const base = `/${repo}/`;
  const built = await buildResiliently(projectPath, base, emit);

  const distPath = path.join(projectPath, 'dist');
  if (built && fs.existsSync(distPath)) {
    // SPA fallback: GitHub Pages 404s on client-side routes without a 404.html.
    try {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) fs.copyFileSync(indexHtml, path.join(distPath, '404.html'));
      // .nojekyll lets folders/files starting with _ be served.
      fs.writeFileSync(path.join(distPath, '.nojekyll'), '', 'utf-8');
    } catch { /* non-fatal */ }

    emit('🌐 Publishing to GitHub Pages (gh-pages branch)...');
    const distGit = path.join(distPath, '.git');
    if (!fs.existsSync(distGit)) await run('git init -b gh-pages', distPath);
    await run('git add -A', distPath);
    await runIgnoreError(
      `git -c user.email="startupforge@local" -c user.name="StartupForge" commit -m "Deploy to GitHub Pages"`,
      distPath
    );
    await runIgnoreError('git remote remove origin', distPath);
    await run(`git remote add origin ${url}`, distPath);
    await run('git push origin HEAD:gh-pages --force', distPath);

    emit('⚙️ Enabling GitHub Pages...');
    await enableGithubPages(token, owner, repo, 'gh-pages');
  } else {
    emit('⚠️ Production build did not produce a dist/ folder — source is on GitHub, but Pages publish was skipped.');
  }

  const pagesUrl = built && fs.existsSync(distPath) ? `https://${owner}.github.io/${repo}/` : '';

  emit(`✅ Published! Repo: ${repoUrl}${pagesUrl ? ` · Live: ${pagesUrl} (may take ~1 min to go live)` : ''}`);
  return { repoUrl, pagesUrl, owner, repo };
}

/**
 * Deterministically repair a generated project so its production build won't
 * fail on the common issues the AI model produces:
 *  - tsconfig strict-lint flags (noUnusedLocals/noUnusedParameters)
 *  - a `tsconfig.json` that references a missing `tsconfig.node.json`
 *  - a missing Vite entry <script> in index.html
 *  - a `build` script gated on `tsc` (which fails on any type error) — we drop
 *    the tsc gate so `vite build` alone produces the bundle.
 */
function autoRepairForBuild(projectPath: string, emit: (m: string) => void): void {
  // tsconfig.json — relax strict lint + ensure referenced node config exists
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    try {
      let raw = fs.readFileSync(tsconfigPath, 'utf-8');
      raw = raw.replace(/"noUnusedLocals"\s*:\s*true/g, '"noUnusedLocals": false')
               .replace(/"noUnusedParameters"\s*:\s*true/g, '"noUnusedParameters": false');
      fs.writeFileSync(tsconfigPath, raw, 'utf-8');

      const nodeConfigPath = path.join(projectPath, 'tsconfig.node.json');
      if (/tsconfig\.node\.json/.test(raw) && !fs.existsSync(nodeConfigPath)) {
        fs.writeFileSync(nodeConfigPath, JSON.stringify({
          compilerOptions: {
            composite: true, skipLibCheck: true, module: 'ESNext',
            moduleResolution: 'Bundler', allowSyntheticDefaultImports: true
          },
          include: ['vite.config.ts']
        }, null, 2), 'utf-8');
        emit('🔧 Created missing tsconfig.node.json.');
      }
    } catch { /* best-effort */ }
  }

  // index.html — ensure the Vite entry module is present
  const indexHtml = path.join(projectPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    try {
      let html = fs.readFileSync(indexHtml, 'utf-8');
      if (!/<script[^>]*type=["']module["'][^>]*src=/.test(html)) {
        const entry = ['src/main.tsx', 'src/main.jsx', 'src/main.ts', 'src/index.tsx', 'src/index.jsx']
          .find(e => fs.existsSync(path.join(projectPath, e)));
        if (entry && /<\/body>/i.test(html)) {
          html = html.replace(/<\/body>/i, `    <script type="module" src="/${entry}"></script>\n  </body>`);
          fs.writeFileSync(indexHtml, html, 'utf-8');
          emit('🔧 Added missing Vite entry script to index.html.');
        }
      }
    } catch { /* best-effort */ }
  }

  // package.json — drop the `tsc &&` gate from the build script
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts?.build && /tsc\b[^&]*&&/.test(pkg.scripts.build)) {
        pkg.scripts.build = pkg.scripts.build.replace(/tsc\b[^&]*&&\s*/g, '');
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
        emit('🔧 Relaxed build script (removed the tsc type-check gate).');
      }
    } catch { /* best-effort */ }
  }

  // default-import vs named-export mismatches (Vite "No matching export" errors)
  try {
    const fixed = repairDefaultExports(projectPath);
    if (fixed.length > 0) emit(`🔧 Added missing default export(s) to: ${fixed.join(', ')}.`);
  } catch { /* best-effort */ }

  // missing <Router> context (useNavigate/<Link> without a Router → blank page)
  try {
    const routerFixed = ensureRouterContext(projectPath);
    if (routerFixed.length > 0) emit(`🔧 Wrapped app in <HashRouter>: ${routerFixed.join(', ')}.`);
  } catch { /* best-effort */ }

  // named-import vs default-export mismatches (mirror image of the above)
  try {
    const fixedNamed = repairNamedExports(projectPath);
    if (fixedNamed.length > 0) emit(`🔧 Added missing named export(s) to: ${fixedNamed.join(', ')}.`);
  } catch { /* best-effort */ }

  // CSS @apply rules referencing undeclared custom Tailwind color shades
  try {
    const fixedColors = repairTailwindColors(projectPath);
    if (fixedColors.length > 0) emit(`🔧 Added missing Tailwind color shade(s): ${fixedColors.join(', ')}.`);
  } catch { /* best-effort */ }
}

/**
 * Build the app in a way that tolerates AI-code type errors. Tries the
 * project's own build first; on failure falls back to a direct `vite build`
 * (which skips `tsc`). Returns true if a dist/ bundle was produced.
 */
async function buildResiliently(projectPath: string, base: string, emit: (m: string) => void): Promise<boolean> {
  emit('🏗️ Building for production...');
  try {
    await run(`npm run build -- --base=${base}`, projectPath);
  } catch {
    emit('⚠️ Standard build failed — retrying with a direct Vite build (skipping type-check)...');
    try {
      await run(`npx --yes vite build --base=${base}`, projectPath);
    } catch (e: any) {
      emit(`❌ Vite build failed: ${String(e.message || e).slice(0, 200)}`);
      return false;
    }
  }
  return fs.existsSync(path.join(projectPath, 'dist'));
}


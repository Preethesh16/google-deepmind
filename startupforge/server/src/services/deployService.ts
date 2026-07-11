import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { Socket } from 'socket.io';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import { repairDefaultExports, ensureRouterContext } from './projectRepair';

const execAsync = promisify(exec);

/**
 * Auto-repair tsconfig.json so AI-generated code doesn't fail `tsc`.
 * Disables noUnusedLocals / noUnusedParameters which the model often
 * generates but then violates in its own code.
 */
function repairTsConfig(projectPath: string, socket: Socket): void {
  const tsc = path.join(projectPath, 'tsconfig.json');
  if (!fs.existsSync(tsc)) return;

  try {
    let raw = fs.readFileSync(tsc, 'utf-8');
    let changed = false;

    // Flip the two strict-lint flags to false so AI code compiles
    const fixes: [RegExp, string][] = [
      [/"noUnusedLocals"\s*:\s*true/g, '"noUnusedLocals": false'],
      [/"noUnusedParameters"\s*:\s*true/g, '"noUnusedParameters": false'],
    ];

    for (const [pattern, replacement] of fixes) {
      if (pattern.test(raw)) {
        raw = raw.replace(pattern, replacement);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(tsc, raw, 'utf-8');
      socket.emit('deploy:progress', {
        step: 0,
        message: '🔧 Auto-repaired tsconfig.json (disabled noUnusedLocals/noUnusedParameters)',
      });
    }
  } catch {
    // Non-fatal — best-effort repair
  }
}

/**
 * Ensure index.html has the Vite entry <script> tag.
 * Without it React never mounts → white page.
 */
function ensureEntryScript(projectPath: string, socket: Socket): void {
  const indexHtml = path.join(projectPath, 'index.html');
  if (!fs.existsSync(indexHtml)) return;

  let html = fs.readFileSync(indexHtml, 'utf-8');
  if (/<script[^>]*type=["']module["'][^>]*src=/.test(html)) return;

  const entry = ['src/main.tsx', 'src/main.jsx', 'src/main.ts', 'src/index.tsx', 'src/index.jsx']
    .find(e => fs.existsSync(path.join(projectPath, e)));

  if (entry && /<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `    <script type="module" src="/${entry}"></script>\n  </body>`);
    fs.writeFileSync(indexHtml, html, 'utf-8');
    socket.emit('deploy:progress', {
      step: 0,
      message: `🔧 Auto-fixed index.html — added <script type="module" src="/${entry}">`,
    });
  }
}

/**
 * tsconfig.json's standard Vite template references a project file
 * "./tsconfig.node.json" (for vite.config.ts's own TS settings). The model
 * frequently generates tsconfig.json with that reference but forgets to
 * also generate tsconfig.node.json — Vite then fails immediately on dev
 * server start with ENOENT, producing a blank error overlay. Auto-create a
 * standard one if it's referenced but missing.
 */
function ensureTsconfigNodeJson(projectPath: string, socket: Socket): void {
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  const nodeConfigPath = path.join(projectPath, 'tsconfig.node.json');
  if (!fs.existsSync(tsconfigPath) || fs.existsSync(nodeConfigPath)) return;

  try {
    const raw = fs.readFileSync(tsconfigPath, 'utf-8');
    const referencesIt = /tsconfig\.node\.json/.test(raw);
    if (!referencesIt) return;

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
    socket.emit('deploy:progress', {
      step: 0,
      message: '🔧 Auto-created missing tsconfig.node.json (was referenced by tsconfig.json but never generated)',
    });
  } catch {
    // Non-fatal — best-effort repair
  }
}

/**
 * Wait until a TCP port is accepting connections (or timeout).
 * Returns true if the port became reachable within maxMs.
 */
function waitForPort(port: number, maxMs = 15000): Promise<boolean> {
  const start = Date.now();
  return new Promise(resolve => {
    const check = () => {
      const s = net.createConnection({ port, host: '127.0.0.1' });
      s.once('connect', () => { s.destroy(); resolve(true); });
      s.once('error', () => {
        s.destroy();
        if (Date.now() - start > maxMs) return resolve(false);
        setTimeout(check, 500);
      });
    };
    check();
  });
}

export async function deployMVP(projectPath: string, socket: Socket): Promise<{
  url: string;
  isLocal: boolean;
}> {
  // ── Validate project path ────────────────────────────────────────────
  if (!projectPath || !path.isAbsolute(projectPath) || !fs.existsSync(projectPath)) {
    const msg = `Cannot deploy: project path "${projectPath}" does not exist. Build the MVP first.`;
    socket.emit('deploy:error', { message: msg });
    throw new Error(msg);
  }

  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    const msg = `Cannot deploy: no package.json in "${projectPath}". The build may have produced no files.`;
    socket.emit('deploy:error', { message: msg });
    throw new Error(msg);
  }

  socket.emit('deploy:start', { message: '⚡ Starting deployment...' });

  // ── Pre-flight repairs ───────────────────────────────────────────────
  repairTsConfig(projectPath, socket);
  ensureEntryScript(projectPath, socket);
  ensureTsconfigNodeJson(projectPath, socket);

  // Fix default-import/named-export mismatches that make Vite fail at startup
  // ("No matching export ... for import 'default'").
  try {
    const fixedExports = repairDefaultExports(projectPath);
    if (fixedExports.length > 0) {
      socket.emit('deploy:progress', {
        step: 0,
        message: `🔧 Auto-added missing default export(s) to: ${fixedExports.join(', ')}`,
      });
    }
  } catch { /* non-fatal */ }

  // Fix missing <Router> context — components that use useNavigate/<Link> but
  // no BrowserRouter/HashRouter is rendered ("useNavigate() may be used only in
  // the context of a <Router> component") — by wrapping <App /> in a HashRouter.
  try {
    const routerFixed = ensureRouterContext(projectPath);
    if (routerFixed.length > 0) {
      socket.emit('deploy:progress', {
        step: 0,
        message: `🔧 Wrapped app in <HashRouter> for react-router context: ${routerFixed.join(', ')}`,
      });
    }
  } catch { /* non-fatal */ }

  // ── Step 1: Install dependencies ─────────────────────────────────────
  try {
    socket.emit('deploy:progress', { step: 1, message: '📦 Installing dependencies...' });
    await execAsync('npm install --legacy-peer-deps', {
      cwd: projectPath,
      timeout: 180000, // 3 min max
      env: { ...process.env, NODE_ENV: 'development' },
    });
    socket.emit('deploy:progress', { step: 1, message: '✅ Dependencies installed' });
  } catch (err: any) {
    const errMsg = err.stderr || err.message || 'Unknown npm error';
    socket.emit('deploy:progress', {
      step: 1,
      message: `❌ npm install failed: ${errMsg.slice(0, 300)}`,
    });
    // If npm install fails, don't try to start the dev server — it will 100% fail
    throw new Error(`npm install failed: ${errMsg.slice(0, 200)}`);
  }

  // ── Step 2: Try Vercel deployment ────────────────────────────────────
  if (process.env.VERCEL_TOKEN) {
    try {
      socket.emit('deploy:progress', { step: 2, message: '🌐 Deploying to Vercel...' });

      const { stdout } = await execAsync(
        `vercel --yes --token=${process.env.VERCEL_TOKEN} --name=${path.basename(projectPath)}`,
        { cwd: projectPath, timeout: 180000 }
      );

      // Extract URL from Vercel output
      const lines = stdout.split('\n');
      const urlLine = lines.find(l => l.includes('.vercel.app'));
      const deployUrl = urlLine?.trim() || '';

      if (deployUrl) {
        socket.emit('deploy:complete', {
          url: deployUrl,
          isLocal: false,
          message: `🎉 Deployed! Your MVP is live at: ${deployUrl}`
        });
        return { url: deployUrl, isLocal: false };
      }
    } catch (vercelError: any) {
      console.log('Vercel deploy failed:', vercelError.message);
      socket.emit('deploy:progress', {
        step: 2,
        message: '⚠️ Vercel deploy failed, starting local preview...'
      });
    }
  }

  // ── Step 3: Local dev server ─────────────────────────────────────────
  const port = 3456 + Math.floor(Math.random() * 100);
  const localUrl = `http://localhost:${port}`;

  socket.emit('deploy:progress', {
    step: 3,
    message: `🖥️ Starting local server on port ${port}...`
  });

  const child = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--host'], {
    cwd: projectPath,
    detached: true,
    stdio: 'ignore',
    shell: true
  });
  child.unref();

  // Actually wait for the server to be ready (up to 15s)
  const ready = await waitForPort(port, 15000);

  if (ready) {
    socket.emit('deploy:complete', {
      url: localUrl,
      isLocal: true,
      port,
      message: `✅ MVP running locally at: ${localUrl} (also reachable on your LAN via this machine's IP)`
    });
  } else {
    socket.emit('deploy:complete', {
      url: localUrl,
      isLocal: true,
      port,
      message: `⚠️ Server started on port ${port} but readiness check timed out. Try opening ${localUrl} manually.`
    });
  }

  return { url: localUrl, isLocal: true };
}

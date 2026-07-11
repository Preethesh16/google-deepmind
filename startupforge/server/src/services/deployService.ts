import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { Socket } from 'socket.io';
import * as path from 'path';

const execAsync = promisify(exec);

export async function deployMVP(projectPath: string, socket: Socket): Promise<{
  url: string;
  isLocal: boolean;
}> {

  socket.emit('deploy:start', { message: '⚡ Starting deployment...' });

  // Step 1: Install dependencies
  try {
    socket.emit('deploy:progress', { step: 1, message: '📦 Installing dependencies...' });
    await execAsync('npm install --legacy-peer-deps', {
      cwd: projectPath,
      timeout: 120000 // 2 min max
    });
    socket.emit('deploy:progress', { step: 1, message: '✅ Dependencies installed' });
  } catch (err: any) {
    socket.emit('deploy:progress', { step: 1, message: `⚠️ npm install warning: ${err.message}` });
    // Continue anyway — might still work
  }

  // Step 2: Try Vercel deployment
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

  // Step 3: Fallback — start local dev server on a unique port, bound to the
  // network (--host) so it's reachable from other devices, not just loopback.
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

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 4000));

  socket.emit('deploy:complete', {
    url: localUrl,
    isLocal: true,
    port,
    message: `✅ MVP running locally at: ${localUrl} (also reachable on your LAN via this machine's IP)`
  });

  return { url: localUrl, isLocal: true };
}

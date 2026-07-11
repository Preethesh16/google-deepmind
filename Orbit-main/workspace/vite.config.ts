import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Serve Preethesh's static landing pages (repo-root landing/) at /landing
// so the whole flow — landing → onboarding → workflow → dashboard — runs
// from this one dev server.
const landingDir = fileURLToPath(new URL('../landing', import.meta.url))

const mime: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

function serveLanding(): Plugin {
  return {
    name: 'serve-landing',
    configureServer(server) {
      server.middlewares.use('/landing', (req, res, next) => {
        // /landing (no trailing slash) breaks the pages' relative assets/
        // paths — they resolve against the site root and 404, leaving the
        // page unstyled. Redirect to /landing/.
        if ((req as { originalUrl?: string }).originalUrl === '/landing') {
          res.writeHead(301, { Location: '/landing/' })
          return res.end()
        }
        const urlPath = (req.url ?? '/').split('?')[0]
        let file = normalize(join(landingDir, urlPath === '/' ? 'index.html' : urlPath))
        if (!file.startsWith(landingDir)) return next()
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
        if (!existsSync(file)) return next()
        const ext = file.slice(file.lastIndexOf('.'))
        res.setHeader('Content-Type', mime[ext] ?? 'application/octet-stream')
        createReadStream(file).pipe(res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveLanding()],
  server: {
    port: 3001,
    // /mnt/* (WSL on a Windows drive) gets no inotify events — poll instead,
    // otherwise edits never hot-reload.
    watch: { usePolling: true, interval: 300 },
  },
})

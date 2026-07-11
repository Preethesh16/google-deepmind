import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import { db, listFeedback, getFeedback } from './db/database';
import {
  getGithubAccount, saveGithubAccount, clearGithubAccount, listProjects
} from './db/database';
import { compileBusinessContext } from './services/gemmaService';
import { runAntigravityBuild, sendFollowUpCommand } from './services/antigravityService';
import { deployMVP } from './services/deployService';
import {
  importFromExcel, syncToExcel, ensureWorkbookExists, getWorkbookPath,
  mapFeedbackRow, computeScore
} from './services/feedbackService';
import {
  isOAuthConfigured, buildAuthorizeUrl, exchangeCodeForToken, fetchGithubUser, publishToGithub
} from './services/githubService';
import crypto from 'crypto';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8 // 100MB for large context
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));

// ─── BUSINESS PROFILE ROUTES ───────────────────────────────────────────────

// Create or update business profile
app.post('/api/business', (req, res) => {
  const {
    businessName, founderName, industry, stage, location,
    problemStatement, solution, mission, vision, uniqueValueProp,
    productType, revenueModel, targetMarket, marketSize,
    preferredFrontend, preferredBackend, preferredDb, preferredCloud,
    designStyle, brandColors, githubRepoUrl, hasExistingCode
  } = req.body;

  const existing = db.prepare('SELECT id FROM business_profiles ORDER BY id DESC LIMIT 1').get() as any;

  if (existing) {
    db.prepare(`
      UPDATE business_profiles SET
        business_name=?, founder_name=?, industry=?, stage=?, location=?,
        problem_statement=?, solution=?, mission=?, vision=?, unique_value_prop=?,
        product_type=?, revenue_model=?, target_market=?, market_size=?,
        preferred_frontend=?, preferred_backend=?, preferred_db=?, preferred_cloud=?,
        design_style=?, brand_colors=?, github_repo_url=?, has_existing_code=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      businessName, founderName, industry, stage, location,
      problemStatement, solution, mission, vision, uniqueValueProp,
      productType, revenueModel, targetMarket, marketSize,
      preferredFrontend, preferredBackend, preferredDb, preferredCloud,
      designStyle, JSON.stringify(brandColors), githubRepoUrl, hasExistingCode ? 1 : 0,
      existing.id
    );
    return res.json({ id: existing.id, updated: true });
  } else {
    const result = db.prepare(`
      INSERT INTO business_profiles (
        business_name, founder_name, industry, stage, location,
        problem_statement, solution, mission, vision, unique_value_prop,
        product_type, revenue_model, target_market, market_size,
        preferred_frontend, preferred_backend, preferred_db, preferred_cloud,
        design_style, brand_colors, github_repo_url, has_existing_code
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      businessName, founderName, industry, stage, location,
      problemStatement, solution, mission, vision, uniqueValueProp,
      productType, revenueModel, targetMarket, marketSize,
      preferredFrontend, preferredBackend, preferredDb, preferredCloud,
      designStyle, JSON.stringify(brandColors), githubRepoUrl, hasExistingCode ? 1 : 0
    );
    return res.json({ id: result.lastInsertRowid, created: true });
  }
});

// Get business profile
app.get('/api/business/:id', (req, res) => {
  const business = db.prepare('SELECT * FROM business_profiles WHERE id = ?').get(req.params.id);
  const team = db.prepare('SELECT * FROM team_members WHERE business_id = ?').all(req.params.id);
  const features = db.prepare('SELECT * FROM core_features WHERE business_id = ? ORDER BY priority').all(req.params.id);
  const personas = db.prepare('SELECT * FROM user_personas WHERE business_id = ?').all(req.params.id);
  res.json({ business, team, features, personas });
});

// Team member endpoints
app.post('/api/business/:id/team', (req, res) => {
  const { name, role, skills, equity, linkedin, responsibilities } = req.body;
  const result = db.prepare(`
    INSERT INTO team_members (business_id, name, role, skills, equity, linkedin, responsibilities)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, name, role, JSON.stringify(skills || []), equity || 0, linkedin || '', JSON.stringify(responsibilities || []));
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/business/:id/team/:memberId', (req, res) => {
  db.prepare('DELETE FROM team_members WHERE id = ? AND business_id = ?').run(req.params.memberId, req.params.id);
  res.json({ deleted: true });
});

// Feature endpoints
app.post('/api/business/:id/features', (req, res) => {
  const { name, description, priority, isMvp } = req.body;
  const result = db.prepare(`
    INSERT INTO core_features (business_id, name, description, priority, is_mvp)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, name, description || '', priority || 1, isMvp ? 1 : 0);
  res.json({ id: result.lastInsertRowid });
});

app.delete('/api/business/:id/features/:featureId', (req, res) => {
  db.prepare('DELETE FROM core_features WHERE id = ? AND business_id = ?').run(req.params.featureId, req.params.id);
  res.json({ deleted: true });
});

// Compile context endpoint (calls Gemma)
app.get('/api/business/:id/context', async (req, res) => {
  try {
    const context = await compileBusinessContext(Number(req.params.id));
    res.json({ context });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get builds for a business
app.get('/api/business/:id/builds', (req, res) => {
  const builds = db.prepare('SELECT * FROM mvp_builds WHERE business_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ builds });
});

// ─── FEEDBACK / FIX CENTER ROUTES ──────────────────────────────────────────

// List all feedback, ranked by status + priority x urgency score
app.get('/api/feedback', (_req, res) => {
  const items = (listFeedback() as any[]).map(mapFeedbackRow);
  const stats = {
    total: items.length,
    open: items.filter((i) => i.status === 'open').length,
    fixing: items.filter((i) => i.status === 'fixing').length,
    pending: items.filter((i) => i.status === 'pending_approval').length,
    completed: items.filter((i) => i.status === 'completed').length,
    rejected: items.filter((i) => i.status === 'rejected').length
  };
  res.json({ items, stats, workbook: getWorkbookPath() });
});

// Add a single feedback item (simulates a Google Form / web form submission)
app.post('/api/feedback', (req, res) => {
  const {
    userName = '', email = '', projectPath = '', category = 'bug',
    message, priority = 'medium', urgency = 'normal', source = 'form'
  } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  const score = computeScore(priority, urgency);
  const externalId = `manual|${email}|${Date.now()}`;
  const result = db.prepare(`
    INSERT INTO feedback
      (external_id, source, user_name, email, project_path, category, message,
       priority, urgency, score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
  `).run(externalId, source, userName, email, projectPath, category, message,
    priority, urgency, score);
  const item = mapFeedbackRow(getFeedback(result.lastInsertRowid as number));
  io.emit('feedback:updated', { item });
  res.json({ id: result.lastInsertRowid, item });
});

// Re-import from the Excel workbook (Google Form export)
app.post('/api/feedback/import', (_req, res) => {
  try {
    const result = importFromExcel();
    const items = (listFeedback() as any[]).map(mapFeedbackRow);
    io.emit('feedback:refreshed', { items });
    res.json({ ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Write current statuses back to the Excel workbook
app.post('/api/feedback/sync', (_req, res) => {
  try {
    const result = syncToExcel();
    res.json({ ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PROJECT LIBRARY ────────────────────────────────────────────────────────

// List every generated MVP (one row per unique project folder), newest first
app.get('/api/projects', (_req, res) => {
  const rows = listProjects() as any[];
  const projects = rows.map((r) => ({
    buildId: r.build_id,
    businessId: r.business_id,
    businessName: r.business_name,
    industry: r.industry,
    stage: r.stage,
    status: r.status,
    projectPath: r.project_path,
    deployUrl: r.deploy_url,
    githubUrl: r.github_url,
    githubPagesUrl: r.github_pages_url,
    filesCreated: JSON.parse(r.files_created || '[]'),
    commandUsed: r.command_used,
    createdAt: r.created_at
  }));
  res.json({ projects });
});

// ─── GITHUB CONNECT / PUBLISH ───────────────────────────────────────────────

const GITHUB_STATE_SECRET = crypto.randomBytes(16).toString('hex');

// Where to send the user after the GitHub OAuth callback
function githubCallbackUrl(req: express.Request): string {
  return process.env.GITHUB_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/github/callback`;
}

app.get('/api/github/status', (_req, res) => {
  const account = getGithubAccount() as any;
  res.json({
    connected: !!account,
    username: account?.username || null,
    avatarUrl: account?.avatar_url || null,
    oauthConfigured: isOAuthConfigured()
  });
});

// Step 1: client is redirected here, which redirects to GitHub's authorize page
app.get('/api/github/auth-url', (req, res) => {
  if (!isOAuthConfigured()) {
    return res.status(400).json({ error: 'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET, or use "Connect with token" instead.' });
  }
  const url = buildAuthorizeUrl(githubCallbackUrl(req), GITHUB_STATE_SECRET);
  res.json({ url });
});

// Step 2: GitHub redirects back here with ?code=...
app.get('/api/github/callback', async (req, res) => {
  const { code } = req.query as { code?: string };
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  if (!code) return res.redirect(`${clientUrl}/dashboard?github=error`);

  try {
    const token = await exchangeCodeForToken(code, githubCallbackUrl(req));
    const user = await fetchGithubUser(token);
    saveGithubAccount({ username: user.username, avatarUrl: user.avatarUrl, accessToken: token });
    res.redirect(`${clientUrl}/dashboard?github=connected`);
  } catch (error: any) {
    console.error('GitHub OAuth callback failed:', error.message);
    res.redirect(`${clientUrl}/dashboard?github=error`);
  }
});

// Fallback for users who don't want to register an OAuth App: paste a PAT.
app.post('/api/github/token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const user = await fetchGithubUser(token);
    saveGithubAccount({ username: user.username, avatarUrl: user.avatarUrl, accessToken: token });
    res.json({ connected: true, username: user.username, avatarUrl: user.avatarUrl });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid GitHub token: ' + (error.response?.data?.message || error.message) });
  }
});

app.post('/api/github/disconnect', (_req, res) => {
  clearGithubAccount();
  res.json({ disconnected: true });
});

// ─── VOICE — Sarvam AI speech-to-text proxy ────────────────────────────────
// Keeps the Sarvam key server-side. The client records mic audio, encodes it
// to 16kHz mono WAV, and posts it here as base64. We forward it to Sarvam and
// return the transcript so it can populate the command bar.
app.post('/api/voice/transcribe', async (req, res) => {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Voice transcription is not configured. Set SARVAM_API_KEY in server/.env.' });
  }

  const { audio, mimeType, language } = req.body as {
    audio?: string; mimeType?: string; language?: string;
  };
  if (!audio) return res.status(400).json({ error: 'audio (base64) is required' });

  try {
    // Strip a possible data-URL prefix, then decode to a binary buffer.
    const b64 = audio.includes(',') ? audio.split(',')[1] : audio;
    const buffer = Buffer.from(b64, 'base64');

    const form = new FormData();
    const type = mimeType || 'audio/wav';
    const ext = type.includes('wav') ? 'wav' : type.includes('mp3') ? 'mp3' : type.includes('webm') ? 'webm' : 'wav';
    form.append('file', new Blob([buffer], { type }), `command.${ext}`);
    form.append('model', process.env.SARVAM_STT_MODEL || 'saarika:v2');
    // 'unknown' lets saarika auto-detect the spoken language (Hindi / English / etc.)
    form.append('language_code', language || 'unknown');

    const resp = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey },
      body: form,
    });

    const raw = await resp.text();
    if (!resp.ok) {
      console.error('Sarvam STT error:', resp.status, raw);
      return res.status(502).json({ error: `Sarvam returned ${resp.status}`, detail: raw.slice(0, 300) });
    }

    let data: any = {};
    try { data = JSON.parse(raw); } catch { /* non-JSON body */ }
    const transcript = data.transcript ?? data.text ?? '';
    res.json({ transcript, languageCode: data.language_code || null });
  } catch (error: any) {
    console.error('Voice transcription failed:', error);
    res.status(500).json({ error: error.message || 'Transcription failed' });
  }
});

// ─── SOCKET.IO — MAIN ORCHESTRATION ───────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  /**
   * MAIN EVENT: User clicks "CREATE MVP" or sends a command
   * This is the full pipeline: Gemma → Antigravity → Deploy
   */
  socket.on('build:start', async (data: {
    businessId: number;
    command: string;
    autoDeploy: boolean;
    existingProjectPath?: string;
  }) => {
    const { businessId, command, autoDeploy, existingProjectPath } = data;

    // Create build record
    const buildResult = db.prepare(`
      INSERT INTO mvp_builds (business_id, status, command_used)
      VALUES (?, 'running', ?)
    `).run(businessId, command);
    const buildId = buildResult.lastInsertRowid as number;

    socket.emit('build:id', { buildId });

    try {
      // STEP 1: Compile business context directly from the profile
      socket.emit('gemma:start', {
        message: '📋 Compiling your business profile...',
        buildId
      });

      const context = await compileBusinessContext(businessId, (chars) => {
        socket.emit('gemma:progress', { chars, buildId });
      });

      socket.emit('gemma:complete', {
        message: '✅ Context compiled! Sending to Antigravity...',
        contextLength: context.length,
        buildId
      });

      // STEP 2: Determine project path
      const projectName = `mvp-${Date.now()}`;
      const projectPath = existingProjectPath || path.join(
        process.cwd(),
        process.env.GENERATED_MVPS_PATH || '../generated-mvps',
        projectName
      );

      db.prepare('UPDATE mvp_builds SET project_path = ? WHERE id = ?').run(projectPath, buildId);

      // STEP 3: Antigravity builds the MVP
      const buildOutput = await runAntigravityBuild({
        businessContext: context,
        command,
        projectPath,
        socket,
        buildId,
        repoUrl: existingProjectPath ?
          (db.prepare('SELECT github_repo_url FROM business_profiles WHERE id = ?').get(businessId) as any)?.github_repo_url
          : undefined
      });

      if (!buildOutput.success) {
        db.prepare('UPDATE mvp_builds SET status = ? WHERE id = ?').run('failed', buildId);
        return;
      }

      // Update build record
      db.prepare(`
        UPDATE mvp_builds SET
          status = 'built',
          files_created = ?
        WHERE id = ?
      `).run(JSON.stringify(buildOutput.filesCreated), buildId);

      // STEP 4: Auto-deploy if requested
      if (autoDeploy) {
        const { url, isLocal } = await deployMVP(projectPath, socket);

        db.prepare('UPDATE mvp_builds SET status = ?, deploy_url = ? WHERE id = ?')
          .run('deployed', url, buildId);

        socket.emit('build:done', {
          buildId,
          projectPath,
          deployUrl: url,
          isLocal,
          filesCreated: buildOutput.filesCreated,
          message: `🚀 MVP complete! ${isLocal ? 'Running at' : 'Live at'}: ${url}`
        });
      } else {
        socket.emit('build:done', {
          buildId,
          projectPath,
          filesCreated: buildOutput.filesCreated,
          message: `✅ Files written to ${projectPath}. Click Deploy to launch.`
        });
      }

    } catch (error: any) {
      console.error('Build pipeline error:', error);
      db.prepare('UPDATE mvp_builds SET status = ? WHERE id = ?').run('failed', buildId);
      socket.emit('build:error', { message: error.message, buildId });
    }
  });

  /**
   * Follow-up command: Add feature, fix bug, improve UI, etc.
   */
  socket.on('build:followup', async (data: {
    businessId: number;
    command: string;
    projectPath: string;
  }) => {
    const { businessId, command, projectPath } = data;

    const buildResult = db.prepare(`
      INSERT INTO mvp_builds (business_id, status, command_used, project_path)
      VALUES (?, 'running', ?, ?)
    `).run(businessId, command, projectPath);
    const buildId = buildResult.lastInsertRowid as number;

    socket.emit('build:id', { buildId });

    try {
      socket.emit('gemma:start', {
        message: '📋 Compiling your business profile...',
        buildId
      });

      const context = await compileBusinessContext(businessId, (chars) => {
        socket.emit('gemma:progress', { chars, buildId });
      });

      socket.emit('gemma:complete', {
        message: '✅ Context compiled! Sending to Antigravity...',
        contextLength: context.length,
        buildId
      });

      const result = await sendFollowUpCommand({
        businessContext: context,
        command,
        projectPath,
        socket,
        buildId
      });

      db.prepare(`
        UPDATE mvp_builds SET status = ?, files_created = ? WHERE id = ?
      `).run(result.success ? 'built' : 'failed', JSON.stringify(result.filesCreated), buildId);

      socket.emit('build:done', {
        buildId,
        projectPath,
        filesCreated: result.filesCreated,
        message: result.success
          ? `✅ Updated ${result.filesCreated.length} file(s) in ${projectPath}.`
          : `❌ Follow-up build failed: ${result.error}`
      });
    } catch (error: any) {
      console.error('Follow-up build error:', error);
      db.prepare('UPDATE mvp_builds SET status = ? WHERE id = ?').run('failed', buildId);
      socket.emit('build:error', { message: error.message, buildId });
    }
  });

  /**
   * Deploy an already-built project
   */
  socket.on('deploy:start', async (data: { projectPath: string; buildId: number }) => {
    try {
      const { url, isLocal } = await deployMVP(data.projectPath, socket);
      db.prepare('UPDATE mvp_builds SET status = ?, deploy_url = ? WHERE id = ?')
        .run('deployed', url, data.buildId);
      socket.emit('deploy:url', { url, isLocal });
    } catch (error: any) {
      socket.emit('deploy:error', { message: error.message, buildId: data.buildId });
    }
  });

  // ─── FEEDBACK: AUTONOMOUS FIX WORKFLOW ─────────────────────────────────────

  const emitFeedback = (id: number) => {
    const item = mapFeedbackRow(getFeedback(id));
    io.emit('feedback:updated', { item });
    return item;
  };

  /**
   * Autonomous fix: takes a feedback request, resolves a target project,
   * and runs the multi-agent pipeline (Planner → Builders → Critic → Fixer)
   * with the feedback text as the objective. On success the item moves to
   * `pending_approval` (admin must approve before it is ticked complete).
   */
  socket.on('feedback:fix', async (data: { feedbackId: number; businessId?: number; projectPath?: string }) => {
    const fb = getFeedback(data.feedbackId) as any;
    if (!fb) {
      socket.emit('feedback:error', { feedbackId: data.feedbackId, message: 'Feedback not found' });
      return;
    }
    if (fb.status === 'fixing') return; // already in progress

    // Resolve a business + a project path to fix.
    const business =
      (data.businessId && db.prepare('SELECT id FROM business_profiles WHERE id = ?').get(data.businessId) as any) ||
      (db.prepare('SELECT id FROM business_profiles ORDER BY id DESC LIMIT 1').get() as any);

    if (!business) {
      socket.emit('feedback:error', { feedbackId: fb.id, message: 'No business profile exists yet. Complete onboarding first.' });
      return;
    }

    const latestBuild = db.prepare(
      'SELECT project_path FROM mvp_builds WHERE business_id = ? AND project_path != \'\' ORDER BY created_at DESC LIMIT 1'
    ).get(business.id) as any;

    const projectPath = data.projectPath || fb.project_path || latestBuild?.project_path;
    if (!projectPath) {
      socket.emit('feedback:error', { feedbackId: fb.id, message: 'No generated project found to fix. Build an MVP first.' });
      return;
    }

    db.prepare('UPDATE feedback SET status = ?, project_path = ? WHERE id = ?')
      .run('fixing', projectPath, fb.id);
    emitFeedback(fb.id);

    const buildRow = db.prepare(`
      INSERT INTO mvp_builds (business_id, status, command_used, project_path)
      VALUES (?, 'running', ?, ?)
    `).run(business.id, `[FEEDBACK #${fb.id}] ${fb.message}`, projectPath);
    const buildId = buildRow.lastInsertRowid as number;

    db.prepare('UPDATE feedback SET build_id = ? WHERE id = ?').run(buildId, fb.id);
    socket.emit('feedback:fix_started', { feedbackId: fb.id, buildId, projectPath });

    try {
      const context = await compileBusinessContext(business.id);

      const command = `A user submitted this ${fb.category} report (priority ${fb.priority}, urgency ${fb.urgency}):\n"${fb.message}"\n\nDiagnose the root cause in the existing project and fix it. Only output files that must be created or modified.`;

      const result = await sendFollowUpCommand({
        businessContext: context,
        command,
        projectPath,
        socket,
        buildId
      });

      db.prepare('UPDATE mvp_builds SET status = ?, files_created = ? WHERE id = ?')
        .run(result.success ? 'built' : 'failed', JSON.stringify(result.filesCreated), buildId);

      if (result.success) {
        const summary = `Resolved by the agent team — ${result.filesCreated.length} file(s) updated.`;
        db.prepare(`
          UPDATE feedback SET status = 'pending_approval', files_changed = ?, fix_summary = ?, fixed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(JSON.stringify(result.filesCreated), summary, fb.id);
        emitFeedback(fb.id);
        try { syncToExcel(); } catch { /* non-fatal */ }
        socket.emit('feedback:fix_complete', { feedbackId: fb.id, filesChanged: result.filesCreated });
      } else {
        db.prepare('UPDATE feedback SET status = ? WHERE id = ?').run('open', fb.id);
        emitFeedback(fb.id);
        socket.emit('feedback:error', { feedbackId: fb.id, message: result.error || 'Fix failed' });
      }
    } catch (error: any) {
      console.error('Feedback fix error:', error);
      db.prepare('UPDATE mvp_builds SET status = ? WHERE id = ?').run('failed', buildId);
      db.prepare('UPDATE feedback SET status = ? WHERE id = ?').run('open', fb.id);
      emitFeedback(fb.id);
      socket.emit('feedback:error', { feedbackId: fb.id, message: error.message });
    }
  });

  /** Admin approves a completed fix → ticked + statuses written back to Excel. */
  socket.on('feedback:approve', (data: { feedbackId: number; autoDeploy?: boolean }) => {
    const fb = getFeedback(data.feedbackId) as any;
    if (!fb) return;
    db.prepare(`UPDATE feedback SET status = 'completed', approved_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(fb.id);
    const item = mapFeedbackRow(getFeedback(fb.id));
    io.emit('feedback:updated', { item });
    try { syncToExcel(); } catch { /* non-fatal */ }

    if (data.autoDeploy && fb.project_path) {
      deployMVP(fb.project_path, socket)
        .then(({ url, isLocal }) => socket.emit('deploy:url', { url, isLocal }))
        .catch((e) => socket.emit('deploy:error', { message: e.message }));
    }
  });

  /** Admin rejects a fix → back to the open queue for another attempt. */
  socket.on('feedback:reject', (data: { feedbackId: number }) => {
    const fb = getFeedback(data.feedbackId) as any;
    if (!fb) return;
    db.prepare(`UPDATE feedback SET status = 'open', build_id = NULL WHERE id = ?`).run(fb.id);
    const item = mapFeedbackRow(getFeedback(fb.id));
    io.emit('feedback:updated', { item });
    try { syncToExcel(); } catch { /* non-fatal */ }
  });

  // ─── GITHUB: PUSH + PUBLISH ──────────────────────────────────────────────

  socket.on('github:publish', async (data: {
    projectPath: string;
    repoName: string;
    isPrivate?: boolean;
    buildId?: number;
  }) => {
    const account = getGithubAccount() as any;
    if (!account) {
      socket.emit('github:error', { message: 'Connect your GitHub account first.' });
      return;
    }
    if (!data.projectPath || !fs.existsSync(data.projectPath)) {
      socket.emit('github:error', { message: 'No project to publish — build an MVP first.' });
      return;
    }

    const repoName = (data.repoName || path.basename(data.projectPath)).replace(/[^a-zA-Z0-9._-]/g, '-');

    try {
      socket.emit('github:start', { message: `🐙 Publishing "${repoName}" to GitHub...` });
      const result = await publishToGithub({
        token: account.access_token,
        projectPath: data.projectPath,
        repoName,
        isPrivate: !!data.isPrivate,
        socket
      });

      if (data.buildId) {
        db.prepare('UPDATE mvp_builds SET github_url = ?, github_pages_url = ? WHERE id = ?')
          .run(result.repoUrl, result.pagesUrl, data.buildId);
      }

      socket.emit('github:complete', {
        repoUrl: result.repoUrl,
        pagesUrl: result.pagesUrl,
        message: `🎉 Published to GitHub! Repo: ${result.repoUrl}${result.pagesUrl ? ` · Live: ${result.pagesUrl}` : ''}`
      });
    } catch (error: any) {
      console.error('GitHub publish error:', error);
      socket.emit('github:error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Seed the sample feedback workbook and import it on boot so the Fix Center
// has data immediately (before any Google Form is connected).
try {
  ensureWorkbookExists();
  const r = importFromExcel();
  console.log(`📗 Feedback loaded from Excel — ${r.imported} new, ${r.updated} updated, ${r.total} total.`);
} catch (e: any) {
  console.warn('⚠️ Feedback import skipped:', e.message);
}

const PORT = Number(process.env.PORT) || 3001;
httpServer.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🚀 StartupForge Server RUNNING      ║
  ║   Port: ${PORT}                          ║
  ║   Gemma: ${process.env.OLLAMA_URL}
  ║   Model: ${process.env.GEMMA_MODEL}
  ╚═══════════════════════════════════════╝
  `);
});

// If the port is momentarily still held (e.g. a fast nodemon restart before the
// previous process fully released the socket), retry instead of hard-crashing.
httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️ Port ${PORT} busy, retrying in 1s...`);
    setTimeout(() => {
      httpServer.close();
      httpServer.listen(PORT);
    }, 1000);
  } else {
    console.error('HTTP server error:', err);
  }
});

// Release the port cleanly on shutdown so restarts don't collide.
const shutdown = () => {
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

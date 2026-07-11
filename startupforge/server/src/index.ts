import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import { db } from './db/database';
import { compileBusinessContext } from './services/gemmaService';
import { runAntigravityBuild, sendFollowUpCommand } from './services/antigravityService';
import { deployMVP } from './services/deployService';

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
      // STEP 1: Gemma compiles context
      socket.emit('gemma:start', {
        message: '🧠 Gemma reading your business profile...',
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
        message: '🧠 Gemma reading your business profile...',
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
    const { url, isLocal } = await deployMVP(data.projectPath, socket);
    db.prepare('UPDATE mvp_builds SET status = ?, deploy_url = ? WHERE id = ?')
      .run('deployed', url, data.buildId);
    socket.emit('deploy:url', { url, isLocal });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

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

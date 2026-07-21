import express from 'express';
import cors from 'cors';
import { db } from './db.js';
import { StartupContext, AgentMessage, ExecutionTask, Conflict } from 'orbit-core';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { registerCreative } from './creative.js';
import { exec } from 'child_process';

const __dirnameServer = dirname(fileURLToPath(import.meta.url));

// Simple local .env parser
if (existsSync('.env')) {
  try {
    const envLines = readFileSync('.env', 'utf8').split('\n');
    for (const line of envLines) {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (key) {
          process.env[key] = value;
        }
      }
    }
  } catch (err) {
    console.error('Error loading .env file:', err);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Helper: Get active context
function getContext(workspaceId: string): StartupContext {
  const row = db.prepare("SELECT context_data FROM context_snapshots WHERE workspace_id = ?").get(workspaceId) as { context_data: string } | undefined;
  
  if (row) {
    return JSON.parse(row.context_data) as StartupContext;
  }

  // Create default fallback context
  const defaultContext: StartupContext = {
    workspaceId,
    companyName: 'Acme Workspace',
    founderProfile: {
      vision: 'A simple SaaS platform',
      technicalSkillLevel: 'intermediate',
      location: 'Bangalore, India',
      preferences: {}
    },
    business: {
      niche: 'B2B Analytics',
      targetMarket: 'Small business owners',
      stage: 'Research',
      validationScore: 0,
      tam: '$4.5 Billion',
      sam: '$820 Million'
    },
    product: {
      features: [],
      techStack: ['React', 'Node', 'SQLite'],
      userStories: [],
      activeRoadmap: []
    },
    financials: {
      runwayMonths: 12,
      burnRate: 1500,
      breakEvenTarget: 10000,
      budgetAllocations: { engineering: 40, marketing: 30, sales: 20, operations: 10 },
      infrastructureCost: 150,
      subscriptionCost: 80
    },
    marketing: {
      campaigns: [],
      brandVoice: 'Professional, Trustworthy',
      taglines: [],
      targetKeywords: []
    },
    sales: {
      leads: [],
      activePipelineValue: 0,
      proposalCount: 0
    },
    customerSuccess: {
      tickets: [],
      overallSentimentScore: 100,
      churnRiskIndex: 0
    },
    legal: {
      companyIncorporated: false,
      trademarkStatus: 'unfiled',
      riskRating: 'Low',
      generatedContracts: []
    },
    technical: {
      buildStatus: 'idle',
      buildLogs: [],
      testSuiteStats: { passed: 0, failed: 0, coverage: 0 }
    },
    updatedAt: new Date().toISOString()
  };

  db.prepare("INSERT INTO context_snapshots (workspace_id, context_data) VALUES (?, ?)").run(
    workspaceId,
    JSON.stringify(defaultContext)
  );

  return defaultContext;
}

// Helper: Save context
function saveContext(workspaceId: string, context: StartupContext) {
  context.updatedAt = new Date().toISOString();
  db.prepare("UPDATE context_snapshots SET context_data = ?, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ?").run(
    JSON.stringify(context),
    workspaceId
  );
}

// -----------------------------------------------------------------
// WORKSPACE ENDPOINTS
// -----------------------------------------------------------------
app.get('/api/workspace', (req, res) => {
  const rows = db.prepare("SELECT * FROM workspaces").all();
  res.json(rows);
});

app.post('/api/workspace', (req, res) => {
  const { id, name, ownerId } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'ID and Name required' });
  }
  db.prepare("INSERT INTO workspaces (id, name, owner_id) VALUES (?, ?, ?)").run(id, name, ownerId || 'founder-1');
  res.json({ success: true, workspaceId: id });
});

// -----------------------------------------------------------------
// CONTEXT ENGINE ENDPOINTS
// -----------------------------------------------------------------
app.get('/api/context', (req, res) => {
  const workspaceId = (req.query.workspaceId as string) || 'default-workspace';
  res.json(getContext(workspaceId));
});

app.post('/api/context', (req, res) => {
  const workspaceId = (req.body.workspaceId as string) || 'default-workspace';
  const updatedContext = req.body.context as StartupContext;
  
  if (!updatedContext) {
    return res.status(400).json({ error: 'Context body is required' });
  }

  saveContext(workspaceId, updatedContext);
  res.json({ success: true });
});

// -----------------------------------------------------------------
// TASKS & EXECUTION ENDPOINTS
// -----------------------------------------------------------------
app.get('/api/tasks', (req, res) => {
  const workspaceId = (req.query.workspaceId as string) || 'default-workspace';
  const rows = db.prepare("SELECT * FROM tasks WHERE workspace_id = ?").all() as any[];
  
  const parsedRows = rows.map(r => ({
    ...r,
    dependencies: JSON.parse(r.dependencies),
    risks: JSON.parse(r.risks),
    suggestedNext: JSON.parse(r.suggested_next)
  }));

  res.json(parsedRows);
});

app.get('/api/logs', (req, res) => {
  const logs = db.prepare("SELECT * FROM local_agent_communication_log ORDER BY timestamp DESC LIMIT 100").all();
  res.json(logs.map((l: any) => ({
    ...l,
    payload: JSON.parse(l.payload)
  })));
});

app.get('/api/conflicts', (req, res) => {
  const rows = db.prepare("SELECT * FROM conflicts").all();
  res.json(rows);
});

app.post('/api/conflicts/resolve', (req, res) => {
  const { conflictId, resolution } = req.body;
  if (!conflictId || !resolution) {
    return res.status(400).json({ error: 'conflictId and resolution required' });
  }
  db.prepare("UPDATE conflicts SET resolution = ?, status = 'resolved' WHERE id = ?").run(resolution, conflictId);
  
  // Log the conflict resolution
  db.prepare(`
    INSERT INTO local_agent_communication_log (message_id, sender, recipient, action, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'msg-resolve-' + Math.random().toString(36).substring(7),
    'founder',
    'conflict-resolver',
    'RESOLVE_CONFLICT',
    JSON.stringify({ conflictId, resolution })
  );

  res.json({ success: true });
});

// -----------------------------------------------------------------
// GEMMA PRIVATE VAULT ENDPOINTS
// -----------------------------------------------------------------
app.get('/api/vault', (req, res) => {
  const rows = db.prepare("SELECT * FROM local_secure_vault ORDER BY created_at DESC").all();
  res.json(rows);
});

app.post('/api/vault', (req, res) => {
  const { id, keyType, encryptedPayload } = req.body;
  if (!id || !keyType || !encryptedPayload) {
    return res.status(400).json({ error: 'id, keyType and encryptedPayload required' });
  }
  db.prepare("INSERT INTO local_secure_vault (id, key_type, encrypted_payload) VALUES (?, ?, ?)").run(
    id, keyType, encryptedPayload
  );
  res.json({ success: true });
});

app.post('/api/launch-startupforge', (req, res) => {
  exec('start "" "d:\\google deepmind\\startupforge\\start.bat"', { cwd: 'd:\\google deepmind\\startupforge' }, (error) => {
    if (error) {
      console.error(`Error launching StartupForge: ${error.message}`);
    }
  });
  res.json({ success: true });
});

// -----------------------------------------------------------------
// DYNAMIC WORKFLOW SIMULATION LOOP
// -----------------------------------------------------------------
app.post('/api/execution/trigger', async (req, res) => {
  const workspaceId = (req.body.workspaceId as string) || 'default-workspace';
  const { objective, companyName } = req.body;

  if (!objective) {
    return res.status(400).json({ error: 'Objective is required' });
  }

  // Clear previous runs
  db.prepare("DELETE FROM tasks WHERE workspace_id = ?").run(workspaceId);
  db.prepare("DELETE FROM local_agent_communication_log").run();
  db.prepare("DELETE FROM conflicts").run();

  const ctx = getContext(workspaceId);
  ctx.founderProfile.vision = objective;
  if (companyName) {
    ctx.companyName = companyName;
  }
  ctx.founderProfile.preferences = ctx.founderProfile.preferences || {};
  if (req.body.track) {
    ctx.founderProfile.preferences.track = req.body.track;
  }
  ctx.business.stage = (req.body.track === 'startup') ? 'Document Ingestion' : 'Research';
  ctx.business.validationScore = 0;
  ctx.product.features = [];
  ctx.product.userStories = [];
  ctx.product.activeRoadmap = [];
  ctx.technical.buildStatus = 'idle';
  ctx.technical.buildLogs = [];
  ctx.technical.testSuiteStats = { passed: 0, failed: 0, coverage: 0 };
  saveContext(workspaceId, ctx);

  // Setup the task graph in database
  const flowSteps: Omit<ExecutionTask, 'status' | 'startedAt' | 'completedAt'>[] = [
    {
      id: 'task-research',
      title: 'Analyze Competitors & TAM/SAM Market Size',
      department: 'Research',
      dependencies: [],
      costImpact: 20,
      confidenceScore: 92,
      reasoning: 'Sourcing B2B reports, calculating target customer volumes.',
      risks: ['Market saturation by incumbent competitors'],
      suggestedNext: ['task-validation'],
      durationEstimateMs: 2500
    },
    {
      id: 'task-validation',
      title: 'Conduct PMF Surveys & Landing Page Validations',
      department: 'Validation',
      dependencies: ['task-research'],
      costImpact: 15,
      confidenceScore: 90,
      reasoning: 'Publishing landing pages, running budget analysis and ICP feasibility audits.',
      risks: [],
      suggestedNext: ['task-brand'],
      durationEstimateMs: 2000
    },
    {
      id: 'task-brand',
      title: 'Formulate Brand Identity & Typography Tokens',
      department: 'Brand',
      dependencies: ['task-validation'],
      costImpact: 10,
      confidenceScore: 89,
      reasoning: 'Constructing brand style cards and theme variables.',
      risks: [],
      suggestedNext: ['task-finance'],
      durationEstimateMs: 2000
    },
    {
      id: 'task-finance',
      title: 'Compute Budget Allocations & SaaS Pricing model',
      department: 'Finance',
      dependencies: ['task-brand'],
      costImpact: 5,
      confidenceScore: 95,
      reasoning: 'Modelling infrastructure break-even goals.',
      risks: ['Underestimating backend scale costs'],
      suggestedNext: ['task-design'],
      durationEstimateMs: 2000
    },
    {
      id: 'task-design',
      title: 'Assemble Google Stitch Layout components',
      department: 'Design',
      dependencies: ['task-finance'],
      costImpact: 40,
      confidenceScore: 90,
      reasoning: 'Publishing design system and wireframe coordinates.',
      risks: [],
      suggestedNext: ['task-engineering'],
      durationEstimateMs: 2500
    },
    {
      id: 'task-engineering',
      title: 'Generate React 19 Frontend & API schemas',
      department: 'Engineering',
      dependencies: ['task-design'],
      costImpact: 150,
      confidenceScore: 85,
      reasoning: 'Synthesizing types, SQLite models, and route logic.',
      risks: ['Integration errors with backend endpoints'],
      suggestedNext: ['task-qa'],
      durationEstimateMs: 3000
    },
    {
      id: 'task-qa',
      title: 'Run Integration Smoke Tests & Validation audits',
      department: 'QA',
      dependencies: ['task-engineering'],
      costImpact: 20,
      confidenceScore: 97,
      reasoning: 'Validating compilation scripts and page route maps.',
      risks: [],
      suggestedNext: [],
      durationEstimateMs: 1500
    }
  ];

  // Save steps into tasks table
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, workspace_id, title, department, status, dependencies, cost_impact, confidence_score, reasoning, risks, suggested_next, duration_estimate_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const step of flowSteps) {
    insertTask.run(
      step.id,
      workspaceId,
      step.title,
      step.department,
      'pending',
      JSON.stringify(step.dependencies),
      step.costImpact,
      step.confidenceScore,
      step.reasoning,
      JSON.stringify(step.risks),
      JSON.stringify(step.suggestedNext),
      step.durationEstimateMs
    );
  }

  // Trigger Async simulator loop without blocking the API call
  runSimulatorLoop(workspaceId);

  res.json({ success: true, message: 'Simulation initialized' });
});

// Async Simulation Loop
async function runSimulatorLoop(workspaceId: string) {
  const steps = ['task-ops', 'task-research', 'task-brand', 'task-finance', 'task-design', 'task-engineering', 'task-qa'];

  const logMsg = db.prepare(`
    INSERT INTO local_agent_communication_log (message_id, sender, recipient, action, payload)
    VALUES (?, ?, ?, ?, ?)
  `);

  const updateTaskStatus = db.prepare(`
    UPDATE tasks 
    SET status = ?, started_at = ?, completed_at = ? 
    WHERE id = ? AND workspace_id = ?
  `);

  for (const stepId of steps) {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND workspace_id = ?").get(stepId, workspaceId) as any;
    if (!task) continue;

    // Start Task
    const now = new Date().toISOString();
    updateTaskStatus.run('inprogress', now, null, stepId, workspaceId);
    
    logMsg.run(
      `msg-${stepId}-start`,
      task.department.toLowerCase(),
      'operations',
      'TASK_STARTED',
      JSON.stringify({ stepId, title: task.title, timestamp: now })
    );

    // Wait simulated duration
    await new Promise(resolve => setTimeout(resolve, task.duration_estimate_ms));

    // Update business context dynamically depending on task
    const ctx = getContext(workspaceId);
    const obj = ctx.founderProfile.vision.toLowerCase();

    // Default values
    let niche = 'B2B Analytics SaaS';
    let target = 'Small business owners';
    let tam = '$4.5 Billion';
    let sam = '$820 Million';
    let brandVoice = 'Professional, Trustworthy';
    let taglines = ['Automate the Core', 'Empowered by Orbit'];
    let companyName = ctx.companyName && ctx.companyName !== 'Acme Workspace' && ctx.companyName !== 'AcmeTech'
      ? ctx.companyName
      : (ctx.founderProfile.vision.split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') || 'AcmeTech');

    if (obj.includes('farm') || obj.includes('agri') || obj.includes('crop') || obj.includes('garden')) {
      niche = 'AgriTech Automation';
      target = 'Farming cooperatives & distributors';
      tam = '$320 Million';
      sam = '$45 Million';
      brandVoice = 'Organic, Grounded, Efficient';
      taglines = ['Grown from Code', 'Harvesting Automation'];
      companyName = 'AgriGrow';
    } else if (obj.includes('pet') || obj.includes('dog') || obj.includes('cat') || obj.includes('animal')) {
      niche = 'PetCare SaaS & CRM';
      target = 'Veterinary clinics & pet resorts';
      tam = '$180 Million';
      sam = '$25 Million';
      brandVoice = 'Friendly, Compassionate, Safe';
      taglines = ['Care on Command', 'Unlocking Pet Operations'];
      companyName = 'PetPulse';
    } else if (obj.includes('drone') || obj.includes('delivery') || obj.includes('fleet') || obj.includes('transport')) {
      niche = 'Logistics & Fleet Dispatch';
      target = 'Local pharmacies & rapid delivery teams';
      tam = '$850 Million';
      sam = '$110 Million';
      brandVoice = 'High-velocity, Precision-driven, Fast';
      taglines = ['Speed as a Service', 'Drone dispatching solved'];
      companyName = 'DeltaFleet';
    } else if (obj.includes('school') || obj.includes('learn') || obj.includes('education') || obj.includes('teach')) {
      niche = 'EdTech Portal & LMS';
      target = 'Private tutors & local academies';
      tam = '$1.2 Billion';
      sam = '$150 Million';
      brandVoice = 'Encouraging, Clear, Informative';
      taglines = ['Education Accelerated', 'Knowledge at your side'];
      companyName = 'Academia';
    }

    if (stepId === 'task-research') {
      ctx.business.stage = 'Validation';
      ctx.business.validationScore = 84;
      ctx.business.tam = tam;
      ctx.business.sam = sam;
      ctx.companyName = companyName;
      ctx.business.niche = niche;
      ctx.business.targetMarket = target;
    } else if (stepId === 'task-validation') {
      ctx.business.stage = 'Brand';
    } else if (stepId === 'task-brand') {
      ctx.marketing.brandVoice = brandVoice;
      ctx.marketing.taglines = taglines;
    } else if (stepId === 'task-finance') {
      ctx.financials.runwayMonths = 18;
      ctx.financials.burnRate = obj.includes('farm') || obj.includes('pet') ? 950 : 1850;
      ctx.financials.budgetAllocations = { engineering: 50, marketing: 25, sales: 15, operations: 10 };
    } else if (stepId === 'task-design') {
      ctx.business.stage = 'Design';
      ctx.product.stitchCanvasId = 'stitch-canvas-500';
    } else if (stepId === 'task-engineering') {
      ctx.business.stage = 'Development';
      ctx.product.features = ['User Authentication', 'Database Registry', 'Context Pipeline'];
      ctx.product.userStories = [
        { id: 'us-1', title: 'Mount Local Secure SQLite Db', points: 5, status: 'done' },
        { id: 'us-2', title: 'Connect Privacy Gateway filter', points: 8, status: 'done' }
      ];
      ctx.technical.buildStatus = 'passed';
      ctx.technical.buildLogs = [
        '[Vite] Bundling workspace components...',
        '[Build] Core module successfully linked.',
        '[Server] Express instance ready on port 5000.',
        '[SQLite] database checks succeeded.'
      ];
    } else if (stepId === 'task-qa') {
      ctx.business.stage = 'Live';
      ctx.technical.testSuiteStats = { passed: 24, failed: 0, coverage: 91 };
      ctx.customerSuccess.tickets = [
        { id: 't-1', title: 'Initial setup questions', sentiment: 'neutral', status: 'closed' }
      ];
    }

    saveContext(workspaceId, ctx);

    // NOTE: the old demo used to seed a fake GDPR conflict here, which
    // blocked every real agent after each workspace launch. Removed —
    // conflicts should only come from actual agent disagreements now
    // (the Conflict Center and /api/conflicts/resolve still work).

    // Complete Task
    const end = new Date().toISOString();
    updateTaskStatus.run('completed', now, end, stepId, workspaceId);

    logMsg.run(
      `msg-${stepId}-complete`,
      task.department.toLowerCase(),
      'operations',
      'TASK_COMPLETED',
      JSON.stringify({ stepId, title: task.title, timestamp: end })
    );
  }
}

// Department Unlock Sequence List — must match the client roster
// (packages/client/src/App.tsx DEPT_SEQUENCE)
const DEPT_SEQUENCE = [
  'Research', 'Finance', 'Marketing', 'Creative', 'Deck', 'Code', 'Conflict'
];

// Complete department and unlock next
app.post('/api/context/complete', (req, res) => {
  const { workspaceId = 'default-workspace', currentDepartment } = req.body;
  if (!currentDepartment) {
    return res.status(400).json({ error: 'currentDepartment required' });
  }

  const ctx = getContext(workspaceId);
  const currentIndex = DEPT_SEQUENCE.findIndex(d => d.toLowerCase() === currentDepartment.toLowerCase());
  
  if (currentIndex === -1) {
    return res.status(400).json({ error: 'Invalid department' });
  }

  const nextIndex = (currentIndex + 1) % DEPT_SEQUENCE.length;
  const nextDept = DEPT_SEQUENCE[nextIndex];
  
  ctx.business.stage = nextDept as any;
  saveContext(workspaceId, ctx);

  // Log milestone
  db.prepare(`
    INSERT INTO local_agent_communication_log (message_id, sender, recipient, action, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'msg-milestone-' + Math.random().toString(36).substring(7),
    'operations',
    'all',
    'STAGE_COMPLETED',
    JSON.stringify({ 
      title: `${currentDepartment} stage signed off by founder. ${nextDept} operations unlocked.`,
      completedDept: currentDepartment,
      nextDept 
    })
  );

  res.json({ success: true, nextDepartment: nextDept });
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/* Final agent roster — a smart ecosystem for building AND scaling a real
   business. Departments removed from the dashboard keep no prompt here. */
const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  research: "You are the Research Agent with LIVE Google Search access. Do REAL research: current market sizes with sources, named competitors with actual prices, regulatory facts, demand signals. Debate the founder — why build this, who pays, why now. Ground every claim in what you actually find via search; cite what you found. Suggest both how to validate the idea AND how to scale it once validated.",
  finance: "You are the Financial Support Agent (CFO). Real-world money help: runway, burn, unit economics, pricing, GST/tax planning for Indian founders, funding options (bootstrapping vs angels vs schemes like Startup India seed fund). If budget is small, force cheaper setups and compute exact runway. Always show the math. Advise on scaling costs too: what breaks financially at 10x volume.",
  marketing: "You are the Marketing & Growth Agent. GTM plans, campaign ideas, growth loops, and channel strategy for real Indian + global markets. You are connected to a poster studio (Nano Banana image generation) and an ad-kit generator — when the founder wants creatives, tell them to use the Studio tab and propose the exact prompts to use. Focus on what scales: CAC vs LTV, organic loops, retention.",
  creative: "You are the Caption & Voice Agent. You write scroll-stopping captions (Instagram/LinkedIn/WhatsApp, in English + Hindi + regional languages when asked), ad scripts with hooks in the first 2 seconds, and voiceover scripts. You are wired to a TTS engine for real voiceovers — keep VO scripts under 40 words unless asked.",
  deck: "You are the Pitch Deck Agent. You build investor-grade decks: 10-slide structure (problem, solution, market, product, traction, model, competition, team, financials, ask). You are wired to a PPTX generator — produce tight, specific slide content from the live shared context (use the other agents' actual findings, not lorem ipsum).",
  code: "You are the Code Support Agent (integration point for Ashish's Antigravity track). For now: advise on tech stack, app architecture, and deployment for the founder's product; note that direct code-editing automation lands when the Antigravity integration ships.",
  conflict: "You are the Executive Board Mediator. Resolve disputes between agents, detail tradeoffs, and suggest compromises to unlock execution.",
  operations: "You are the COO of Orbit. Own the roadmap, stage gates, and timelines across all agents. Direct, pragmatic, organized."
};

// Cross-agent shared memory: what every other department has been doing,
// plus any founder-uploaded context documents. Injected into every agent
// prompt so agents genuinely know about each other's work.
export function getSharedAgentContext(workspaceId: string): string {
  const logs = db.prepare("SELECT sender, recipient, action, payload FROM local_agent_communication_log ORDER BY timestamp DESC LIMIT 14").all() as any[];
  const activity = logs.reverse().map((l) => {
    let detail = '';
    try {
      const p = JSON.parse(l.payload);
      detail = (p.title || p.text || p.response || '').toString().slice(0, 160);
    } catch { /* raw payload */ }
    return `- [${l.sender} → ${l.recipient}] ${l.action}: ${detail}`;
  }).join('\n');

  let docs = '';
  try {
    const idxPath = join(__dirnameServer, '../uploads/index.json');
    if (existsSync(idxPath)) {
      const idx = JSON.parse(readFileSync(idxPath, 'utf8')) as any[];
      docs = idx.map((d) => `- ${d.filename}: ${d.summary || d.preview || ''}`.slice(0, 600)).join('\n');
    }
  } catch { /* no docs yet */ }

  return `Recent cross-agent activity (other departments' work — reference it, don't repeat it):
${activity || '- (no activity yet)'}

Founder-uploaded context documents:
${docs || '- (none uploaded yet)'}`;
}

// Call Gemini API helper — real model, key via header, optional Google
// Search grounding for agents that need live real-world data.
async function callGemini(
  systemInstruction: string,
  userMessage: string,
  chatHistory: string,
  contextData: any,
  opts: { useSearch?: boolean; workspaceId?: string } = {}
): Promise<string> {
  const model = 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const systemPrompt = `System Role Context:
${systemInstruction}

You are one agent in Orbit — an ecosystem of AI agents helping real-world founders build AND scale businesses. Be concrete and actionable: real numbers, real next steps, real Indian-market context where relevant. Coordinate with the other agents' work shown below instead of duplicating it.

Active Startup Context Snapshot:
- Company Name: ${contextData.companyName}
- Target Market: ${contextData.business.targetMarket}
- Niche: ${contextData.business.niche}
- Stage: ${contextData.business.stage}
- Runway: ${contextData.financials.runwayMonths} months
- Burn Rate: $${contextData.financials.burnRate}/mo
- Vision: ${contextData.founderProfile.vision}

${getSharedAgentContext(opts.workspaceId || 'default-workspace')}

Chat History Memory:
${chatHistory}

Founder: ${userMessage}
Agent:`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: systemPrompt }]
          }
        ],
        ...(opts.useSearch ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2500
        }
      })
    });
    
    if (!res.ok) {
      console.warn(`Gemini API returned status ${res.status}. Using local mock logic.`);
      return '';
    }
    
    const data = await res.json() as any;
    // Grounded responses can span multiple parts — join them all
    const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('');
    return text ? text.trim() : '';
  } catch (err) {
    console.error('Gemini API call failed:', err);
    return '';
  }
}

// Brand Pitch Deck Endpoints
app.get('/api/brand/pitchdeck', (req, res) => {
  const { workspaceId = 'default-workspace' } = req.query;
  const ctx = getContext(workspaceId as string);
  res.json({ pitchDeck: ctx.pitchDeck || [] });
});

app.post('/api/brand/pitchdeck', (req, res) => {
  const { workspaceId = 'default-workspace', pitchDeck } = req.body;
  if (!Array.isArray(pitchDeck)) {
    return res.status(400).json({ error: 'pitchDeck must be an array' });
  }
  const ctx = getContext(workspaceId);
  ctx.pitchDeck = pitchDeck;
  saveContext(workspaceId, ctx);
  res.json({ success: true, pitchDeck });
});

// Finance spreadsheet download API
app.get('/api/finance/excel', (req, res) => {
  const { workspaceId = 'default-workspace' } = req.query;
  const ctx = getContext(workspaceId as string);

  // Generate beautiful CSV layout representable in Excel
  const csvRows = [
    ['Orbit Autonomous OS - Financial Planning Worksheet'],
    ['Company Name', ctx.companyName],
    ['Startup Niche', ctx.business.niche],
    ['Target Audience', ctx.business.targetMarket],
    ['Current Phase', ctx.business.stage],
    [],
    ['Key Financial Metrics'],
    ['Metric Name', 'Monthly Value / Duration', 'Details'],
    ['Cash Runway', `${ctx.financials.runwayMonths} Months`, 'Duration before funding required'],
    ['Burn Rate', `$${ctx.financials.burnRate}`, 'Average monthly outgoings'],
    ['Stitch Cloud Hosting', `$${ctx.financials.infrastructureCost}`, 'Infrastructure operational cost'],
    ['Agent SaaS Keys', `$${ctx.financials.subscriptionCost}`, 'Gemini context sync subscriptions'],
    [],
    ['Budget Allocations (%)'],
    ['Department', 'Allocation Percentage'],
    ['Engineering', `${ctx.financials.budgetAllocations.engineering || 40}%`],
    ['Marketing', `${ctx.financials.budgetAllocations.marketing || 30}%`],
    ['Sales', `${ctx.financials.budgetAllocations.sales || 20}%`],
    ['Operations', `${ctx.financials.budgetAllocations.operations || 10}%`],
  ];

  const csvContent = csvRows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="financial_plan.csv"');
  res.send(csvContent);
});

// Finance spreadsheet refinement API using Gemini
app.post('/api/finance/refine', async (req, res) => {
  const { workspaceId = 'default-workspace', prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const ctx = getContext(workspaceId);
  
  // Call Gemini to refine metrics
  const systemInstruction = `You are a startup CFO. The founder wants to refine the budget based on this prompt: "${prompt}". 
Format the response ONLY as a clean, single-line JSON block containing exactly the keys:
- burnRate (number)
- runwayMonths (number)
- infrastructureCost (number)
- subscriptionCost (number)
- budgetAllocations (object with keys: engineering, marketing, sales, operations as numbers sum to 100)`;

  const responseText = await callGemini(systemInstruction, `Update the budget plan accordingly: ${prompt}`, "", ctx);
  
  if (responseText) {
    try {
      // Find JSON block in output
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = responseText.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        
        if (typeof parsed.burnRate === 'number') ctx.financials.burnRate = parsed.burnRate;
        if (typeof parsed.runwayMonths === 'number') ctx.financials.runwayMonths = parsed.runwayMonths;
        if (typeof parsed.infrastructureCost === 'number') ctx.financials.infrastructureCost = parsed.infrastructureCost;
        if (typeof parsed.subscriptionCost === 'number') ctx.financials.subscriptionCost = parsed.subscriptionCost;
        if (parsed.budgetAllocations) {
          ctx.financials.budgetAllocations = {
            engineering: parsed.budgetAllocations.engineering || ctx.financials.budgetAllocations.engineering,
            marketing: parsed.budgetAllocations.marketing || ctx.financials.budgetAllocations.marketing,
            sales: parsed.budgetAllocations.sales || ctx.financials.budgetAllocations.sales,
            operations: parsed.budgetAllocations.operations || ctx.financials.budgetAllocations.operations,
          };
        }
        
        saveContext(workspaceId, ctx);
      }
    } catch (err) {
      console.error('Failed to parse refined financial JSON from Gemini:', err);
    }
  }

  res.json({ success: true, context: ctx });
});

// Context-aware chatbot API
app.post('/api/chat', async (req, res) => {
  const { department, message, workspaceId = 'default-workspace' } = req.body;
  
  if (!department || !message) {
    return res.status(400).json({ error: 'department and message required' });
  }

  const ctx = getContext(workspaceId);
  const normalizedMsg = message.toLowerCase();
  const tasks = db.prepare("SELECT * FROM tasks WHERE workspace_id = ?").all(workspaceId) as any[];
  const conflicts = db.prepare("SELECT * FROM conflicts WHERE workspace_id = ?").all(workspaceId) as any[];

  // 1. Log user's chat message to database to maintain history
  const userMsgId = 'msg-chat-usr-' + Math.random().toString(36).substring(7);
  db.prepare(`
    INSERT INTO local_agent_communication_log (message_id, sender, recipient, action, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    userMsgId,
    'founder',
    department.toLowerCase(),
    'CHAT_MESSAGE',
    JSON.stringify({ text: message })
  );

  // 2. Fetch past conversations for context memory
  const rawPastLogs = db.prepare(`
    SELECT sender, payload FROM local_agent_communication_log 
    WHERE (sender = 'founder' AND recipient = ?) OR (sender = ? AND recipient = 'founder')
    ORDER BY timestamp ASC LIMIT 6
  `).all(department.toLowerCase(), department.toLowerCase()) as any[];

  const chatHistory = rawPastLogs.map(l => {
    const parsed = JSON.parse(l.payload);
    return `${l.sender === 'founder' ? 'Founder' : department}: ${parsed.text || parsed.response || ''}`;
  }).join('\n');

  // Check if conflict is active and blocking progression
  const activeConflicts = conflicts.filter(c => c.status === 'active');
  if (activeConflicts.length > 0 && department.toLowerCase() !== 'conflict') {
    const blockMsg = `### [ALERT] Progress Blocked
An active dispute is currently pending inside the **Conflict Resolution Center**:
- **Topic**: *"${activeConflicts[0].topic}"*
- **Parties**: ${activeConflicts[0].party_a} vs ${activeConflicts[0].party_b}

Please navigate to the **Conflict Center** in the sidebar and resolve this dispute before we can proceed with any department actions.`;
    
    // Log agent response
    db.prepare(`
      INSERT INTO local_agent_communication_log (message_id, sender, recipient, action, payload)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'msg-chat-agt-' + Math.random().toString(36).substring(7),
      department.toLowerCase(),
      'founder',
      'CHAT_MESSAGE',
      JSON.stringify({ text: blockMsg })
    );

    return res.json({ response: blockMsg });
  }

  // 3. Try Gemini API first for high-quality conversational responses.
  //    Research gets live Google Search grounding for real-world data.
  const dept = department.toLowerCase();
  const systemPrompt = AGENT_SYSTEM_PROMPTS[dept] || `You are the ${department} agent.`;
  const apiResponse = await callGemini(systemPrompt, message, chatHistory, ctx, {
    useSearch: dept === 'research' || dept === 'marketing',
    workspaceId,
  });
  
  if (apiResponse) {
    // If user provides a budget limit, let's capture it dynamically in the SQLite context too
    if (department.toLowerCase() === 'finance' && (normalizedMsg.includes('lakh') || normalizedMsg.includes('300000') || normalizedMsg.includes('budget is') || normalizedMsg.includes('₹'))) {
      const match = normalizedMsg.match(/\d+/);
      const amount = match ? parseInt(match[0]) : 3;
      ctx.financials.burnRate = amount <= 3 ? 950 : 1850;
      ctx.financials.runwayMonths = amount <= 3 ? 10 : 18;
      ctx.financials.infrastructureCost = amount <= 3 ? 45 : 150;
      ctx.financials.subscriptionCost = amount <= 3 ? 30 : 80;
      saveContext(workspaceId, ctx);
    }

    // Log response to DB
    const agentMsgId = 'msg-chat-agt-' + Math.random().toString(36).substring(7);
    db.prepare(`
      INSERT INTO local_agent_communication_log (message_id, sender, recipient, action, payload)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      agentMsgId,
      department.toLowerCase(),
      'founder',
      'CHAT_MESSAGE',
      JSON.stringify({ response: apiResponse })
    );

    return res.json({ response: apiResponse });
  }

  // 4. Fallback to standard simulated response if Gemini API fails
  let response = '';

  switch (department.toLowerCase()) {
    case 'research':
      response = `### Research Analyst Brief (TAM: ${ctx.business.tam || '$4.5B'})
I am looking at our parameters for *"${ctx.founderProfile.vision}"*. Let's debate:
- **Scope reduction proposal**: Targeting a broad audience is a fast way to burn through budget. What if we narrow scope to target only **${ctx.business.targetMarket}** initially?
- **The Core Question**: Why hasn't an incumbent like Salesforce or a specialized regional competitor solved this pain point? What is our unfair technical advantage?
- **SaaS viability**: Since B2B margins are higher, let's keep this as a context-aware subscription model rather than a one-time service fee.
*How do you envision our target customer discovering us without high search ads expenditure?*`;
      break;

    case 'validation':
      response = `### Validation Lead Feasibility
Let's analyze product market fit for *${ctx.companyName}* (Feasibility Score: **${ctx.business.validationScore}%**):
- **Pricing Pushback**: I challenge our pricing plans. If we charge too low, customers will associate us with low-grade tools. Let's start with a high-premium tier ($199/mo) and offer a free-trial pilot to 20 select operators to validate actual value.
- **ICP Feasibility**: We should test if customers care about automated templates, or if they only care about compliance logs. I recommend deleting Feature X from the initial MVP scope to reduce delivery risk.
*What is your target validation timeline for our landing page test?*`;
      break;

    case 'competitor':
      response = `### Competitor Intelligence Ledger
Reviewing direct competitors in the **${ctx.business.niche}** sector:
- **Incumbent Gaps**: Most competitors rely on public APIs. Our local-first private memory vault (Gemma 4) is our primary USP.
- **Pricing Gap Opportunity**: Competing services charge per-agent seat. We can disrupt them by charging based on workspace consumption, making it 40% cheaper for small teams.
- **Positioning**: "The only private, off-grid AI operating system for scaling teams."`;
      break;

    case 'finance':
      if (normalizedMsg.includes('lakh') || normalizedMsg.includes('300000') || normalizedMsg.includes('budget is') || normalizedMsg.includes('₹')) {
        const match = normalizedMsg.match(/\d+/);
        const amount = match ? parseInt(match[0]) : 3;
        ctx.financials.burnRate = amount <= 3 ? 950 : 1850;
        ctx.financials.runwayMonths = amount <= 3 ? 10 : 18;
        ctx.financials.infrastructureCost = amount <= 3 ? 45 : 150;
        ctx.financials.subscriptionCost = amount <= 3 ? 30 : 80;
        saveContext(workspaceId, ctx);

        response = `### CFO Budget Optimization Alert (Fallback)
You entered a budget restriction of **₹${amount} Lakhs**. Here is our CFO plan:
1. **Infrastructure cost trimming**: Stitch hosting will be reduced to local SQLite caching ($45/mo).
2. **Hiring delay**: Freezing all builder roles. Orbit agents will execute research and QA.
3. **Runway extension**: Capping monthly burn rate at **$950/mo** to extend runway to **10 Months**.`;
      } else {
        response = `### CFO Financial Registry
Reviewing active numbers:
- **Remaining Runway**: **${ctx.financials.runwayMonths} Months**.
- **Monthly Burn**: **$${ctx.financials.burnRate}/month**.
- **Infra/Sub Allocation**: **$${ctx.financials.infrastructureCost}/mo** Stitch nodes, **$${ctx.financials.subscriptionCost}/mo** Gemini keys.
*Please specify your startup budget (e.g. "My budget is ₹3 Lakhs") so I can generate a customized financial planner.*`;
      }
      break;

    case 'legal':
      response = `### General Counsel Compliance Registry
Reviewing corporate parameters:
- **Required licenses**: We must register under GST local tax guidelines and create GDPR cookie consent policies.
- **Trademark risk**: The name *"${ctx.companyName}"* has low direct conflicts, but we should secure the domain registration immediately.
- Mapped compliance checklist and founder agreements inside the Gemma secure database.`;
      break;

    case 'brand':
      response = `### Brand Strategist Guide
Establishing visual attributes for *${ctx.companyName}*:
- **Tonality**: *"${ctx.marketing.brandVoice}"*.
- **Personality**: Grounded, highly precise, premium.
- **Taglines**: ${ctx.marketing.taglines.join(' | ')}.
- **Logo direction**: Monochromatic geometric token showing interconnected loops.
*Note: I can generate a Sales Pitch Deck to help us pitch this vision. Type 'Generate Pitch Deck' to review our slides.*`;
      break;

    case 'product':
      response = `### Product PM Backlog spec
MVP feature prioritisation:
- **Core MVP List**: User authentication, private database interfaces, local context pipelines.
- **Roadmap V1**: Adding Multi-workspace support and custom Stripe billing connectors.
- **PRD status**: Synced with Design Stitch coordinate outputs. Let's lock this sprint backlog.`;
      break;

    case 'design':
      response = `### Head of Design Layout
Google Stitch system layout variables:
- **Wireframes**: Created Obsidian dark dashboard layouts, with a 65% width chatbot frame and left sidebar.
- **Design system tokens**: Glassmorphic blur metrics, responsive grids, and standard Lucide icon placements.
- Stitch canvas sync verified.`;
      break;

    case 'engineering':
      response = `### Tech Lead Repo Report
Technical stack configurations:
- **Frontend**: React 19, TypeScript, TailwindCSS, Vite.
- **Backend & DB**: Node.js + Express with SQLite JSON emulator database.
- **Active Build**: **${ctx.technical.buildStatus}**.
- Watch compilation active. No code replication issues detected.`;
      break;

    case 'qa':
      response = `### QA Lead Testing Report
Build validation results:
- **Smoke Tests**: ${ctx.technical.testSuiteStats.passed} tests passed.
- **Code Coverage**: ${ctx.technical.testSuiteStats.coverage}% coverage rating.
- Recommending optimization of Vite dev server loading timers.`;
      break;

    case 'marketing':
      response = `### CMO Marketing Campaigns & Case Studies
Let's coordinate GTM campaigns for *${ctx.companyName}*:
- **Inspirational Reference**: Look at how **Slack** launched using invite-only previews, or how **Figma** grew through local design communities instead of paid ads. These worked because they built high organic word-of-mouth loops.
- **Original Campaign proposal**: We will launch a *Product Hunt invite-only early beta*. This leverages curiosity and ensures our small budget is spent on product rather than paid ads.
- **Nano Banana Assets**: Run the **Generate via Nano Banana** panel on the right to render lifestyle photography mockups and link our Instagram scheduler!`;
      break;

    case 'sales':
      response = `### Sales VP Outreach Pipeline
Lead discovery and conversion pipelines:
- **Cold Email template**: Mapped context-aware copy referencing specific paint points in B2B.
- **Outbound WhatsApp channels**: Custom short scripts initialized.
- **Pipeline value**: Mapped pipeline stages from discovery to won deals.`;
      break;

    case 'support':
      response = `### CS Support FAQ Database
Customer satisfaction logs:
- **FAQs**: Knowledge base loaded with setup guides.
- **Overall Sentiment**: **${ctx.customerSuccess.overallSentimentScore}/100**.
- **Churn Risk**: Low (**${ctx.customerSuccess.churnRiskIndex}%**).`;
      break;

    case 'analytics':
      response = `### Analytics CDO Reports
Visitor metrics:
- **KPI Funnel**: Tracking landing page CTR.
- **Heatmaps**: Click stream audits active.
- Growth dashboard synced with marketing calendars.`;
      break;

    case 'conflict':
      response = `### Conflict Executive Board Mediation
We are currently evaluating the dispute between **Legal** and **Marketing**:
- **Topic**: GDPR Cookies validation banner.
- **Parties**: Legal (requires cookies opt-in check) vs Marketing (insists opt-in reduces signup conversion).
*Choose Option A (Approve GDPR banner) or Option B (Approve Marketing signup) below to resolve the dispute and unlock the build pipeline.*`;
      break;

    default:
      response = `### ${department} Assistant
Context engine is synced. Active Stage is ${ctx.business.stage}. Tell me how I can assist you with our startup deliverables!`;
  }

  // Log response to DB
  const agentMsgId = 'msg-chat-agt-' + Math.random().toString(36).substring(7);
  db.prepare(`
    INSERT INTO local_agent_communication_log (message_id, sender, recipient, action, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    agentMsgId,
    department.toLowerCase(),
    'founder',
    'CHAT_MESSAGE',
    JSON.stringify({ response })
  );

  res.json({ response });
});

// Start Server
// Creative studio + context upload endpoints (posters, captions, voiceover,
// ad kit, PPTX deck, document upload) — see creative.ts
registerCreative(app, { getContext, getSharedContext: getSharedAgentContext, logAgentAction: (sender: string, action: string, detail: string) => {
  db.prepare(`
    INSERT INTO local_agent_communication_log (message_id, sender, recipient, action, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run('msg-' + Math.random().toString(36).substring(7), sender, 'founder', action, JSON.stringify({ title: detail }));
}});

app.listen(PORT, () => {
  console.log(`[Orbit Server] Running on http://localhost:${PORT}`);
});

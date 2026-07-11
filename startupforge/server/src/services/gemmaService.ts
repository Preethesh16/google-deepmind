import axios from 'axios';
import { getBusinessProfile, getTeamMembers, getCoreFeatures, getUserPersonas } from '../db/database';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const GEMMA_MODEL = process.env.GEMMA_MODEL || 'gemma4:e2b';

// If Gemma produces no new tokens for this long, we assume it's stuck and abort.
const IDLE_LIMIT_MS = 120_000;
// Absolute safety net so a hung connection can never block the pipeline forever.
const MAX_TOTAL_MS = 15 * 60_000;

/**
 * Send a prompt to the local Gemma model running via Ollama.
 * Uses Ollama's streaming NDJSON endpoint so slow/CPU-only machines don't
 * hit an arbitrary fixed timeout — we only abort if generation truly stalls.
 */
export async function queryGemma4(
  prompt: string,
  systemPrompt?: string,
  onProgress?: (chars: number) => void
): Promise<string> {
  const controller = new AbortController();
  let idleTimer: NodeJS.Timeout;
  const maxTimer = setTimeout(() => controller.abort(), MAX_TOTAL_MS);

  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => controller.abort(), IDLE_LIMIT_MS);
  };

  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: GEMMA_MODEL,
      system: systemPrompt || 'You are an expert startup advisor and technical architect.',
      prompt,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 4096
      }
    }, {
      responseType: 'stream',
      signal: controller.signal,
      timeout: 0
    });

    resetIdleTimer();

    let full = '';
    let buffer = '';
    let lastReportedAt = 0;

    await new Promise<void>((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        resetIdleTimer();
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.response) {
              full += json.response;
              if (onProgress && full.length - lastReportedAt > 150) {
                lastReportedAt = full.length;
                onProgress(full.length);
              }
            }
            if (json.done) resolve();
          } catch {
            // Ignore partial/malformed NDJSON lines — buffer will catch up.
          }
        }
      });
      response.data.on('end', () => resolve());
      response.data.on('error', (err: Error) => reject(err));
    });

    onProgress?.(full.length);
    return full;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Gemma (Ollama) is not running. Start it with: ollama run ${GEMMA_MODEL}`);
    }
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || controller.signal.aborted) {
      throw new Error(`Gemma stalled with no output for ${IDLE_LIMIT_MS / 1000}s. Check that "ollama run ${GEMMA_MODEL}" is responsive.`);
    }
    console.error('Gemma error:', error.message);
    throw error;
  } finally {
    clearTimeout(idleTimer!);
    clearTimeout(maxTimer);
  }
}

/**
 * Compiles all business data from SQLite into a rich context document
 * that Gemma enhances and validates before sending to Antigravity.
 * If Gemma is unavailable or stalls, we fall back to the raw profile
 * instead of blocking the whole build pipeline.
 */
export async function compileBusinessContext(
  businessId: number,
  onProgress?: (chars: number) => void
): Promise<string> {
  // Fetch all local data
  const business = getBusinessProfile(businessId) as any;
  if (!business) throw new Error(`Business profile ${businessId} not found`);

  const team = getTeamMembers(businessId) as any[];
  const features = getCoreFeatures(businessId) as any[];
  const personas = getUserPersonas(businessId) as any[];

  const rawProfile = `
COMPANY IDENTITY:
- Name: ${business.business_name}
- Founder: ${business.founder_name}
- Industry: ${business.industry}
- Stage: ${business.stage}
- Location: ${business.location}
${business.udyam_number ? `- Udyam Registration: ${business.udyam_number}` : ''}
${business.gst_number ? `- GST Number: ${business.gst_number}` : ''}

PROBLEM & SOLUTION:
- Problem: ${business.problem_statement}
- Solution: ${business.solution}
- USP: ${business.unique_value_prop}
- Mission: ${business.mission}
- Vision: ${business.vision}

MARKET:
- Target Market: ${business.target_market}
- Market Size: ${business.market_size}
- Revenue Model: ${business.revenue_model}

TEAM (${team.length} members):
${team.map(m => `
  ${m.name} — ${m.role}
  Skills: ${JSON.parse(m.skills || '[]').join(', ')}
  Equity: ${m.equity}%
  Responsibilities: ${JSON.parse(m.responsibilities || '[]').join(', ')}
`).join('\n')}

MVP FEATURES (${features.length} total):
${features.map((f, i) => `
  ${i + 1}. ${f.name} [Priority: ${f.priority}] [MVP: ${f.is_mvp ? 'YES' : 'LATER'}]
     ${f.description}
`).join('\n')}

USER PERSONAS:
${personas.map(p => `
  ${p.name}: ${p.description}
  Pain Points: ${JSON.parse(p.pain_points || '[]').join(', ')}
`).join('\n')}

TECHNICAL PREFERENCES:
- Frontend: ${business.preferred_frontend}
- Backend: ${business.preferred_backend}
- Database: ${business.preferred_db}
- Cloud/Deploy: ${business.preferred_cloud}
- Design Style: ${business.design_style}
- Brand Colors: ${JSON.parse(business.brand_colors || '[]').join(', ')}
- Product Type: ${business.product_type}

REPOSITORY STATUS:
${business.has_existing_code
  ? `EXISTING PROJECT: ${business.github_repo_url} — Extend only, do NOT delete existing code`
  : 'NEW PROJECT — Build from scratch, complete production-ready codebase'
}
  `;

  // Report completion immediately — context is compiled directly from the
  // profile. The Antigravity/Gemini API does all code generation; the local
  // Gemma model is intentionally NOT used in this pipeline.
  onProgress?.(rawProfile.length);

  return `
=== STARTUPFORGE CONTEXT DOCUMENT ===
Business ID: ${businessId}
Timestamp: ${new Date().toISOString()}

${rawProfile}

=== END OF CONTEXT DOCUMENT ===
  `.trim();
}

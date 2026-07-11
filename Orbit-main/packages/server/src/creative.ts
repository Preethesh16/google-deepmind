/* Creative studio + context-upload endpoints.
   Real integrations: Nano Banana (posters), Gemini TTS (voiceover),
   Veo 3.1 (ad video, with storyboard fallback), pptxgenjs (deck),
   gemini-3.5-flash (captions/summaries). Key comes from .env only. */
import type { Express } from 'express';
import express from 'express';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pptxgen from 'pptxgenjs';
// CJS/ESM interop: the runtime default export is the constructor
const PptxGenJS: any = (pptxgen as any).default ?? pptxgen;

const __dirnameCreative = dirname(fileURLToPath(import.meta.url));
const GEN_DIR = join(__dirnameCreative, '../uploads/generated');
const UPLOAD_DIR = join(__dirnameCreative, '../uploads');
const INDEX_PATH = join(UPLOAD_DIR, 'index.json');

const API = 'https://generativelanguage.googleapis.com/v1beta';
const key = () => process.env.GEMINI_API_KEY || '';

async function gemini(model: string, body: any): Promise<any> {
  const res = await fetch(`${API}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() },
    body: JSON.stringify(body),
  });
  return res.json();
}

function textOf(data: any): string {
  return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
}

function jsonOf(data: any): any {
  const t = textOf(data);
  const s = t.indexOf('{') !== -1 ? t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1) : '';
  const a = t.indexOf('[') !== -1 ? t.slice(t.indexOf('['), t.lastIndexOf(']') + 1) : '';
  try { return JSON.parse(s.length > a.length ? s : a); } catch { try { return JSON.parse(a || s); } catch { return null; } }
}

/* 16-bit PCM mono → WAV container */
function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function saveGenerated(name: string, buf: Buffer): string {
  mkdirSync(GEN_DIR, { recursive: true });
  writeFileSync(join(GEN_DIR, name), buf);
  return `/generated/${name}`;
}

function uid(): string {
  return Math.random().toString(36).substring(2, 9);
}

type Hooks = {
  getContext: (workspaceId: string) => any;
  getSharedContext: (workspaceId: string) => string;
  logAgentAction: (sender: string, action: string, detail: string) => void;
};

export function registerCreative(app: Express, hooks: Hooks) {
  app.use('/generated', express.static(GEN_DIR));

  // ── Marketing Agent → Nano Banana posters (multiple options) ──────────
  app.post('/api/marketing/poster', async (req, res) => {
    const { prompt, count = 2, workspaceId = 'default-workspace' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    const ctx = hooks.getContext(workspaceId);
    const full = `Professional marketing poster for "${ctx.companyName}". ${prompt}. High-quality advertising design, striking composition, readable typography.`;

    const options: { url: string }[] = [];
    const attempts = Math.min(Number(count) || 2, 3);
    const results = await Promise.all(
      Array.from({ length: attempts }, (_, i) =>
        gemini('nano-banana-pro-preview', {
          contents: [{ parts: [{ text: `${full} Variation ${i + 1}: ${i === 0 ? 'bold and loud' : i === 1 ? 'minimal and premium' : 'vibrant street style'}.` }] }],
        }).catch(() => null)
      )
    );
    for (const r of results) {
      const img = r?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      if (img) {
        const ext = img.inlineData.mimeType.includes('png') ? 'png' : 'jpg';
        options.push({ url: saveGenerated(`poster-${uid()}.${ext}`, Buffer.from(img.inlineData.data, 'base64')) });
      }
    }
    if (!options.length) return res.status(502).json({ error: 'Image generation failed — try a different prompt' });
    hooks.logAgentAction('marketing', 'POSTER_GENERATED', `${options.length} poster options: ${prompt.slice(0, 80)}`);
    res.json({ options });
  });

  // ── Caption & Voice Agent → captions + VO script ──────────────────────
  app.post('/api/creative/captions', async (req, res) => {
    const { product, platform = 'Instagram', language = 'English', workspaceId = 'default-workspace' } = req.body;
    if (!product) return res.status(400).json({ error: 'product required' });
    const ctx = hooks.getContext(workspaceId);
    const data = await gemini('gemini-3.5-flash', {
      contents: [{ parts: [{ text:
`You are the Caption & Voice Agent for ${ctx.companyName}.
${hooks.getSharedContext(workspaceId)}

Write for: ${product}. Platform: ${platform}. Language: ${language}.
Return ONLY JSON: {"captions":["3 scroll-stopping caption options with hooks + hashtags"],"voScript":"a punchy voiceover script under 40 words"}` }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 2500 },
    });
    const parsed = jsonOf(data);
    if (!parsed?.captions) return res.status(502).json({ error: 'caption generation failed' });
    hooks.logAgentAction('creative', 'CAPTIONS_GENERATED', `${platform}/${language}: ${product.slice(0, 80)}`);
    res.json(parsed);
  });

  // ── Caption & Voice Agent → real TTS voiceover ─────────────────────────
  app.post('/api/creative/voiceover', async (req, res) => {
    const { text, voice = 'Kore' } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const data = await gemini('gemini-2.5-flash-preview-tts', {
      contents: [{ parts: [{ text: `Say in an energetic ad-voiceover tone: ${text}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    });
    const aud = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (!aud) return res.status(502).json({ error: 'TTS failed', detail: JSON.stringify(data).slice(0, 200) });
    const rate = parseInt(aud.inlineData.mimeType.match(/rate=(\d+)/)?.[1] || '24000', 10);
    const url = saveGenerated(`voiceover-${uid()}.wav`, pcmToWav(Buffer.from(aud.inlineData.data, 'base64'), rate));
    hooks.logAgentAction('creative', 'VOICEOVER_GENERATED', text.slice(0, 80));
    res.json({ url });
  });

  // ── Marketing Agent → ad kit: captions + Veo video (storyboard fallback)
  app.post('/api/marketing/adkit', async (req, res) => {
    const { product, workspaceId = 'default-workspace' } = req.body;
    if (!product) return res.status(400).json({ error: 'product required' });
    const ctx = hooks.getContext(workspaceId);

    // Kick off Veo and captions in parallel
    const veoPromise = (async () => {
      try {
        const start = await fetch(`${API}/models/veo-3.1-fast-generate-preview:predictLongRunning`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() },
          body: JSON.stringify({ instances: [{ prompt: `8 second dynamic product ad for ${ctx.companyName}: ${product}. Energetic, modern, cinematic.` }] }),
        }).then(r => r.json());
        if (!start.name) return null;
        for (let i = 0; i < 18; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const op = await fetch(`${API}/${start.name}`, { headers: { 'x-goog-api-key': key() } }).then(r => r.json());
          if (op.done) {
            const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
              || op.response?.generatedVideos?.[0]?.video?.uri;
            if (!uri) return null;
            const vid = await fetch(uri, { headers: { 'x-goog-api-key': key() } });
            if (!vid.ok) return null;
            return saveGenerated(`ad-${uid()}.mp4`, Buffer.from(await vid.arrayBuffer()));
          }
        }
      } catch { /* fall through to storyboard */ }
      return null;
    })();

    const storyboardPromise = gemini('gemini-3.5-flash', {
      contents: [{ parts: [{ text: `Create a 5-shot ad video storyboard for: ${product} (brand: ${ctx.companyName}). Return ONLY JSON: {"shots":[{"scene":"...","onScreenText":"...","durationSec":2}]}` }] }],
    }).then(jsonOf).catch(() => null);

    const [videoUrl, storyboard] = await Promise.all([veoPromise, storyboardPromise]);
    hooks.logAgentAction('marketing', 'ADKIT_GENERATED', `${product.slice(0, 60)} — video: ${videoUrl ? 'rendered' : 'storyboard only'}`);
    res.json({ video: videoUrl, storyboard: storyboard?.shots || [], note: videoUrl ? 'Veo video rendered' : 'Veo unavailable on this key/quota — storyboard provided; retry later' });
  });

  // ── Pitch Deck Agent → real PPTX from live shared context ─────────────
  app.post('/api/deck/generate', async (req, res) => {
    const { workspaceId = 'default-workspace', focus = '' } = req.body;
    const ctx = hooks.getContext(workspaceId);
    const data = await gemini('gemini-3.5-flash', {
      contents: [{ parts: [{ text:
`You are the Pitch Deck Agent for ${ctx.companyName} (${ctx.business.niche}, targeting ${ctx.business.targetMarket}).
${hooks.getSharedContext(workspaceId)}
${focus ? `Founder's focus request: ${focus}` : ''}

Build a 10-slide investor deck grounded in the context above (use the other agents' actual findings).
Return ONLY JSON: {"slides":[{"title":"...","bullets":["3-4 short specific bullets"]}]}` }] }],
      generationConfig: { maxOutputTokens: 4000 },
    });
    const parsed = jsonOf(data);
    if (!parsed?.slides?.length) return res.status(502).json({ error: 'deck content generation failed' });

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: 13.3, height: 7.5 });
    pptx.layout = 'WIDE';
    const title = pptx.addSlide();
    title.background = { color: '111111' };
    title.addText(ctx.companyName, { x: 0.8, y: 2.6, w: 11.7, h: 1.2, fontSize: 54, bold: true, color: 'FFFFFF', fontFace: 'Arial' });
    title.addText(ctx.founderProfile.vision || ctx.business.niche, { x: 0.8, y: 4.0, w: 11.7, h: 0.8, fontSize: 20, color: 'FFB59B', fontFace: 'Arial' });
    for (const s of parsed.slides.slice(0, 12)) {
      const slide = pptx.addSlide();
      slide.background = { color: 'FFF8F6' };
      slide.addText(String(s.title || ''), { x: 0.8, y: 0.5, w: 11.7, h: 1.0, fontSize: 32, bold: true, color: 'A53600', fontFace: 'Arial' });
      slide.addText((s.bullets || []).map((b: string) => ({ text: String(b), options: { bullet: true, breakLine: true } })), { x: 0.9, y: 1.8, w: 11.5, h: 5.0, fontSize: 18, color: '261814', fontFace: 'Arial', lineSpacing: 32 });
    }
    mkdirSync(GEN_DIR, { recursive: true });
    const fname = `deck-${uid()}.pptx`;
    await pptx.writeFile({ fileName: join(GEN_DIR, fname) });
    hooks.logAgentAction('deck', 'DECK_GENERATED', `${parsed.slides.length} slides for ${ctx.companyName}`);
    res.json({ url: `/generated/${fname}`, slides: parsed.slides });
  });

  // ── Context upload → summarized into every agent's shared memory ──────
  app.post('/api/context/upload', async (req, res) => {
    const { filename, content, workspaceId = 'default-workspace' } = req.body;
    if (!filename || !content) return res.status(400).json({ error: 'filename and content required' });
    mkdirSync(UPLOAD_DIR, { recursive: true });

    // content is plain text or a data URL (base64)
    let text = String(content);
    let stored: Buffer;
    const dataUrl = text.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataUrl) {
      stored = Buffer.from(dataUrl[2], 'base64');
      text = dataUrl[1].startsWith('text') ? stored.toString('utf8') : '';
    } else {
      stored = Buffer.from(text, 'utf8');
    }
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    writeFileSync(join(UPLOAD_DIR, `${Date.now()}-${safe}`), stored);

    // Summarize so agents get the facts without the raw document
    let summary = '';
    if (text) {
      const data = await gemini('gemini-3.5-flash', {
        contents: [{ parts: [{ text: `Summarize this founder-uploaded business document in 3 factual bullet points (numbers, names, statuses):\n\n${text.slice(0, 12000)}` }] }],
        generationConfig: { maxOutputTokens: 1000 },
      }).catch(() => null);
      summary = data ? textOf(data).slice(0, 500) : '';
    }

    const idx: any[] = existsSync(INDEX_PATH) ? JSON.parse(readFileSync(INDEX_PATH, 'utf8')) : [];
    idx.push({ filename: safe, uploadedAt: new Date().toISOString(), summary: summary || `(binary file: ${filename})`, preview: text.slice(0, 200) });
    writeFileSync(INDEX_PATH, JSON.stringify(idx, null, 2));
    hooks.logAgentAction('operations', 'CONTEXT_UPLOADED', `${safe}: ${summary.slice(0, 100)}`);
    res.json({ success: true, summary });
  });

  app.get('/api/context/uploads', (req, res) => {
    res.json(existsSync(INDEX_PATH) ? JSON.parse(readFileSync(INDEX_PATH, 'utf8')) : []);
  });
}

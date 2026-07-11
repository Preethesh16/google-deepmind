import { GoogleGenAI } from '@google/genai';
import { Socket } from 'socket.io';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Google GenAI client
const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' });

// Model priority: Antigravity first, fallback to Gemini 2.0
const PRIMARY_MODEL = process.env.ANTIGRAVITY_MODEL || 'antigravity-preview-05-2026';
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || 'gemini-2.0-flash';
const PLACEHOLDER_KEYS = new Set(['', 'your_google_api_key_here', 'your_new_api_key_here']);

export interface BuildOptions {
  businessContext: string;
  command: string;
  projectPath: string;
  socket: Socket;
  buildId: number;
  repoUrl?: string;
}

export interface BuildResult {
  success: boolean;
  filesCreated: string[];
  projectPath: string;
  error?: string;
}

/**
 * Main Antigravity orchestration function.
 * Sends business context + command to the Antigravity/Gemini API.
 * Parses streamed output for ===FILE=== blocks.
 * Writes each file to disk as it's generated.
 * Emits real-time events via Socket.io.
 */
export async function runAntigravityBuild(options: BuildOptions): Promise<BuildResult> {
  const { businessContext, command, projectPath, socket, buildId } = options;

  if (PLACEHOLDER_KEYS.has(process.env.GOOGLE_API_KEY || '')) {
    const msg = 'GOOGLE_API_KEY is not set in server/.env. Get a key from aistudio.google.com/api-keys, add it, then restart the server.';
    socket.emit('antigravity:error', { message: msg, buildId });
    return { success: false, filesCreated: [], projectPath, error: msg };
  }

  // Create project directory
  fs.mkdirSync(projectPath, { recursive: true });

  socket.emit('antigravity:start', {
    message: '🤖 Antigravity agents initializing...',
    projectPath,
    buildId
  });

  const systemInstruction = `
You are an expert full-stack MVP builder powered by Antigravity orchestration.
You will receive a StartupForge Context Document describing a startup and their MVP requirements.
Your job is to build a COMPLETE, PRODUCTION-READY MVP web application.

CRITICAL OUTPUT FORMAT — You MUST use this exact format for every file:
===FILE: relative/path/to/file.ext===
[complete file content here — every line, no truncation]
===END_FILE===

After ALL files are written, output this exact line:
===BUILD_COMPLETE===

RULES:
1. Build COMPLETE files — never truncate or say "add more here"
2. Every file must be immediately runnable
3. Use the EXACT tech stack from the context
4. Match brand colors precisely in Tailwind config and CSS
5. Create responsive, mobile-first UI
6. Include proper TypeScript types everywhere
7. Add loading states, error handling, toast notifications
8. Make it feel like a real startup product, not a tutorial
9. Include a stunning landing page that matches the business
10. The app must work with: npm install && npm run dev

BUILD ORDER (always follow this):
1. package.json (with all dependencies)
2. vite.config.ts / next.config.ts (project config)
3. tailwind.config.js (with brand colors)
4. index.html
5. src/main.tsx
6. src/App.tsx (with routing)
7. src/index.css (global styles + fonts)
8. All page components
9. All UI components
10. All API/service files
11. All type definition files
12. .env.example (with required variables)
13. README.md (with setup instructions)
  `;

  const fullPrompt = `
${businessContext}

USER COMMAND: ${command}

${options.repoUrl
  ? `EXISTING REPO: ${options.repoUrl}
     ADD new features only. Do NOT delete or overwrite existing working code.
     First output an analysis of what to add, then output only new/modified files.`
  : `BUILD FROM SCRATCH: Create a complete, production-ready MVP.
     Include everything needed to run immediately with npm install && npm run dev.`
}

START BUILDING NOW. Output each file using ===FILE=== format immediately.
Do not add explanations between files. Build the complete application.
  `;

  const filesCreated: string[] = [];

  try {
    let result: BuildResult;
    try {
      result = await streamBuild(PRIMARY_MODEL, false, fullPrompt, systemInstruction, projectPath, socket, buildId, filesCreated);
    } catch (primaryErr: any) {
      console.warn(`⚠️ ${PRIMARY_MODEL} failed (${primaryErr.message}), falling back to ${FALLBACK_MODEL}`);
      socket.emit('antigravity:fallback', {
        message: `⚠️ ${PRIMARY_MODEL} unavailable (${primaryErr.message}). Retrying with ${FALLBACK_MODEL}...`
      });
      result = await streamBuild(FALLBACK_MODEL, true, fullPrompt, systemInstruction, projectPath, socket, buildId, filesCreated);
    }

    socket.emit('antigravity:complete', {
      filesCreated: result.filesCreated,
      projectPath,
      totalFiles: result.filesCreated.length,
      buildId,
      message: `✅ MVP built! ${result.filesCreated.length} files created.`
    });

    return result;
  } catch (error: any) {
    const errMsg = error.message || 'Unknown Antigravity error';
    socket.emit('antigravity:error', { message: errMsg, buildId });
    console.error('Antigravity error:', error);
    return { success: false, filesCreated, projectPath, error: errMsg };
  }
}

/**
 * Streams a single generation attempt from one model, parsing ===FILE=== blocks
 * and writing them to disk as they arrive. Throws on any failure so the caller
 * can retry with a fallback model.
 */
async function streamBuild(
  model: string,
  isFallback: boolean,
  fullPrompt: string,
  systemInstruction: string,
  projectPath: string,
  socket: Socket,
  buildId: number,
  filesCreated: string[]
): Promise<BuildResult> {
  socket.emit('antigravity:model', { model, isFallback });

  const streamResult = await genai.models.generateContentStream({
    model,
    config: {
      systemInstruction,
      maxOutputTokens: 65536,
      temperature: 0.8,
    },
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
  });

  // Stream processing state machine
  let buffer = '';
  let currentFilePath = '';
  let currentFileContent = '';
  let isInFileBlock = false;
  let totalChars = 0;

  for await (const chunk of streamResult) {
    const text = chunk.text || '';
    buffer += text;
    totalChars += text.length;

    // Emit raw chunk for the live terminal view
    socket.emit('antigravity:chunk', { text, totalChars });

    // Process buffer line by line
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete last line in buffer

    for (const line of lines) {
      // Detect file start marker
      if (line.startsWith('===FILE:') && line.trimEnd().endsWith('===')) {
        // Save previous file if exists
        if (currentFilePath && currentFileContent.trim()) {
          await writeFileToProject(projectPath, currentFilePath, currentFileContent, socket, filesCreated, buildId);
        }
        // Start new file
        currentFilePath = line.replace('===FILE:', '').replace(/===\s*$/, '').trim();
        currentFileContent = '';
        isInFileBlock = true;
        socket.emit('antigravity:file_start', { path: currentFilePath });
        continue;
      }

      // Detect file end marker
      if (line.trim() === '===END_FILE===' && isInFileBlock) {
        if (currentFilePath && currentFileContent.trim()) {
          await writeFileToProject(projectPath, currentFilePath, currentFileContent, socket, filesCreated, buildId);
        }
        currentFilePath = '';
        currentFileContent = '';
        isInFileBlock = false;
        continue;
      }

      // Detect build complete marker
      if (line.trim() === '===BUILD_COMPLETE===') {
        // Save any remaining file
        if (currentFilePath && currentFileContent.trim()) {
          await writeFileToProject(projectPath, currentFilePath, currentFileContent, socket, filesCreated, buildId);
        }
        return { success: true, filesCreated, projectPath };
      }

      // Accumulate file content
      if (isInFileBlock) {
        currentFileContent += line + '\n';
      }
    }
  }

  // Handle any remaining content in buffer
  if (currentFilePath && currentFileContent.trim()) {
    await writeFileToProject(projectPath, currentFilePath, currentFileContent, socket, filesCreated, buildId);
  }

  if (filesCreated.length === 0) {
    throw new Error(`${model} returned no ===FILE=== blocks — check the API key and model name are valid.`);
  }

  return { success: true, filesCreated, projectPath };
}


/**
 * Writes a single file to the project directory.
 * Emits socket event so UI can show it appearing live.
 */
async function writeFileToProject(
  projectPath: string,
  filePath: string,
  content: string,
  socket: Socket,
  filesCreated: string[],
  buildId: number
): Promise<void> {
  const fullPath = path.join(projectPath, filePath);

  // Create parent directories
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });

  // Write the file
  fs.writeFileSync(fullPath, content, 'utf-8');

  filesCreated.push(filePath);

  // Notify UI
  socket.emit('antigravity:file_written', {
    path: filePath,
    size: content.length,
    lines: content.split('\n').length,
    totalFiles: filesCreated.length,
    buildId
  });

  console.log(`📝 Written: ${filePath} (${content.length} chars)`);
}

/**
 * Send a follow-up command to Antigravity for an existing project.
 * Used for "fix bug", "add feature", "improve UI" commands.
 */
export async function sendFollowUpCommand(options: {
  businessContext: string;
  command: string;
  projectPath: string;
  socket: Socket;
  buildId: number;
}): Promise<BuildResult> {
  const { businessContext, command, projectPath, socket, buildId } = options;

  // Read existing file structure to give Antigravity context
  const existingFiles = getProjectFileTree(projectPath);

  const followUpPrompt = `
${businessContext}

EXISTING PROJECT at: ${projectPath}
Current file structure:
${existingFiles}

FOLLOW-UP COMMAND: ${command}

Analyze the existing project and make the requested changes.
Only output files that need to be CREATED or MODIFIED.
Do not output files that stay the same.
Use ===FILE=== format as before.
  `;

  return runAntigravityBuild({
    ...options,
    command: followUpPrompt,
  });
}

/**
 * Reads the file tree of an existing project directory
 */
function getProjectFileTree(projectPath: string, depth = 0, maxDepth = 4): string {
  if (depth > maxDepth || !fs.existsSync(projectPath)) return '';

  let tree = '';
  const entries = fs.readdirSync(projectPath);
  const skip = ['node_modules', '.git', 'dist', '.next', 'build'];

  for (const entry of entries) {
    if (skip.includes(entry)) continue;
    const fullPath = path.join(projectPath, entry);
    const stat = fs.statSync(fullPath);
    const indent = '  '.repeat(depth);

    if (stat.isDirectory()) {
      tree += `${indent}📁 ${entry}/\n`;
      tree += getProjectFileTree(fullPath, depth + 1, maxDepth);
    } else {
      tree += `${indent}📄 ${entry}\n`;
    }
  }

  return tree;
}

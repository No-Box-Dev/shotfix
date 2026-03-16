#!/usr/bin/env node
import { createServer } from 'node:http';
import { mkdir, writeFile, readFile, copyFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

import {
  initSessions, createSession, getSession, listSessions,
  updateStatus, addMessage, getMessages, getScreenshotPath,
  pruneOldSessions,
  type SessionCapture, type SessionStatus, type Message,
} from './sessions.js';
import { initConfig, loadConfig, saveConfig, loadApiKeys, setApiKey, getKeyStatus, getProviderModels, getDefaultModel } from './config.js';
import { getProvider } from './providers/index.js';

const PORT = 2847;
const VERSION = '0.1.0';

async function main() {
  const args = process.argv.slice(2);

  // --help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
  shotfix v${VERSION} — Visual AI input for developers

  Usage:
    shotfix [options]

  Options:
    --port <n>      Server port (default: 2847)
    --dir <path>    Captures directory (default: .shotfix/captures)
    --watch         Enable auto-fix watch mode
    --help, -h      Show this help

  Environment:
    GEMINI_API_KEY      Gemini API key for auto-fix
    ANTHROPIC_API_KEY   Claude API key
    OPENAI_API_KEY      OpenAI API key
`);
    process.exit(0);
  }

  const portArg = args.find((_, i) => args[i - 1] === '--port');
  const dirArg = args.find((_, i) => args[i - 1] === '--dir');
  const watchMode = args.includes('--watch');

  const port = portArg ? parseInt(portArg, 10) : PORT;
  const capturesDir = join(process.cwd(), dirArg || '.shotfix/captures');
  const shotfixDir = join(process.cwd(), '.shotfix');

  // Ensure directories exist
  await mkdir(capturesDir, { recursive: true });

  // Initialize sessions and config
  initSessions(shotfixDir);
  initConfig(shotfixDir);
  await loadConfig();

  // Write .gitignore for .shotfix/
  try {
    await writeFile(join(shotfixDir, '.gitignore'), 'captures/\nsessions/\n.env\nconfig.json\n', { flag: 'wx' });
  } catch {
    try {
      const existing = await readFile(join(shotfixDir, '.gitignore'), 'utf-8');
      let updated = existing;
      if (!updated.includes('.env')) updated = updated.trimEnd() + '\n.env\n';
      if (!updated.includes('sessions/')) updated = updated.trimEnd() + '\nsessions/\n';
      if (!updated.includes('config.json')) updated = updated.trimEnd() + '\nconfig.json\n';
      if (updated !== existing) await writeFile(join(shotfixDir, '.gitignore'), updated);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`  ⚠️ Could not update .gitignore: ${(e as Error).message}`);
      }
    }
  }

  // Prune old sessions on startup
  const pruned = await pruneOldSessions(7);
  if (pruned > 0) console.log(`  🧹 Pruned ${pruned} old session${pruned === 1 ? '' : 's'}`);

  // Load API keys
  let apiKeys = await loadApiKeys();

  // Resolve API key from env or noxkey (backward compat)
  if (!apiKeys.GEMINI_API_KEY && watchMode) {
    try {
      const key = execSync('noxkey get shared/GEMINI_API_KEY --raw', { encoding: 'utf-8', stdio: 'pipe' }).trim();
      if (key) {
        await setApiKey('gemini', key);
        apiKeys = await loadApiKeys();
      }
    } catch {
      // Will warn at startup
    }
  }

  // Find source files matching a CSS selector/classes using grep
  async function findSourceFile(capture: SessionCapture): Promise<{ path: string; content: string } | null> {
    const element = capture.elements?.[0] as Record<string, unknown> | undefined;
    if (!element) return null;

    const classes = (element.classes as string[]) || [];
    const text = (element.text as string) || '';
    const cwd = process.cwd();

    for (const term of [...classes, text].filter(Boolean)) {
      if (!/^[\w\s\-_.#]+$/.test(term)) continue;
      try {
        const grepResult = spawnSync('grep', [
          '-rl',
          '--include=*.html', '--include=*.jsx', '--include=*.tsx',
          '--include=*.vue', '--include=*.svelte', '--include=*.js', '--include=*.css',
          term,
          '.'
        ], { cwd, encoding: 'utf-8', timeout: 2000 });

        const result = (grepResult.stdout || '').trim();
        if (result) {
          const files = result.split('\n')
            .filter(f => !f.includes('node_modules') && !f.includes('/dist/'))
            .slice(0, 5);
          for (const file of files) {
            const fullPath = join(cwd, file);
            const content = await readFile(fullPath, 'utf-8');
            if (content.length < 50000) {
              return { path: relative(cwd, fullPath), content };
            }
          }
        }
      } catch (e) {
        console.warn(`  ⚠️ Source search failed for "${term}": ${(e as Error).message}`);
      }
    }
    return null;
  }

  // SSE clients for live activity feed
  const sseClients = new Set<import('node:http').ServerResponse>();

  function broadcast(event: string, data: Record<string, unknown>) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try { client.write(msg); } catch { sseClients.delete(client); }
    }
  }

  // Revert history — stores original file content per session
  const revertHistory = new Map<string, Map<string, string>>(); // sessionId → (file → original content)

  function setRevertSnapshot(sessionId: string, filePath: string, content: string) {
    let sessionReverts = revertHistory.get(sessionId);
    if (!sessionReverts) {
      sessionReverts = new Map();
      revertHistory.set(sessionId, sessionReverts);
    }
    // Only store the first snapshot (original state)
    if (!sessionReverts.has(filePath)) {
      sessionReverts.set(filePath, content);
    }
  }

  // Fix queue
  const fixQueue: Array<{ sessionId: string; messageIndex: number }> = [];
  let fixing = false;
  let cancelRequested = false;

  // Build prompt for AI — includes full context
  function buildPrompt(
    title: string,
    source: { path: string; content: string },
    capture: SessionCapture,
    messages: Message[],
  ): string {
    const element = (capture.elements as Array<Record<string, unknown>>)?.[0];
    const selector = (element?.selector as string) || '';
    const elementClasses = ((element?.classes as string[]) || []).join(', ');

    // For follow-up messages, include change history
    const priorChanges = messages
      .filter(m => m.role === 'assistant' && m.diff)
      .map(m => m.diff!.map(d => `Changed: "${d.old.slice(0, 80)}" → "${d.new.slice(0, 80)}"`).join('\n'))
      .join('\n');

    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.text || title;

    const parts = [
      `Fix this UI issue: "${lastUserMessage}"`,
      selector ? `Element: ${selector}` : '',
      elementClasses ? `Classes: ${elementClasses}` : '',
    ];

    if (priorChanges) {
      parts.push('', 'Previous changes made in this session:', priorChanges);
    }

    parts.push(
      '',
      `File: ${source.path}`,
      '```',
      source.content,
      '```',
      '',
      'Return ONLY a JSON array of edits. Each edit: {"old":"exact line(s) to find","new":"replacement line(s)"}',
      'Example: [{"old":"color: red;","new":"color: green;"}]',
      'IMPORTANT: Minimal changes only. Do NOT remove or modify any existing code, comments, or attributes that are unrelated to the requested change.',
      'Only change exactly what is needed to fix the issue described. No explanation.',
    );

    return parts.filter(Boolean).join('\n');
  }

  // Parse AI response into edits
  function parseEdits(result: string): Array<{ old: string; new: string }> | null {
    let raw = result.trim();
    const fenceMatch = raw.match(/^```[\w]*\n([\s\S]*)\n```\s*$/);
    if (fenceMatch) raw = fenceMatch[1].trim();

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Process a message in a session — find source, call AI, apply edits
  async function processMessage(sessionId: string): Promise<void> {
    if (fixing) {
      const messages = await getMessages(sessionId);
      fixQueue.push({ sessionId, messageIndex: messages.length - 1 });
      console.log(`  ⏳ Queued session ${sessionId} (${fixQueue.length} in queue)`);
      return;
    }

    fixing = true;
    const startTime = Date.now();

    try {
      const session = await getSession(sessionId);
      if (!session) throw new Error('Session not found');

      const { capture, messages } = session;
      const title = capture.title;

      console.log(`  🤖 Processing: "${title}"...`);
      await updateStatus(sessionId, { status: 'fixing' });
      broadcast('session:updated', { id: sessionId, status: 'fixing' });

      // Find source file
      const source = await findSourceFile(capture);
      if (!source) {
        const errStatus: SessionStatus = { status: 'error', message: 'Could not find source file' };
        await updateStatus(sessionId, errStatus);
        broadcast('session:updated', { id: sessionId, ...errStatus });
        console.log('  ❌ Could not find source file to edit');
        return;
      }

      console.log(`  📄 Found: ${source.path}`);

      // Get current file content (may have been modified by prior edits in this session)
      let currentContent: string;
      try {
        currentContent = await readFile(join(process.cwd(), source.path), 'utf-8');
      } catch {
        currentContent = source.content;
      }
      source.content = currentContent;

      // Read screenshot for vision-capable providers
      let screenshotBuffer: Buffer | undefined;
      try {
        screenshotBuffer = await readFile(getScreenshotPath(sessionId));
      } catch {}

      // Build prompt and call AI
      const prompt = buildPrompt(title, source, capture, messages);

      // Reload keys in case user just set one
      apiKeys = await loadApiKeys();
      const provider = getProvider(apiKeys);
      console.log(`  🧠 Calling ${provider.name}...`);

      const result = await provider.generateFix(prompt, screenshotBuffer);

      if (!result.trim()) {
        const errStatus: SessionStatus = { status: 'error', message: 'Empty response from AI' };
        await updateStatus(sessionId, errStatus);
        broadcast('session:updated', { id: sessionId, ...errStatus });
        console.log('  ❌ Empty response from AI');
        return;
      }

      const edits = parseEdits(result);
      if (!edits) {
        const errStatus: SessionStatus = { status: 'error', message: 'Could not parse AI response' };
        await updateStatus(sessionId, errStatus);
        broadcast('session:updated', { id: sessionId, ...errStatus });
        console.log('  ❌ Could not parse edit response');
        return;
      }

      if (cancelRequested) {
        cancelRequested = false;
        const errStatus: SessionStatus = { status: 'error', message: 'Cancelled' };
        await updateStatus(sessionId, errStatus);
        broadcast('session:updated', { id: sessionId, ...errStatus });
        console.log(`  🚫 Cancelled: "${title}"`);
        return;
      }

      // Apply edits
      let newContent = source.content;
      let applied = 0;
      for (const edit of edits) {
        if (newContent.includes(edit.old)) {
          newContent = newContent.replaceAll(edit.old, edit.new);
          applied++;
        }
      }

      if (applied === 0) {
        const errStatus: SessionStatus = { status: 'error', message: 'No edits matched the source' };
        await updateStatus(sessionId, errStatus);
        broadcast('session:updated', { id: sessionId, ...errStatus });
        console.log('  ❌ No edits matched the source');
        return;
      }

      // Write file
      const fullPath = join(process.cwd(), source.path);
      await writeFile(fullPath, newContent);

      // Store original for revert (per session, first snapshot only)
      setRevertSnapshot(sessionId, source.path, source.content);

      // Add assistant message with diff
      const assistantMsg: Message = {
        role: 'assistant',
        text: `Applied ${applied} edit${applied === 1 ? '' : 's'} to ${source.path}`,
        diff: edits.filter(e => source.content.includes(e.old)),
        timestamp: new Date().toISOString(),
      };
      await addMessage(sessionId, assistantMsg);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const fixedStatus: SessionStatus = { status: 'fixed', file: source.path, edits: applied, elapsed };
      await updateStatus(sessionId, fixedStatus);
      broadcast('session:updated', { id: sessionId, ...fixedStatus, title });

      console.log(`  ✅ Fixed: "${title}" in ${elapsed}s → ${source.path}`);
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error('  ❌ Process error:', errMsg);
      const errStatus: SessionStatus = { status: 'error', message: errMsg };
      await updateStatus(sessionId, errStatus);
      broadcast('session:updated', { id: sessionId, ...errStatus });
    } finally {
      fixing = false;
      if (fixQueue.length > 0) {
        const next = fixQueue.shift()!;
        console.log(`  📋 Processing queued session (${fixQueue.length} remaining)`);
        processMessage(next.sessionId).catch((err) => {
          console.error('  ❌ Queued fix error:', (err as Error).message);
        });
      }
    }
  }

  // Helper to read JSON body from request
  function readBody(req: import('node:http').IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      req.on('end', () => resolve(body));
    });
  }

  // Only allow requests from localhost origins
  const ALLOWED_ORIGINS = new Set([
    `http://localhost:${port}`,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
  ]);

  const server = createServer(async (req, res) => {
    // CORS headers — restrict to localhost origins
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.has(origin) || origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${port}`);

    // --- Health ---
    if (url.pathname === '/health' && req.method === 'GET') {
      const config = await loadConfig();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', watch: watchMode && Object.values(apiKeys).some(Boolean), provider: config.provider }));
      return;
    }

    // --- SSE ---
    if (url.pathname === '/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write('event: connected\ndata: {}\n\n');
      sseClients.add(res);
      req.on('close', () => { sseClients.delete(res); });
      return;
    }

    // --- Widget JS ---
    if (url.pathname === '/widget.js' && req.method === 'GET') {
      try {
        const widgetPath = new URL('../widget/dist/shotfix.min.js', import.meta.url);
        const widgetContent = await readFile(widgetPath);
        res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' });
        res.end(widgetContent);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Widget not found');
      }
      return;
    }

    // --- Sessions ---
    if (url.pathname === '/sessions' && req.method === 'GET') {
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const sessions = await listSessions(offset, limit);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(sessions));
      return;
    }

    const sessionMatch = url.pathname.match(/^\/sessions\/([^/]+)$/);
    if (sessionMatch && req.method === 'GET') {
      const session = await getSession(sessionMatch[1]);
      if (!session) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(session));
      return;
    }

    const screenshotMatch = url.pathname.match(/^\/sessions\/([^/]+)\/screenshot$/);
    if (screenshotMatch && req.method === 'GET') {
      try {
        const imgPath = getScreenshotPath(screenshotMatch[1]);
        const imgBuffer = await readFile(imgPath);
        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' });
        res.end(imgBuffer);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Screenshot not found');
      }
      return;
    }

    const messageMatch = url.pathname.match(/^\/sessions\/([^/]+)\/messages$/);
    if (messageMatch && req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const sessionId = messageMatch[1];
        const session = await getSession(sessionId);
        if (!session) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Session not found' }));
          return;
        }

        const userMsg: Message = {
          role: 'user',
          text: body.text,
          timestamp: new Date().toISOString(),
        };
        await addMessage(sessionId, userMsg);
        await updateStatus(sessionId, { status: 'chatting' });
        broadcast('session:updated', { id: sessionId, status: 'chatting' });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));

        // Process in background
        processMessage(sessionId).catch(err => {
          console.error('  ❌ Message processing error:', (err as Error).message);
        });
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
      return;
    }

    const revertMatch = url.pathname.match(/^\/sessions\/([^/]+)\/revert$/);
    if (revertMatch && req.method === 'POST') {
      try {
        const sessionId = revertMatch[1];
        const sessionReverts = revertHistory.get(sessionId);

        if (!sessionReverts || sessionReverts.size === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No revert available for this session' }));
          return;
        }

        // Revert all files modified in this session
        const revertedFiles: string[] = [];
        for (const [file, original] of sessionReverts) {
          const fullPath = resolve(process.cwd(), file);
          if (!fullPath.startsWith(process.cwd())) continue;
          await writeFile(fullPath, original);
          revertedFiles.push(file);
        }
        revertHistory.delete(sessionId);

        await updateStatus(sessionId, { status: 'pending' });
        broadcast('session:updated', { id: sessionId, status: 'pending' });

        console.log(`  ↩️  Reverted session ${sessionId}: ${revertedFiles.join(', ')}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, files: revertedFiles }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid revert request' }));
      }
      return;
    }

    // --- Config ---
    if (url.pathname === '/config' && req.method === 'GET') {
      const config = await loadConfig();
      const keys = await loadApiKeys();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ...config,
        keys: getKeyStatus(keys),
        models: getProviderModels(),
      }));
      return;
    }

    if (url.pathname === '/config' && req.method === 'PUT') {
      try {
        const body = JSON.parse(await readBody(req));
        const updated = await saveConfig({
          provider: body.provider,
          model: body.model,
        });
        apiKeys = await loadApiKeys();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid config' }));
      }
      return;
    }

    if (url.pathname === '/config/keys' && req.method === 'PUT') {
      try {
        const body = JSON.parse(await readBody(req));
        if (body.provider && body.key) {
          await setApiKey(body.provider, body.key);
          apiKeys = await loadApiKeys();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, keys: getKeyStatus(apiKeys) }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'provider and key required' }));
        }
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
      return;
    }

    // --- CLAUDE.md ---
    if (url.pathname === '/claude-md' && req.method === 'GET') {
      const claudePath = join(process.cwd(), 'CLAUDE.md');
      try {
        const content = await readFile(claudePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ content }));
      } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ content: '' }));
      }
      return;
    }

    if (url.pathname === '/claude-md' && req.method === 'PUT') {
      try {
        const { content } = JSON.parse(await readBody(req));
        const claudePath = join(process.cwd(), 'CLAUDE.md');
        await writeFile(claudePath, content);
        console.log('  📝 CLAUDE.md updated');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
      return;
    }

    // --- Cancel ---
    if (url.pathname === '/cancel' && req.method === 'POST') {
      cancelRequested = true;
      const cleared = fixQueue.length;
      fixQueue.length = 0;
      console.log(`  🚫 Cancel requested (${cleared} queued items cleared)`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, cleared }));
      return;
    }

    // Legacy /revert removed — use /sessions/:id/revert instead

    // --- Capture ---
    if (url.pathname === '/capture' && req.method === 'POST') {
      try {
        const data = JSON.parse(await readBody(req));
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Extract screenshot PNG
        let screenshotBuffer: Buffer | undefined;
        let screenshotFilename: string | null = null;
        if (data.screenshot) {
          const base64Data = data.screenshot.replace(/^data:image\/\w+;base64,/, '');
          screenshotBuffer = Buffer.from(base64Data, 'base64');
          screenshotFilename = `${timestamp}.png`;
          await writeFile(join(capturesDir, screenshotFilename), screenshotBuffer);
          await copyFile(join(capturesDir, screenshotFilename), join(capturesDir, 'latest.png'));
        }

        // Build capture data
        const captureData: SessionCapture = {
          title: data.title || 'Untitled capture',
          description: data.description || '',
          url: data.metadata?.url || '',
          timestamp: data.metadata?.timestamp || new Date().toISOString(),
          browser: data.metadata?.browser || '',
          viewport: data.metadata?.viewport || '',
          consoleErrors: data.metadata?.consoleErrors || [],
          urlEntities: data.metadata?.urlEntities || {},
          elements: data.elements || [],
          context: data.context || null,
        };

        // Save per-capture JSON with correct screenshot reference
        const captureJsonContent = JSON.stringify({
          ...captureData,
          screenshot: screenshotFilename || null,
        }, null, 2);
        await writeFile(join(capturesDir, `${timestamp}.json`), captureJsonContent);

        // latest.json uses latest.png for MCP compat
        const latestJsonContent = JSON.stringify({
          ...captureData,
          screenshot: screenshotFilename ? 'latest.png' : null,
        }, null, 2);
        await writeFile(join(capturesDir, 'latest.json'), latestJsonContent);

        // Create session
        const sessionId = await createSession(captureData, screenshotBuffer);

        console.log(`  ⚡ Captured: ${captureData.title} (session: ${sessionId})`);
        broadcast('session:created', { id: sessionId, title: captureData.title, status: 'pending', timestamp: captureData.timestamp });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, sessionId }));

        // Auto-fix in watch mode
        if (watchMode && Object.values(apiKeys).some(Boolean)) {
          processMessage(sessionId).catch((err) => {
            console.error('  ❌ Unexpected auto-fix error:', (err as Error).message);
          });
        }
      } catch (err) {
        console.error('Failed to process capture:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid capture data' }));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(port, () => {
    console.log(`⚡ Shotfix v${VERSION} dev server running on port ${port}`);
    console.log(`  Captures saved to ${capturesDir}`);
    if (watchMode && Object.values(apiKeys).some(Boolean)) {
      console.log(`  🤖 Watch mode: captures will auto-fix`);
    } else if (watchMode) {
      console.log(`  ⚠️  Watch mode enabled but no API key found`);
      console.log(`     Set env var or store with: noxkey set shared/GEMINI_API_KEY`);
    }
    console.log('');
    console.log('Tip: Add to CLAUDE.md: "Check .shotfix/captures/latest.json and latest.png for bug captures"');
  });
}

main().catch((err) => {
  console.error('Failed to start Shotfix:', err);
  process.exit(1);
});

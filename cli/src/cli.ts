#!/usr/bin/env node
import { createServer } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { mkdir, writeFile, readdir, unlink, copyFile, stat, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const PORT = 2847;

async function main() {
  const args = process.argv.slice(2);
  const portArg = args.find((_, i) => args[i - 1] === '--port');
  const dirArg = args.find((_, i) => args[i - 1] === '--dir');
  const watchMode = args.includes('--watch');

  const port = portArg ? parseInt(portArg, 10) : PORT;
  const capturesDir = join(process.cwd(), dirArg || '.shotfix/captures');
  const shotfixDir = join(process.cwd(), '.shotfix');

  // Ensure directories exist
  await mkdir(capturesDir, { recursive: true });

  // Write .gitignore for .shotfix/
  try {
    await writeFile(join(shotfixDir, '.gitignore'), 'captures/\n', { flag: 'wx' });
  } catch {
    // Already exists, fine
  }

  // Cleanup old captures (>1 hour)
  async function cleanOldCaptures() {
    try {
      const files = await readdir(capturesDir);
      const now = Date.now();
      const ONE_HOUR = 60 * 60 * 1000;

      for (const file of files) {
        if (file.startsWith('latest.')) continue;
        const filePath = join(capturesDir, file);
        try {
          const fileStat = await stat(filePath);
          if (now - fileStat.mtimeMs > ONE_HOUR) {
            await unlink(filePath);
          }
        } catch {
          // Skip files we can't stat
        }
      }
    } catch {
      // Directory may not exist yet
    }
  }

  // Resolve API key from env or noxkey
  let apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey && watchMode) {
    try {
      apiKey = execSync('noxkey get shared/GEMINI_API_KEY --raw', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    } catch {
      // Will warn at startup
    }
  }

  // Find source files matching a CSS selector/classes using grep
  async function findSourceFile(captureJson: Record<string, unknown>): Promise<{ path: string; content: string } | null> {
    const element = (captureJson.elements as Array<Record<string, unknown>>)?.[0];
    if (!element) return null;

    const classes = (element.classes as string[]) || [];
    const text = (element.text as string) || '';
    const cwd = process.cwd();

    // Search for class names or text content in source files
    for (const term of [...classes, text].filter(Boolean)) {
      // Skip terms with shell-dangerous characters
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
            if (content.length < 50000) { // Skip huge files
              return { path: relative(cwd, fullPath), content };
            }
          }
        }
      } catch {
        // grep failed, try next term
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

  // Revert history — stores original file content before AI edits
  const revertHistory = new Map<string, { original: string; title: string }>();

  // Call Gemini Flash directly — single API call, no CLI
  const fixQueue: Array<Record<string, unknown>> = [];
  let fixing = false;
  let cancelRequested = false;

  async function autoFix(captureJson: Record<string, unknown>) {
    if (!watchMode || !apiKey) return;
    if (fixing) {
      fixQueue.push(captureJson);
      console.log(`  ⏳ Queued: "${captureJson.title}" (${fixQueue.length} in queue)`);
      return;
    }

    fixing = true;
    const startTime = Date.now();
    const title = captureJson.title as string;

    const element = (captureJson.elements as Array<Record<string, unknown>>)?.[0];
    const selector = element?.selector || '';
    const elementClasses = (element?.classes as string[])?.join(', ') || '';

    console.log(`  🤖 Auto-fixing: "${title}"...`);
    broadcast('fixing', { title, status: 'searching' });

    try {
      // Find the source file before calling the API
      const source = await findSourceFile(captureJson);
      if (!source) {
        console.log('  ❌ Could not find source file to edit');
        broadcast('fixed', { title, status: 'error', message: 'Could not find source file' });
        fixing = false;
        return;
      }
      console.log(`  📄 Found: ${source.path}`);
      broadcast('fixing', { title, status: 'calling_ai', file: source.path });

      // Build a tight prompt — ask for search/replace only
      const prompt = [
        `Fix this UI issue: "${title}"`,
        selector ? `Element: ${selector}` : '',
        elementClasses ? `Classes: ${elementClasses}` : '',
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
      ].filter(Boolean).join('\n');

      // Call Gemini Flash
      const body = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1024,
        },
      });

      const result = await new Promise<string>((resolve, reject) => {
        const req = httpsRequest(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
          { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey } },
          (res) => {
            let data = '';
            res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
            res.on('end', () => {
              clearTimeout(timeout);
              if (res.statusCode !== 200) {
                reject(new Error(`Gemini API ${res.statusCode}: ${data}`));
                return;
              }
              try {
                const json = JSON.parse(data);
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                resolve(text);
              } catch (e) {
                reject(e);
              }
            });
          }
        );
        const timeout = setTimeout(() => {
          req.destroy();
          reject(new Error('Gemini API request timed out'));
        }, 30000);
        req.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
        req.write(body);
        req.end();
      });

      if (!result.trim()) {
        console.log('  ❌ Empty response from Gemini');
        fixing = false;
        return;
      }

      // Parse JSON edits from response (strip markdown fences if present)
      let raw = result.trim();
      const fenceMatch = raw.match(/^```[\w]*\n([\s\S]*)\n```\s*$/);
      if (fenceMatch) raw = fenceMatch[1].trim();

      let edits: Array<{ old: string; new: string }>;
      try {
        edits = JSON.parse(raw);
      } catch {
        console.log('  ❌ Could not parse edit response');
        fixing = false;
        return;
      }

      // Check if cancelled
      if (cancelRequested) {
        cancelRequested = false;
        console.log(`  🚫 Cancelled: "${title}"`);
        broadcast('fixed', { title, status: 'error', message: 'Cancelled' });
        fixing = false;
        return;
      }

      // Apply edits to source
      let newContent = source.content;
      let applied = 0;
      for (const edit of edits) {
        if (newContent.includes(edit.old)) {
          newContent = newContent.replaceAll(edit.old, edit.new);
          applied++;
        }
      }

      if (applied === 0) {
        console.log('  ❌ No edits matched the source');
        fixing = false;
        return;
      }

      // Write the fixed file
      const fullPath = join(process.cwd(), source.path);
      await writeFile(fullPath, newContent);

      // Store original for revert (only first time — preserves initial state)
      if (!revertHistory.has(source.path)) {
        revertHistory.set(source.path, { original: source.content, title });
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ✅ Fixed: "${title}" in ${elapsed}s → ${source.path}`);
      broadcast('fixed', { title, status: 'done', file: source.path, elapsed, edits: applied });
    } catch (err) {
      console.error('  ❌ Auto-fix error:', (err as Error).message);
      broadcast('fixed', { title, status: 'error', message: (err as Error).message });
    } finally {
      fixing = false;
      // Process next in queue
      if (fixQueue.length > 0) {
        const next = fixQueue.shift()!;
        console.log(`  📋 Processing queued: "${next.title}" (${fixQueue.length} remaining)`);
        autoFix(next).catch((err) => {
          console.error('  ❌ Queued fix error:', (err as Error).message);
        });
      }
    }
  }

  const server = createServer(async (req, res) => {
    // CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${port}`);

    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', watch: watchMode && !!apiKey }));
      return;
    }

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

    if (url.pathname === '/cancel' && req.method === 'POST') {
      cancelRequested = true;
      // Clear the queue too
      const cleared = fixQueue.length;
      fixQueue.length = 0;
      console.log(`  🚫 Cancel requested (${cleared} queued items cleared)`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, cleared }));
      return;
    }

    if (url.pathname === '/revert' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { file } = JSON.parse(body);
          const entry = revertHistory.get(file);
          if (!entry) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No revert available for this file' }));
            return;
          }
          const fullPath = join(process.cwd(), file);
          await writeFile(fullPath, entry.original);
          revertHistory.delete(file);
          console.log(`  ↩️  Reverted: ${file}`);
          broadcast('reverted', { file, title: entry.title });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid revert request' }));
        }
      });
      return;
    }

    if (url.pathname === '/capture' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const timeLabel = new Date().toLocaleTimeString('en-US', { hour12: false });

          // Extract and save screenshot PNG
          let screenshotFilename: string | null = null;
          if (data.screenshot) {
            const base64Data = data.screenshot.replace(/^data:image\/\w+;base64,/, '');
            const pngBuffer = Buffer.from(base64Data, 'base64');

            screenshotFilename = `${timestamp}.png`;
            await writeFile(join(capturesDir, screenshotFilename), pngBuffer);
            await copyFile(join(capturesDir, screenshotFilename), join(capturesDir, 'latest.png'));
          }

          // Build JSON (without base64 screenshot, reference file instead)
          const captureJson = {
            title: data.title || 'Untitled capture',
            description: data.description || '',
            url: data.metadata?.url || '',
            timestamp: data.metadata?.timestamp || new Date().toISOString(),
            screenshot: screenshotFilename ? 'latest.png' : null,
            browser: data.metadata?.browser || '',
            viewport: data.metadata?.viewport || '',
            consoleErrors: data.metadata?.consoleErrors || [],
            urlEntities: data.metadata?.urlEntities || {},
            elements: data.elements || [],
            context: data.context || null,
          };

          const jsonFilename = `${timestamp}.json`;
          const jsonContent = JSON.stringify(captureJson, null, 2);
          await writeFile(join(capturesDir, jsonFilename), jsonContent);
          await writeFile(join(capturesDir, 'latest.json'), jsonContent);

          // Clean old captures
          await cleanOldCaptures();

          const title = captureJson.title;
          console.log(`[${timeLabel}] ⚡ Captured: ${title}`);
          broadcast('capture', { title, timestamp: timeLabel });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));

          // Trigger auto-fix in watch mode (after response sent)
          autoFix(captureJson).catch((err) => {
            console.error('  ❌ Unexpected auto-fix error:', (err as Error).message);
          });
        } catch (err) {
          console.error('Failed to process capture:', err);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid capture data' }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(port, () => {
    console.log(`⚡ Shotfix dev server running on port ${port}`);
    console.log(`  Captures saved to ${capturesDir}`);
    if (watchMode && apiKey) {
      console.log(`  🤖 Watch mode: captures will auto-fix via Gemini Flash`);
    } else if (watchMode) {
      console.log(`  ⚠️  Watch mode enabled but no GEMINI_API_KEY found`);
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

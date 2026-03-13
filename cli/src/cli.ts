#!/usr/bin/env node
import { createServer } from 'node:http';
import { mkdir, writeFile, readdir, unlink, copyFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const PORT = 2847;

async function main() {
  const args = process.argv.slice(2);
  const portArg = args.find((_, i) => args[i - 1] === '--port');
  const dirArg = args.find((_, i) => args[i - 1] === '--dir');

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
      res.end(JSON.stringify({ status: 'ok' }));
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

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
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
    console.log('');
    console.log('Tip: Add to CLAUDE.md: "Check .shotfix/captures/latest.json and latest.png for bug captures"');
  });
}

main().catch((err) => {
  console.error('Failed to start Shotfix:', err);
  process.exit(1);
});

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export function registerCaptureTools(server: McpServer) {
  server.tool(
    'shotfix_capture',
    'Read the latest capture from .shotfix/captures/. Returns the screenshot (as image) and metadata JSON. Run "shotfix" or "npx shotfix" in your terminal first.',
    {},
    async () => {
      const capturesDir = join(process.cwd(), '.shotfix', 'captures');

      try {
        const jsonData = await readFile(join(capturesDir, 'latest.json'), 'utf-8');
        const parsed = JSON.parse(jsonData);

        const content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }> = [];

        // Try to include the screenshot as an image
        try {
          const pngData = await readFile(join(capturesDir, 'latest.png'));
          content.push({
            type: 'image' as const,
            data: pngData.toString('base64'),
            mimeType: 'image/png',
          });
        } catch {
          // Screenshot file missing, just include JSON
        }

        content.push({
          type: 'text' as const,
          text: JSON.stringify(parsed, null, 2),
        });

        return { content };
      } catch {
        return {
          content: [{
            type: 'text' as const,
            text: 'No captures found. Make sure "shotfix" is running and you\'ve submitted a capture from the browser.',
          }],
        };
      }
    }
  );
}

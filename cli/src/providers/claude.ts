/**
 * Claude provider — Anthropic Messages API with vision
 */

import { request as httpsRequest } from 'node:https';
import type { AIProvider } from './index.js';

export class ClaudeProvider implements AIProvider {
  name = 'claude';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || 'claude-sonnet-4-20250514';
  }

  async generateFix(prompt: string, screenshot?: Buffer): Promise<string> {
    const content: Array<Record<string, unknown>> = [];

    // Add screenshot as vision input if available
    if (screenshot) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: screenshot.toString('base64'),
        },
      });
    }

    content.push({ type: 'text', text: prompt });

    const body = JSON.stringify({
      model: this.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content }],
    });

    return new Promise<string>((resolve, reject) => {
      const req = httpsRequest(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          res.on('end', () => {
            clearTimeout(timeout);
            if (res.statusCode !== 200) {
              reject(new Error(`Claude API ${res.statusCode}: ${data}`));
              return;
            }
            try {
              const json = JSON.parse(data);
              const text = json.content?.[0]?.text || '';
              resolve(text);
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      const timeout = setTimeout(() => {
        req.destroy();
        reject(new Error('Claude API request timed out'));
      }, 60000);
      req.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      req.write(body);
      req.end();
    });
  }
}

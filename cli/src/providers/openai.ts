/**
 * OpenAI provider — Chat completions with vision
 */

import { request as httpsRequest } from 'node:https';
import type { AIProvider } from './index.js';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || 'gpt-4o';
  }

  async generateFix(prompt: string, screenshot?: Buffer): Promise<string> {
    const content: Array<Record<string, unknown>> = [];

    // Add screenshot as vision input if available
    if (screenshot) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${screenshot.toString('base64')}`,
          detail: 'high',
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
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          res.on('end', () => {
            clearTimeout(timeout);
            if (res.statusCode !== 200) {
              reject(new Error(`OpenAI API ${res.statusCode}: ${data}`));
              return;
            }
            try {
              const json = JSON.parse(data);
              const text = json.choices?.[0]?.message?.content || '';
              resolve(text);
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      const timeout = setTimeout(() => {
        req.destroy();
        reject(new Error('OpenAI API request timed out'));
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

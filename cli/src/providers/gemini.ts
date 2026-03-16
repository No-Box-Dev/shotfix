/**
 * Gemini provider — extracted from original autoFix
 */

import { request as httpsRequest } from 'node:https';
import type { AIProvider } from './index.js';

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || 'gemini-2.5-flash';
  }

  async generateFix(prompt: string, _screenshot?: Buffer): Promise<string> {
    // Gemini Flash doesn't support vision well for code fixes, use text-only
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
      },
    });

    return new Promise<string>((resolve, reject) => {
      const req = httpsRequest(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
        },
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

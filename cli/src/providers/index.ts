/**
 * AI Provider abstraction — common interface for Gemini/Claude/OpenAI
 */

import { getConfig } from '../config.js';
import { GeminiProvider } from './gemini.js';
import { ClaudeProvider } from './claude.js';
import { OpenAIProvider } from './openai.js';

export interface AIProvider {
  name: string;
  generateFix(prompt: string, screenshot?: Buffer): Promise<string>;
}

export function getProvider(apiKeys: Record<string, string>): AIProvider {
  const config = getConfig();
  const provider = config.provider || 'gemini';
  const model = config.model;

  switch (provider) {
    case 'claude': {
      const key = apiKeys.ANTHROPIC_API_KEY;
      if (!key) throw new Error('ANTHROPIC_API_KEY not set');
      return new ClaudeProvider(key, model);
    }
    case 'openai': {
      const key = apiKeys.OPENAI_API_KEY;
      if (!key) throw new Error('OPENAI_API_KEY not set');
      return new OpenAIProvider(key, model);
    }
    case 'gemini': {
      const key = apiKeys.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY not set');
      return new GeminiProvider(key, model);
    }
    default:
      throw new Error(`Unknown provider: "${provider}". Valid providers: gemini, claude, openai`);
  }
}

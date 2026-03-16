/**
 * Config management — .shotfix/config.json + .shotfix/.env for API keys
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface ShotfixConfig {
  provider: 'gemini' | 'claude' | 'openai';
  model?: string;
}

const DEFAULT_CONFIG: ShotfixConfig = {
  provider: 'gemini',
};

const PROVIDER_MODELS: Record<string, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  claude: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4o-mini'],
};

const KEY_NAMES: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
};

let shotfixDir: string;
let cachedConfig: ShotfixConfig | null = null;

export function initConfig(dir: string) {
  shotfixDir = dir;
  cachedConfig = null;
}

function configPath(): string {
  return join(shotfixDir, 'config.json');
}

function envPath(): string {
  return join(shotfixDir, '.env');
}

export function getConfig(): ShotfixConfig {
  if (cachedConfig) return cachedConfig;
  return { ...DEFAULT_CONFIG };
}

export async function loadConfig(): Promise<ShotfixConfig> {
  try {
    const raw = await readFile(configPath(), 'utf-8');
    cachedConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    cachedConfig = { ...DEFAULT_CONFIG };
  }
  return cachedConfig!;
}

export async function saveConfig(config: Partial<ShotfixConfig>): Promise<ShotfixConfig> {
  const current = await loadConfig();
  const updated = { ...current, ...config };
  await writeFile(configPath(), JSON.stringify(updated, null, 2));
  cachedConfig = updated;
  return updated;
}

export async function loadApiKeys(): Promise<Record<string, string>> {
  const keys: Record<string, string> = {};

  // Check env vars first
  for (const key of Object.values(KEY_NAMES)) {
    if (process.env[key]) {
      keys[key] = process.env[key]!;
    }
  }

  // Then .env file
  try {
    const envContent = await readFile(envPath(), 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^(\w+)=(.+)$/);
      if (match && !keys[match[1]]) {
        keys[match[1]] = match[2].trim();
      }
    }
  } catch {}

  return keys;
}

export async function setApiKey(provider: string, value: string): Promise<void> {
  const keyName = KEY_NAMES[provider];
  if (!keyName) throw new Error(`Unknown provider: ${provider}`);

  // Read existing .env, preserving comments and blank lines
  let lines: string[] = [];
  try {
    const content = await readFile(envPath(), 'utf-8');
    lines = content.split('\n');
    // Remove trailing empty line from split (will re-add newline at end)
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  } catch {}

  // Replace existing key or append
  const idx = lines.findIndex(l => l.startsWith(keyName + '='));
  if (idx >= 0) {
    lines[idx] = `${keyName}=${value}`;
  } else {
    lines.push(`${keyName}=${value}`);
  }

  await writeFile(envPath(), lines.join('\n') + '\n');
}

export function getKeyStatus(keys: Record<string, string>): Record<string, boolean> {
  return {
    gemini: !!keys.GEMINI_API_KEY,
    claude: !!keys.ANTHROPIC_API_KEY,
    openai: !!keys.OPENAI_API_KEY,
  };
}

export function getProviderModels(): Record<string, string[]> {
  return PROVIDER_MODELS;
}

export function getDefaultModel(provider: string): string {
  return PROVIDER_MODELS[provider]?.[0] || '';
}

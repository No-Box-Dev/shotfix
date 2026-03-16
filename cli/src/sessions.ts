/**
 * Session CRUD — persistent session storage on disk
 *
 * .shotfix/sessions/{session-id}/
 *   ├── capture.json    # Original capture data (no base64)
 *   ├── screenshot.png  # Original screenshot
 *   ├── messages.json   # Chat history [{role, text, diff?, timestamp}]
 *   └── status.json     # {status, file?, edits?}
 */

import { mkdir, writeFile, readFile, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  diff?: Array<{ old: string; new: string }>;
  timestamp: string;
}

export interface SessionStatus {
  status: 'pending' | 'fixing' | 'fixed' | 'error' | 'chatting';
  file?: string;
  edits?: number;
  elapsed?: string;
  message?: string;
}

export interface SessionCapture {
  title: string;
  description: string;
  url: string;
  timestamp: string;
  browser: string;
  viewport: string;
  consoleErrors: unknown[];
  urlEntities: Record<string, unknown>;
  elements: unknown[];
  context: unknown;
}

export interface SessionSummary {
  id: string;
  title: string;
  status: SessionStatus['status'];
  timestamp: string;
  hasScreenshot: boolean;
}

export interface SessionFull {
  id: string;
  capture: SessionCapture;
  messages: Message[];
  status: SessionStatus;
  hasScreenshot: boolean;
}

let sessionsDir: string;

export function initSessions(shotfixDir: string) {
  sessionsDir = join(shotfixDir, 'sessions');
}

function sessionPath(id: string): string {
  return join(sessionsDir, id);
}

export async function createSession(
  captureData: SessionCapture,
  screenshotBuffer?: Buffer
): Promise<string> {
  const id = randomUUID().slice(0, 8) + '-' + Date.now().toString(36);
  const dir = sessionPath(id);
  await mkdir(dir, { recursive: true });

  await writeFile(join(dir, 'capture.json'), JSON.stringify(captureData, null, 2));

  if (screenshotBuffer) {
    await writeFile(join(dir, 'screenshot.png'), screenshotBuffer);
  }

  const initialMessage: Message = {
    role: 'user',
    text: captureData.title,
    timestamp: captureData.timestamp || new Date().toISOString(),
  };
  await writeFile(join(dir, 'messages.json'), JSON.stringify([initialMessage], null, 2));

  const status: SessionStatus = { status: 'pending' };
  await writeFile(join(dir, 'status.json'), JSON.stringify(status, null, 2));

  return id;
}

export async function getSession(id: string): Promise<SessionFull | null> {
  const dir = sessionPath(id);
  try {
    const [captureRaw, messagesRaw, statusRaw] = await Promise.all([
      readFile(join(dir, 'capture.json'), 'utf-8'),
      readFile(join(dir, 'messages.json'), 'utf-8'),
      readFile(join(dir, 'status.json'), 'utf-8'),
    ]);

    let hasScreenshot = false;
    try {
      await stat(join(dir, 'screenshot.png'));
      hasScreenshot = true;
    } catch {}

    return {
      id,
      capture: JSON.parse(captureRaw),
      messages: JSON.parse(messagesRaw),
      status: JSON.parse(statusRaw),
      hasScreenshot,
    };
  } catch {
    return null;
  }
}

export async function listSessions(offset = 0, limit = 20): Promise<SessionSummary[]> {
  try {
    await mkdir(sessionsDir, { recursive: true });
    const dirs = await readdir(sessionsDir);

    // Get session info with timestamps for sorting
    const sessions: SessionSummary[] = [];

    for (const dir of dirs) {
      try {
        const statusRaw = await readFile(join(sessionsDir, dir, 'status.json'), 'utf-8');
        const captureRaw = await readFile(join(sessionsDir, dir, 'capture.json'), 'utf-8');
        const status: SessionStatus = JSON.parse(statusRaw);
        const capture: SessionCapture = JSON.parse(captureRaw);

        let hasScreenshot = false;
        try {
          await stat(join(sessionsDir, dir, 'screenshot.png'));
          hasScreenshot = true;
        } catch {}

        sessions.push({
          id: dir,
          title: capture.title,
          status: status.status,
          timestamp: capture.timestamp,
          hasScreenshot,
        });
      } catch {
        // Skip invalid session directories
      }
    }

    // Sort by capture timestamp (newest first) — reliable across file systems
    sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return sessions.slice(offset, offset + limit);
  } catch {
    return [];
  }
}

export async function updateStatus(id: string, status: SessionStatus): Promise<void> {
  const dir = sessionPath(id);
  await writeFile(join(dir, 'status.json'), JSON.stringify(status, null, 2));
}

// Per-session write lock to prevent concurrent read-modify-write races
const messageLocks = new Map<string, Promise<void>>();

export async function addMessage(id: string, message: Message): Promise<void> {
  const prev = messageLocks.get(id) || Promise.resolve();
  const current = prev.then(async () => {
    const dir = sessionPath(id);
    const raw = await readFile(join(dir, 'messages.json'), 'utf-8');
    const messages: Message[] = JSON.parse(raw);
    messages.push(message);
    await writeFile(join(dir, 'messages.json'), JSON.stringify(messages, null, 2));
  });
  messageLocks.set(id, current.catch(() => {}));
  await current;
}

export async function getMessages(id: string): Promise<Message[]> {
  const dir = sessionPath(id);
  try {
    const raw = await readFile(join(dir, 'messages.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getScreenshotPath(id: string): string {
  return join(sessionsDir, id, 'screenshot.png');
}

export async function pruneOldSessions(maxAgeDays = 7): Promise<number> {
  try {
    const dirs = await readdir(sessionsDir);
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let pruned = 0;

    for (const dir of dirs) {
      try {
        // Use capture timestamp for reliable age check
        const captureRaw = await readFile(join(sessionsDir, dir, 'capture.json'), 'utf-8');
        const capture: SessionCapture = JSON.parse(captureRaw);
        const captureTime = new Date(capture.timestamp).getTime();
        if (captureTime < cutoff) {
          await rm(join(sessionsDir, dir), { recursive: true });
          pruned++;
        }
      } catch {}
    }

    return pruned;
  } catch {
    return 0;
  }
}

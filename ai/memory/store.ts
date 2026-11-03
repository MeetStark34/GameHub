import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GAME_IDS, type GameId } from '@/games/types';

/**
 * AI memory (course Block 5): small, per-player, persisted across sessions.
 *
 * Stored as one JSON file per player in AI_MEMORY_DIR (default
 * .data/ai-memory, git-ignored), named by a hash of the user id. It lives
 * OUTSIDE the GameHub database on purpose: the AI connection stays read-only
 * and the web app's schema is untouched.
 *
 * What is kept (and nothing else):
 *  - preferences: favourite game and a short goal, set by the player;
 *  - notes: up to MAX_NOTES short player statements ("I play on my commute");
 *  - sessions: the last MAX_SESSIONS interactions (question, tools used,
 *    one-line answer), so a new session knows what was discussed.
 *
 * Privacy filter: notes that look like credentials or contact details
 * (emails, phone numbers, URLs, "password", tokens) are refused.
 */
export const MAX_NOTES = 8;
export const MAX_SESSIONS = 5;
export const MAX_NOTE_CHARS = 160;

export interface PlayerMemory {
  version: 1;
  preferences: { favoriteGame?: GameId; goal?: string };
  notes: { text: string; at: string }[];
  sessions: { at: string; question: string; tools: string[]; answer: string }[];
  updatedAt: string | null;
}

export const emptyMemory = (): PlayerMemory => ({ version: 1, preferences: {}, notes: [], sessions: [], updatedAt: null });

const SENSITIVE = [
  /[^\s@]+@[^\s@]+\.[^\s@]+/, // email
  /\+?\d[\d\s().-]{7,}\d/, // phone-like digit runs
  /https?:\/\/|www\./i,
  /\b(password|passwd|pwd|token|secret|api[_ -]?key|cookie|session|credit card|iban|address)\b/i,
];

export function sensitiveReason(text: string): string | null {
  for (const re of SENSITIVE) if (re.test(text)) return 'looks like private or credential data';
  return null;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export class MemoryStore {
  constructor(private readonly dir: string) {}

  private file(userId: string) {
    return path.join(this.dir, `${createHash('sha256').update(userId).digest('hex').slice(0, 32)}.json`);
  }

  load(userId: string): PlayerMemory {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file(userId), 'utf8')) as PlayerMemory;
      return raw?.version === 1 ? { ...emptyMemory(), ...raw } : emptyMemory();
    } catch {
      return emptyMemory();
    }
  }

  private save(userId: string, m: PlayerMemory): PlayerMemory {
    fs.mkdirSync(this.dir, { recursive: true });
    const next = { ...m, updatedAt: new Date().toISOString() };
    const f = this.file(userId);
    fs.writeFileSync(`${f}.tmp`, JSON.stringify(next, null, 2));
    fs.renameSync(`${f}.tmp`, f);
    return next;
  }

  remember(userId: string, input: { favoriteGame?: GameId; goal?: string; note?: string }): PlayerMemory {
    const m = this.load(userId);
    if (input.favoriteGame) {
      if (!GAME_IDS.includes(input.favoriteGame)) throw new Error(`Unknown game "${input.favoriteGame}".`);
      m.preferences.favoriteGame = input.favoriteGame;
    }
    for (const [field, value] of [['goal', input.goal], ['note', input.note]] as const) {
      if (value === undefined) continue;
      const reason = sensitiveReason(value);
      if (reason) throw new Error(`Not stored: the ${field} ${reason}. Memory only keeps game preferences.`);
    }
    if (input.goal !== undefined) m.preferences.goal = clip(input.goal.trim(), MAX_NOTE_CHARS);
    if (input.note) {
      const text = clip(input.note.trim(), MAX_NOTE_CHARS);
      m.notes = [...m.notes.filter((n) => n.text !== text), { text, at: new Date().toISOString() }].slice(-MAX_NOTES);
    }
    return this.save(userId, m);
  }

  recordSession(userId: string, s: { question: string; tools: string[]; answer: string }): PlayerMemory {
    const m = this.load(userId);
    m.sessions = [
      ...m.sessions,
      { at: new Date().toISOString(), question: clip(s.question, MAX_NOTE_CHARS), tools: [...new Set(s.tools)], answer: clip(s.answer.replace(/\s+/g, ' '), 240) },
    ].slice(-MAX_SESSIONS);
    return this.save(userId, m);
  }

  forget(userId: string): void {
    fs.rmSync(this.file(userId), { force: true });
  }
}

/** Compact text block injected into the system prompt at session start. */
export function memoryContext(m: PlayerMemory): string {
  const lines: string[] = [];
  if (m.preferences.favoriteGame) lines.push(`- Favourite game: ${m.preferences.favoriteGame}`);
  if (m.preferences.goal) lines.push(`- Goal: ${m.preferences.goal}`);
  for (const n of m.notes) lines.push(`- Player note: ${n.text}`);
  for (const s of m.sessions) lines.push(`- Earlier (${s.at.slice(0, 10)}): asked "${s.question}" -> ${s.answer}`);
  return lines.length ? `Remembered from earlier sessions (may be outdated; fetch live numbers with tools):\n${lines.join('\n')}` : '';
}

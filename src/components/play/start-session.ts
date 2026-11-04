import type { SessionView } from '@/lib/contracts';
import type { PlayTarget } from '@/lib/play-url';
import type { Msg } from '@/i18n/translate';

/** `receivedAt` (client clock) lets a response picked up later still sync the timer exactly. */
export type Post<T> = { data?: T; error?: Msg; status: number; receivedAt: number };

export async function post<T>(url: string, body: unknown): Promise<Post<T>> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: { key: json.code ?? 'play.generic' }, status: res.status, receivedAt: Date.now() };
    return { data: json as T, status: res.status, receivedAt: Date.now() };
  } catch {
    return { error: { key: 'play.offline' }, status: 0, receivedAt: Date.now() };
  }
}

export const requestStart = (t: PlayTarget, fresh = false) => post<SessionView>('/api/play/start', { ...t, fresh });

const keyOf = (t: PlayTarget) => `${t.game}:${t.mode}:${t.mode === 'daily' ? '' : t.difficulty}`;

/** How long an early start waits to be picked up by the play page it was made for. */
const EARLY_START_TTL_MS = 15_000;

const early = new Map<string, { at: number; result: Promise<Post<SessionView>> }>();
// Early starts run one after another: a first-time visitor's first start
// creates the guest account and its cookie, which the next start must send.
let queue: Promise<unknown> = Promise.resolve();

/**
 * Starts (or resumes) the session for a play link the moment it is clicked,
 * so the request runs in parallel with the page navigation instead of after
 * it. Only a committed click calls this: a Daily session's timer starts when
 * the session is created.
 */
export function startEarly(t: PlayTarget): void {
  const key = keyOf(t);
  const hit = early.get(key);
  if (hit && Date.now() - hit.at < EARLY_START_TTL_MS) return;
  const result = queue.then(() => requestStart(t));
  queue = result;
  early.set(key, { at: Date.now(), result });
}

/** The early start made for this target, if any; each is used at most once. */
export function takeEarlyStart(t: PlayTarget): Promise<Post<SessionView>> | null {
  const key = keyOf(t);
  const hit = early.get(key);
  early.delete(key);
  return hit && Date.now() - hit.at < EARLY_START_TTL_MS ? hit.result : null;
}

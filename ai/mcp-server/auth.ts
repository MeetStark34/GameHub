import fs from 'node:fs';
import { maybeOne, type Queryable } from '@/lib/db';
import { sha256 } from '@/server/users';
import { paths } from '../lib/config';

/**
 * Who the MCP server acts for. Identity comes from a GameHub session token,
 * exactly like the web app's `gh_session` cookie: only its sha256 is looked
 * up in auth_sessions and it must not be expired. The model never supplies a
 * user id; every "my ..." tool is bound to this player.
 *
 * Unlike the web app's userForToken this lookup never writes (no
 * last_seen_at refresh), because the AI connection is read-only.
 */
export interface Principal {
  userId: string;
  handle: string;
  isGuest: boolean;
}

export function readSessionToken(): string {
  const env = process.env.GAMEHUB_SESSION_TOKEN?.trim();
  if (env) return env;
  if (fs.existsSync(paths.tokenFile)) return fs.readFileSync(paths.tokenFile, 'utf8').trim();
  throw new Error('No GameHub session token. Set GAMEHUB_SESSION_TOKEN or run "npm run ai:seed" for the demo player.');
}

export async function resolvePrincipal(q: Queryable, token: string, now = new Date()): Promise<Principal> {
  if (!token || token.length > 200) throw new Error('Invalid GameHub session token.');
  const row = await maybeOne<{ id: string; handle: string; is_guest: boolean }>(
    q,
    `select u.id, u.handle, u.is_guest from auth_sessions s join users u on u.id = s.user_id
     where s.id = $1 and s.expires_at > $2::timestamptz
       and (not u.is_guest or u.guest_expires_at > $2::timestamptz)`,
    [sha256(token), now.toISOString()],
  );
  if (!row) throw new Error('GameHub session token is unknown or expired. Sign in again / create a new token.');
  return { userId: row.id, handle: row.handle, isGuest: row.is_guest };
}

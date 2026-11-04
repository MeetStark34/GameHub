import 'server-only';
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { maybeOne, one, type Db, type Queryable } from '@/lib/db';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export const SESSION_TTL_DAYS = { member: 30 };
/** Guest accounts are deleted this long after creation (D-042, migration 0006). */
export const GUEST_TTL_HOURS = 12;
export const guestExpiry = (createdAt: Date) => new Date(createdAt.getTime() + GUEST_TTL_HOURS * 3_600_000);

export interface UserRow {
  id: string;
  handle: string;
  display_name: string;
  email: string | null;
  is_guest: boolean;
  /** Set only for guests: when the account stops working and gets deleted. */
  guest_expires_at: Date | null;
  title: string | null;
  profile_public: boolean;
  show_on_leaderboards: boolean;
  created_at: Date;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, saltB64, keyB64] = stored.split('$');
  if (alg !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64url');
  const key = await scrypt(password, Buffer.from(saltB64, 'base64url'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');

export const HANDLE_RE = /^[a-z0-9_-]{3,24}$/;
export const normalizeHandle = (h: string) => h.trim().toLowerCase();

export function validatePassword(pw: string): string | null {
  if (pw.length < 10) return 'errors.passwordShort';
  if (pw.length > 200) return 'errors.passwordLong';
  return null;
}

/** A temporary guest account, expiring exactly GUEST_TTL_HOURS after creation (server clock, UTC). */
export async function createGuest(db: Queryable, now = new Date()): Promise<UserRow> {
  for (let i = 0; i < 5; i++) {
    const handle = `guest-${randomBytes(4).toString('hex')}`;
    const rows = await db.query<UserRow>(
      `insert into users (handle, display_name, is_guest, show_on_leaderboards, created_at, guest_expires_at)
       values ($1, 'Guest', true, false, $2::timestamptz, $3::timestamptz)
       on conflict do nothing returning *`,
      [handle, now.toISOString(), guestExpiry(now).toISOString()],
    );
    if (rows.length) return rows[0];
  }
  throw new Error('Could not allocate a guest handle');
}

/** Member sessions last SESSION_TTL_DAYS; a guest session ends when the guest account expires. */
export async function createSession(db: Queryable, userId: string, guestExpiresAt: Date | null, now = new Date()): Promise<{ token: string; expires: Date }> {
  const token = newToken();
  const expires = guestExpiresAt ? new Date(guestExpiresAt) : new Date(now.getTime() + SESSION_TTL_DAYS.member * 86_400_000);
  await db.query('insert into auth_sessions (id, user_id, expires_at) values ($1, $2, $3::timestamptz)', [
    sha256(token),
    userId,
    expires.toISOString(),
  ]);
  return { token, expires };
}

export async function userForToken(db: Queryable, token: string | undefined, now = new Date()): Promise<UserRow | null> {
  if (!token || token.length > 200) return null;
  const row = await maybeOne<UserRow & { session_id: string; last_seen_at: Date }>(
    db,
    `select u.*, s.id as session_id, s.last_seen_at from auth_sessions s join users u on u.id = s.user_id
     where s.id = $1 and s.expires_at > $2::timestamptz
       and (not u.is_guest or u.guest_expires_at > $2::timestamptz)`,
    [sha256(token), now.toISOString()],
  );
  // An expired guest is signed out at once, even before the cleanup job deletes it.
  if (!row) return null;
  if (now.getTime() - new Date(row.last_seen_at).getTime() > 3_600_000)
    await db.query('update auth_sessions set last_seen_at = $2::timestamptz where id = $1', [row.session_id, now.toISOString()]);
  return row;
}

export async function deleteSession(db: Queryable, token: string): Promise<void> {
  await db.query('delete from auth_sessions where id = $1', [sha256(token)]);
}

/** Fixed-window rate limiter backed by Postgres (works across serverless instances). */
export async function rateLimit(db: Queryable, key: string, limit: number, windowSec: number, now = new Date()): Promise<boolean> {
  const row = await one<{ count: number }>(
    db,
    `insert into rate_limits (key, window_start, count) values ($1, $2::timestamptz, 1)
     on conflict (key) do update set
       count = case when rate_limits.window_start < $2::timestamptz - make_interval(secs => $3) then 1 else rate_limits.count + 1 end,
       window_start = case when rate_limits.window_start < $2::timestamptz - make_interval(secs => $3) then $2::timestamptz else rate_limits.window_start end
     returning count`,
    [key, now.toISOString(), windowSec],
  );
  return row.count <= limit;
}

export interface SignUpInput {
  email: string;
  password: string;
  handle: string;
  displayName: string;
}

/**
 * Creates a member account. If the caller is a guest, the guest account is
 * upgraded in place so all progress made as a guest is kept.
 */
export async function signUp(db: Db, input: SignUpInput, currentGuestId: string | null): Promise<UserRow> {
  const email = input.email.trim().toLowerCase();
  const handle = normalizeHandle(input.handle);
  const displayName = input.displayName.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new AuthError('errors.emailInvalid');
  if (!HANDLE_RE.test(handle) || handle.startsWith('guest-')) throw new AuthError('errors.handleInvalid');
  if (!displayName || displayName.length > 40) throw new AuthError('errors.nameInvalid');
  const pwError = validatePassword(input.password);
  if (pwError) throw new AuthError(pwError);
  const hash = await hashPassword(input.password);

  return db.tx(async (tx) => {
    if (await maybeOne(tx, 'select 1 from users where lower(email) = $1', [email])) throw new AuthError('errors.emailTaken', 409);
    if (await maybeOne(tx, 'select 1 from users where handle = $1', [handle])) throw new AuthError('errors.handleTaken', 409);
    if (currentGuestId) {
      const upgraded = await tx.query<UserRow>(
        `update users set email = $2, password_hash = $3, handle = $4, display_name = $5, is_guest = false, guest_expires_at = null,
                          show_on_leaderboards = true
         where id = $1 and is_guest and guest_expires_at > now() returning *`,
        [currentGuestId, email, hash, handle, displayName],
      );
      if (upgraded.length) return upgraded[0];
    }
    return one<UserRow>(
      tx,
      `insert into users (email, password_hash, handle, display_name, is_guest) values ($1, $2, $3, $4, false) returning *`,
      [email, hash, handle, displayName],
    );
  });
}

export async function verifyLogin(db: Queryable, emailRaw: string, password: string): Promise<UserRow | null> {
  const email = emailRaw.trim().toLowerCase();
  const row = await maybeOne<UserRow & { password_hash: string | null }>(db, 'select * from users where lower(email) = $1', [email]);
  // Hash anyway on unknown emails so timing does not reveal account existence.
  const ok = await verifyPassword(password, row?.password_hash ?? (await dummyHash()));
  return row && ok ? row : null;
}

let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hashPassword(newToken()));

export async function getUserById(db: Queryable, id: string): Promise<UserRow | null> {
  return maybeOne<UserRow>(db, 'select * from users where id = $1', [id]);
}

/** Returns a raw reset token (to be emailed); stores only its hash. */
export async function createPasswordReset(db: Queryable, emailRaw: string, now = new Date()): Promise<{ token: string; userId: string } | null> {
  const user = await maybeOne<{ id: string }>(db, 'select id from users where lower(email) = $1 and not is_guest', [emailRaw.trim().toLowerCase()]);
  if (!user) return null;
  const token = newToken();
  await db.query('insert into password_resets (token_hash, user_id, expires_at) values ($1, $2, $3::timestamptz)', [
    sha256(token),
    user.id,
    new Date(now.getTime() + 3_600_000).toISOString(),
  ]);
  return { token, userId: user.id };
}

export async function resetPassword(db: Db, token: string, password: string, now = new Date()): Promise<void> {
  const pwError = validatePassword(password);
  if (pwError) throw new AuthError(pwError);
  const hash = await hashPassword(password);
  await db.tx(async (tx) => {
    const reset = await maybeOne<{ user_id: string }>(
      tx,
      `update password_resets set used_at = $2::timestamptz where token_hash = $1 and used_at is null and expires_at > $2::timestamptz returning user_id`,
      [sha256(token), now.toISOString()],
    );
    if (!reset) throw new AuthError('errors.resetInvalid');
    await tx.query('update users set password_hash = $2 where id = $1', [reset.user_id, hash]);
    // Sign out everywhere after a reset.
    await tx.query('delete from auth_sessions where user_id = $1', [reset.user_id]);
  });
}

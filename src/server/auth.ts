import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getDb, maybeOne } from '@/lib/db';
import { createGuest, createSession, userForToken, type UserRow } from './users';

export const SESSION_COOKIE = 'gh_session';

const cookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  expires,
});

/** The signed-in (or guest) user for this request, or null. Memoised per request. */
export const currentUser = cache(async (): Promise<UserRow | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return userForToken(await getDb(), token);
});

export async function setSessionCookie(token: string, expires: Date) {
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expires));
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, '', { ...cookieOptions(new Date(0)), maxAge: 0 });
}

/**
 * Route handlers only: returns the current user, creating a guest account
 * (and its session cookie) on first play so progress is saved immediately.
 */
export async function currentOrGuestUser(): Promise<UserRow> {
  const existing = await currentUser();
  if (existing) return existing;
  const db = await getDb();
  const guest = await createGuest(db);
  const { token, expires } = await createSession(db, guest.id, true);
  await setSessionCookie(token, expires);
  return guest;
}

/** Authorization comes only from the user_roles table, checked on the server. */
export async function hasRole(userId: string, role: 'admin' | 'moderator'): Promise<boolean> {
  const db = await getDb();
  return !!(await maybeOne(db, 'select 1 from user_roles where user_id = $1 and role = $2', [userId, role]));
}

export const isAdmin = cache(async (userId: string) => hasRole(userId, 'admin'));

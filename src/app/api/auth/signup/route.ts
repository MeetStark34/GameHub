import { z } from 'zod';
import { getDb } from '@/lib/db';
import { applyBootstrapAdmin } from '@/server/bootstrap';
import { currentUser, setSessionCookie } from '@/server/auth';
import { HttpError, readJson, route } from '@/server/http';
import { createSession, rateLimit, signUp } from '@/server/users';
import { clientIp } from '@/server/request';

const schema = z.object({
  email: z.string().max(254),
  password: z.string().max(200),
  handle: z.string().max(24),
  displayName: z.string().max(40),
});

export const POST = route(async (req) => {
  const body = schema.parse(await readJson(req));
  const db = await getDb();
  if (!(await rateLimit(db, `signup:${clientIp(req)}`, 10, 3600))) throw new HttpError(429, 'errors.tooManySignups');
  const current = await currentUser();
  if (current && !current.is_guest) throw new HttpError(409, 'errors.alreadySignedIn');
  const user = await signUp(db, body, current?.is_guest ? current.id : null);
  // Fresh session for the member account (guest sessions are replaced).
  if (current) await db.query('delete from auth_sessions where user_id = $1', [user.id]);
  await applyBootstrapAdmin(db, user);
  const { token, expires } = await createSession(db, user.id, null);
  await setSessionCookie(token, expires);
  return { ok: true, handle: user.handle };
});

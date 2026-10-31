import { z } from 'zod';
import { getDb } from '@/lib/db';
import { applyBootstrapAdmin } from '@/server/bootstrap';
import { setSessionCookie } from '@/server/auth';
import { HttpError, readJson, route } from '@/server/http';
import { clientIp } from '@/server/request';
import { createSession, rateLimit, verifyLogin } from '@/server/users';

const schema = z.object({ email: z.string().max(254), password: z.string().max(200) });

export const POST = route(async (req) => {
  const { email, password } = schema.parse(await readJson(req));
  const db = await getDb();
  const ipOk = await rateLimit(db, `login-ip:${clientIp(req)}`, 30, 900);
  const emailOk = await rateLimit(db, `login-email:${email.trim().toLowerCase()}`, 8, 900);
  if (!ipOk || !emailOk) throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
  const user = await verifyLogin(db, email, password);
  if (!user) throw new HttpError(401, 'Email or password is incorrect.');
  await applyBootstrapAdmin(db, user);
  const { token, expires } = await createSession(db, user.id, false);
  await setSessionCookie(token, expires);
  return { ok: true, handle: user.handle };
});

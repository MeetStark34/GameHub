import { z } from 'zod';
import { getDb } from '@/lib/db';
import { sendPasswordResetEmail } from '@/server/email';
import { HttpError, readJson, route } from '@/server/http';
import { clientIp, siteUrl } from '@/server/request';
import { createPasswordReset, rateLimit } from '@/server/users';

const schema = z.object({ email: z.string().max(254) });

export const POST = route(async (req) => {
  const { email } = schema.parse(await readJson(req));
  const db = await getDb();
  if (!(await rateLimit(db, `forgot:${clientIp(req)}`, 5, 3600))) throw new HttpError(429, 'Too many requests. Try again later.');
  const reset = await createPasswordReset(db, email);
  if (reset) await sendPasswordResetEmail(email, `${siteUrl()}/reset?token=${encodeURIComponent(reset.token)}`);
  // Same response whether or not the account exists.
  return { ok: true };
});

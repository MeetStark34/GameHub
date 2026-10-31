import { z } from 'zod';
import { getDb } from '@/lib/db';
import { deleteAccount } from '@/server/account';
import { clearSessionCookie, currentUser } from '@/server/auth';
import { HttpError, readJson, route } from '@/server/http';

const schema = z.object({ handle: z.string().max(40), password: z.string().max(200).optional() });

export const POST = route(async (req) => {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'errors.signInFirst');
  await deleteAccount(await getDb(), user.id, schema.parse(await readJson(req)));
  await clearSessionCookie();
  return { ok: true };
});

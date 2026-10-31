import { z } from 'zod';
import { getDb } from '@/lib/db';
import { readJson, route } from '@/server/http';
import { resetPassword } from '@/server/users';

const schema = z.object({ token: z.string().min(10).max(200), password: z.string().max(200) });

export const POST = route(async (req) => {
  const { token, password } = schema.parse(await readJson(req));
  await resetPassword(await getDb(), token, password);
  return { ok: true };
});

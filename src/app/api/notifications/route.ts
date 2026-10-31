import { z } from 'zod';
import { getDb } from '@/lib/db';
import { currentUser } from '@/server/auth';
import { HttpError, readJson, route } from '@/server/http';
import { getNotifications } from '@/server/queries';

export const GET = route(
  async () => {
    const user = await currentUser();
    if (!user) return { notifications: [] };
    return { notifications: await getNotifications(await getDb(), user.id) };
  },
  { mutation: false },
);

const readSchema = z.object({ ids: z.array(z.string().uuid()).max(100).optional() });

/** Marks notifications read: the given ids, or all when none are given. */
export const POST = route(async (req) => {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'errors.signInFirst');
  const { ids } = readSchema.parse(await readJson(req));
  const db = await getDb();
  if (ids?.length)
    await db.query('update notifications set read_at = now() where user_id = $1 and read_at is null and id = any($2::uuid[])', [user.id, ids]);
  else await db.query('update notifications set read_at = now() where user_id = $1 and read_at is null', [user.id]);
  return { ok: true };
});

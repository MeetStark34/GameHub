import { z } from 'zod';
import { getDb } from '@/lib/db';
import { currentUser } from '@/server/auth';
import { HttpError, readJson, route } from '@/server/http';
import { actOnSession } from '@/server/play';

const schema = z.object({ action: z.unknown() });

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) throw new HttpError(404, 'Game not found.');
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Your session expired. Reload to continue.');
  const { action } = schema.parse(await readJson(req));
  return actOnSession(await getDb(), user.id, id, action, new Date());
});

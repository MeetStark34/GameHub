import { z } from 'zod';
import { getDb } from '@/lib/db';
import { currentUser } from '@/server/auth';
import { HttpError, readJson, route } from '@/server/http';
import { useRepairCard } from '@/server/streaks';

const schema = z.object({ kind: z.enum(['normal', 'true_player']), requestId: z.string().uuid() });

export const POST = route(async (req) => {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Sign in first.');
  const { kind, requestId } = schema.parse(await readJson(req));
  return useRepairCard(await getDb(), user.id, kind, requestId, new Date());
});

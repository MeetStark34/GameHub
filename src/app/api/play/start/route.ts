import { z } from 'zod';
import { getDb } from '@/lib/db';
import { DIFFICULTIES, GAME_IDS } from '@/games/types';
import { currentOrGuestUser } from '@/server/auth';
import { readJson, route } from '@/server/http';
import { startSession } from '@/server/play';

const schema = z.object({
  game: z.enum(GAME_IDS),
  mode: z.enum(['daily', 'unlimited']),
  difficulty: z.enum(DIFFICULTIES).optional(),
  fresh: z.boolean().optional(),
});

export const POST = route(async (req) => {
  const body = schema.parse(await readJson(req));
  const user = await currentOrGuestUser();
  return startSession(await getDb(), { userId: user.id, ...body, now: new Date() });
});

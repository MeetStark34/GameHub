import { getDb } from '@/lib/db';
import { currentUser } from '@/server/auth';
import { route } from '@/server/http';
import { getPlayerSummary } from '@/server/queries';

export const GET = route(
  async () => {
    const user = await currentUser();
    if (!user) return { summary: null };
    return { summary: await getPlayerSummary(await getDb(), user.id, new Date()) };
  },
  { mutation: false },
);

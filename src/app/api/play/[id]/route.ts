import { z } from 'zod';
import { getDb } from '@/lib/db';
import { currentUser } from '@/server/auth';
import { HttpError, route } from '@/server/http';
import { getSession } from '@/server/play';

export const GET = route<{ params: Promise<{ id: string }> }>(
  async (_req, { params }) => {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new HttpError(404, 'Game not found.');
    const user = await currentUser();
    if (!user) throw new HttpError(401, 'Sign in to view this game.');
    return getSession(await getDb(), user.id, id, new Date());
  },
  { mutation: false },
);

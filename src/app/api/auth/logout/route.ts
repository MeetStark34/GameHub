import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { clearSessionCookie, SESSION_COOKIE } from '@/server/auth';
import { route } from '@/server/http';
import { deleteSession } from '@/server/users';

export const POST = route(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(await getDb(), token);
  await clearSessionCookie();
  return { ok: true };
});

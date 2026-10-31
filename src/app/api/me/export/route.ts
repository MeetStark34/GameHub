import { getDb } from '@/lib/db';
import { exportUserData } from '@/server/account';
import { currentUser } from '@/server/auth';
import { HttpError, route } from '@/server/http';

export const GET = route(
  async () => {
    const user = await currentUser();
    if (!user) throw new HttpError(401, 'Sign in first.');
    const data = await exportUserData(await getDb(), user.id);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="gamehub-${user.handle}-export.json"`,
        'Cache-Control': 'no-store',
      },
    });
  },
  { mutation: false },
);

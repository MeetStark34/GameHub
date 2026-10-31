import { getDb } from '@/lib/db';
import { adminActionSchema, runAdminAction } from '@/server/admin';
import { currentUser, isAdmin } from '@/server/auth';
import { HttpError, readJson, route } from '@/server/http';

/** Single entry point for admin/developer actions. Role checked server-side on every call. */
export const POST = route(async (req) => {
  const user = await currentUser();
  if (!user || user.is_guest || !(await isAdmin(user.id))) throw new HttpError(403, 'errors.adminsOnly');
  const input = adminActionSchema.parse(await readJson(req));
  return { ok: true, result: await runAdminAction(await getDb(), user.id, input, new Date()) };
});

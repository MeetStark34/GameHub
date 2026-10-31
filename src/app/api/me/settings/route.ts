import { getDb } from '@/lib/db';
import { settingsSchema, updateSettings } from '@/server/account';
import { currentUser } from '@/server/auth';
import { HttpError, readJson, route } from '@/server/http';

export const PATCH = route(async (req) => {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Sign in first.');
  const input = settingsSchema.parse(await readJson(req));
  if (user.is_guest && (input.profilePublic !== undefined || input.showOnLeaderboards !== undefined || input.displayName !== undefined))
    throw new HttpError(403, 'Create an account to set up a public profile.');
  await updateSettings(await getDb(), user.id, input);
  return { ok: true };
});

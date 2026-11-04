import { getDb, maybeOne } from '@/lib/db';
import { toUtcDate } from '@/lib/time';
import { ResetTicker } from '@/components/layout/reset-ticker';
import { currentUser } from '@/server/auth';
import { dailyDifficultyFor } from '@/config/games';

/**
 * The news-style reset ticker belongs to the Dashboard only. Rendering it
 * from this route layout (instead of the root layout) keeps it off every
 * other page without per-page conditions.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const today = toUtcDate(now);
  const user = await currentUser();
  const done = user
    ? ((await maybeOne<{ n: number }>(await getDb(), 'select daily_completed n from daily_activity where user_id = $1 and utc_date = $2', [user.id, today]))?.n ?? 0)
    : null;
  return (
    <>
      <div className="-mx-4 -mt-6 mb-6 sm:-mx-6">
        <ResetTicker serverNow={now.toISOString()} difficulty={dailyDifficultyFor(today)} dailyDone={done} />
      </div>
      {children}
    </>
  );
}

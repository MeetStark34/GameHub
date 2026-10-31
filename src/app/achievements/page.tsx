import type { Metadata } from 'next';
import { ACHIEVEMENT_CATEGORIES, type AchievementCategory } from '@/config/achievements';
import { getDb } from '@/lib/db';
import { AchievementIcon } from '@/components/achievement-icon';
import { Card, PageHeader, Progress, cn } from '@/components/ui';
import { currentUser } from '@/server/auth';
import { getAchievements } from '@/server/queries';

export const metadata: Metadata = { title: 'Achievements', description: 'Every GameHub achievement, from First Steps to the strange hidden ones.' };

export default async function AchievementsPage() {
  const user = await currentUser();
  const list = await getAchievements(await getDb(), user?.id ?? null, new Date());
  const unlocked = list.filter((a) => a.unlockedAt).length;
  const cats = Object.keys(ACHIEVEMENT_CATEGORIES) as AchievementCategory[];

  return (
    <div>
      <PageHeader eyebrow={`${unlocked} of ${list.length} unlocked`} title="Achievements">
        Some are milestones, some are weird. Hidden ones reveal themselves when you earn them.
      </PageHeader>
      <Progress value={unlocked / list.length} label="Achievements unlocked" tone="gold" className="mb-8" />
      <div className="space-y-8">
        {cats.map((cat) => {
          const items = list.filter((a) => a.category === cat);
          if (!items.length) return null;
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h2 id={`cat-${cat}`} className="mb-3 font-display text-lg font-bold">
                {ACHIEVEMENT_CATEGORIES[cat]}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a) => {
                  const got = !!a.unlockedAt;
                  return (
                    <li key={a.id}>
                      <Card className={cn('flex h-full items-start gap-3 p-3', got ? 'border-gold/40' : 'opacity-80')}>
                        <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl border', got ? 'border-gold/50 bg-gold/15 text-gold' : 'border-border bg-subtle text-muted')}>
                          <AchievementIcon name={a.icon} className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="font-semibold">{a.name}</span>
                            <span className="num shrink-0 font-mono text-xs font-bold text-gold">+{a.xp}</span>
                          </span>
                          <span className="block text-sm text-muted">{a.description}</span>
                          {got ? (
                            <span className="mt-1 block text-xs text-success">Unlocked {new Date(a.unlockedAt!).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</span>
                          ) : (
                            a.progress && (
                              <span className="mt-2 flex items-center gap-2">
                                <Progress value={a.progress.value / a.progress.target} label={`${a.name} progress`} className="h-1.5 flex-1" />
                                <span className="num font-mono text-[11px] text-muted">
                                  {a.progress.value.toLocaleString('en-US')}/{a.progress.target.toLocaleString('en-US')}
                                </span>
                              </span>
                            )
                          )}
                        </span>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

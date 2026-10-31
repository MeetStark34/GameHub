import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Crown, Flame, Gamepad2, Trophy } from 'lucide-react';
import { GAMES } from '@/config/games';
import { getDb } from '@/lib/db';
import { AchievementIcon } from '@/components/achievement-icon';
import { GameTile } from '@/components/game-card';
import { BADGE_LABELS, ButtonLink, Card, Eyebrow, Pill, Progress } from '@/components/ui';
import { currentUser } from '@/server/auth';
import { getPublicProfile } from '@/server/queries';

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const p = await getPublicProfile(await getDb(), handle, null, new Date());
  if (!p) return { title: 'Player not found', robots: { index: false } };
  return { title: `${p.displayName} (@${p.handle})`, description: `${p.displayName} is ${p.rank.label} on GameHub with ${p.xp.toLocaleString('en-US')} XP.` };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const viewer = await currentUser();
  const p = await getPublicProfile(await getDb(), handle, viewer?.id ?? null, new Date());
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-5 p-6">
          <span className="grid size-20 place-items-center rounded-2xl bg-fg font-display text-4xl font-bold uppercase text-bg">{p.displayName.slice(0, 1)}</span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight">{p.displayName}</h1>
            <p className="text-sm text-muted">
              @{p.handle}
              {p.title && ` · ${p.title}`} · since {new Date(p.memberSince).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
            </p>
            {p.badges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.badges.map((b) => (
                  <Pill key={b} className="border-accent/40 text-accent">
                    {BADGE_LABELS[b] ?? b}
                  </Pill>
                ))}
              </div>
            )}
          </div>
          {p.isOwner && (
            <ButtonLink href="/settings" variant="secondary" size="sm">
              Edit profile
            </ButtonLink>
          )}
        </div>
        <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
          {[
            { icon: Trophy, label: `Level ${p.rank.level}`, value: p.rank.label, sub: `${p.xp.toLocaleString('en-US')} XP` },
            { icon: Flame, label: 'Day Streak', value: String(p.normalStreak.current), sub: `Best ${p.normalStreak.best}` },
            { icon: Crown, label: 'True Player Sets', value: String(p.truePlayerDays), sub: `Streak ${p.truePlayerStreak.current}` },
            { icon: Gamepad2, label: 'Games', value: p.gamesCompleted.toLocaleString('en-US'), sub: 'completed' },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="border-border p-4 [&:not(:last-child)]:border-r">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <Icon className="size-3.5" aria-hidden /> {label}
              </dt>
              <dd className="num font-display text-xl font-bold">{value}</dd>
              <dd className="num font-mono text-xs text-muted">{sub}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <section aria-labelledby="mastery">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="mastery" className="font-display text-lg font-bold uppercase tracking-wide">
            Game mastery
          </h2>
          <span className="text-sm">
            Overall: <span className="font-bold uppercase">{p.overallMastery.name}</span>
          </span>
        </div>
        <Card className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
          {p.mastery.map((m) => (
            <div key={m.game} className="flex items-center gap-3 border-border p-3 sm:border-b">
              <GameTile game={m.game} className="size-8" />
              <span className="min-w-0 flex-1">
                <span className="flex justify-between text-sm">
                  <span className="font-semibold">{GAMES[m.game].name}</span>
                  <span className="font-bold uppercase">{m.rank.name}</span>
                </span>
                <Progress value={m.rank.progress} label={`${GAMES[m.game].name} mastery`} className="mt-1 h-1.5" />
              </span>
            </div>
          ))}
        </Card>
      </section>

      <section aria-labelledby="ach">
        <Eyebrow className="mb-1">
          {p.achievements.length}/{p.achievementsTotal}
        </Eyebrow>
        <h2 id="ach" className="mb-3 font-display text-lg font-bold">
          Achievements
        </h2>
        {p.achievements.length === 0 ? (
          <p className="text-sm text-muted">None yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {p.achievements.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-medium" title={new Date(a.unlockedAt).toUTCString()}>
                <AchievementIcon name={a.icon} className="size-4 text-gold" />
                {a.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

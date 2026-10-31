import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Crown, Flame, Gamepad2, ShieldOff, Trophy } from 'lucide-react';
import { GAMES } from '@/config/games';
import { getDb } from '@/lib/db';
import { achievementText } from '@/i18n/helpers';
import { getTranslator } from '@/i18n/server';
import { AchievementIcon } from '@/components/achievement-icon';
import { GameTile } from '@/components/game-card';
import { ButtonLink, Card, Eyebrow, Pill, Progress } from '@/components/ui';
import { currentUser } from '@/server/auth';
import { getPublicProfile } from '@/server/queries';

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const { t } = await getTranslator();
  const p = await getPublicProfile(await getDb(), handle, null, new Date());
  if (!p) return { title: t('profile.notFound'), robots: { index: false } };
  return { title: `${p.displayName} (@${p.handle})`, description: `${p.displayName} · ${p.rank.label} · ${p.xp} XP` };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const tr = await getTranslator();
  const { t, num, locale } = tr;
  const viewer = await currentUser();
  const p = await getPublicProfile(await getDb(), handle, viewer?.id ?? null, new Date());
  if (!p) notFound();

  const stats = [
    { icon: Trophy, label: t('profile.level', { level: p.rank.level }), value: p.rank.label, sub: `${num(p.xp)} XP` },
    { icon: Flame, label: t('profile.dayStreak'), value: num(p.normalStreak.current), sub: t('profile.best', { count: p.normalStreak.best }) },
    { icon: Crown, label: t('profile.truePlayerSets'), value: num(p.truePlayerDays), sub: t('profile.streakValue', { count: p.truePlayerStreak.current }) },
    { icon: Gamepad2, label: t('profile.games'), value: num(p.gamesCompleted), sub: t('profile.completed') },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-5 p-6">
          <span className="grid size-20 place-items-center rounded-2xl bg-fg font-display text-4xl font-bold uppercase text-bg">{p.displayName.slice(0, 1)}</span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight">{p.displayName}</h1>
            <p className="text-sm text-muted">
              @{p.handle}
              {p.title && ` · ${p.title}`} · {t('profile.since', { date: new Date(p.memberSince).toLocaleDateString(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }) })}
            </p>
            {/* Role badges and rank are separate: a badge is cosmetic, the rank comes from XP. */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {p.badges.map((b) => (
                <Pill key={b} className="border-accent/40 bg-accent-soft font-semibold text-accent">
                  {t(`badges.${b}`)}
                </Pill>
              ))}
              <Link href="/ranks">
                <Pill className="border-gold/50 bg-gold/15 font-bold uppercase tracking-wide text-gold">{p.rank.label}</Pill>
              </Link>
            </div>
          </div>
          {p.isOwner && (
            <ButtonLink href="/settings" variant="secondary" size="sm">
              {t('profile.edit')}
            </ButtonLink>
          )}
        </div>
        <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
          {stats.map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="border-border p-4 [&:not(:last-child)]:border-r">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <Icon className="size-3.5" aria-hidden /> {label}
              </dt>
              <dd className="num font-display text-xl font-bold uppercase">{value}</dd>
              <dd className="num font-mono text-xs text-muted">{sub}</dd>
            </div>
          ))}
        </dl>
        {p.leaderboardExcluded && (
          <p className="flex items-center gap-2 border-t border-border px-6 py-2 text-xs text-muted">
            <ShieldOff className="size-3.5" aria-hidden /> {t('profile.developer')}
          </p>
        )}
      </Card>

      <section aria-labelledby="mastery">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="mastery" className="font-display text-lg font-bold uppercase tracking-wide">
            {t('profile.mastery')}
          </h2>
          <span className="text-sm">
            {t('profile.overall')}: <span className="font-bold uppercase">{p.overallMastery.name}</span>
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
                <Progress value={m.rank.progress} label={t('result.mastery', { game: GAMES[m.game].name })} className="mt-1 h-1.5" />
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
          {t('profile.achievements')}
        </h2>
        {p.achievements.length === 0 ? (
          <p className="text-sm text-muted">{t('common.noneYet')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {p.achievements.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-medium" title={new Date(a.unlockedAt).toUTCString()}>
                <AchievementIcon name={a.icon} className="size-4 text-gold" />
                {achievementText(tr, a.id).name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

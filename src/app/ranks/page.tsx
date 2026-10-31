import type { Metadata } from 'next';
import { Check, Infinity as InfinityIcon, Lock, MapPin } from 'lucide-react';
import { XP_ECONOMY } from '@/config/economy';
import { PLAYER_RANKS } from '@/config/ranks';
import { getDb, maybeOne } from '@/lib/db';
import { ladderOf } from '@/lib/progression/ladder';
import { rankFromXp } from '@/lib/progression/ranks';
import { getTranslator } from '@/i18n/server';
import { Card, Eyebrow, PageHeader, Progress, cn } from '@/components/ui';
import { currentUser } from '@/server/auth';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('ranks.title'), description: t('ranks.intro') };
}

export default async function RanksPage() {
  const { t, num } = await getTranslator();
  const user = await currentUser();
  const xp = user ? ((await maybeOne<{ total_xp: number }>(await getDb(), 'select total_xp from user_stats where user_id = $1', [user.id]))?.total_xp ?? 0) : 0;
  const me = rankFromXp(xp, PLAYER_RANKS);
  const ladder = ladderOf(PLAYER_RANKS);
  const B = XP_ECONOMY.baseByDifficulty;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={t('ranks.eyebrow')} title={t('ranks.title')}>
        {t('ranks.intro')}
      </PageHeader>

      <Card className="mb-8 grid gap-4 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="grid size-20 place-items-center rounded-2xl bg-accent font-display text-3xl font-bold text-accent-fg">{me.level}</div>
        <div>
          <Eyebrow>{t('ranks.current')}</Eyebrow>
          <p className="font-display text-3xl font-bold uppercase tracking-tight">{me.label}</p>
          <p className="num font-mono text-sm text-muted">
            {t('ranks.yourXp')}: {num(me.xp)} XP
          </p>
          <div className="mt-3">
            <Progress value={me.progress} label={t('result.progressLabel')} />
            <p className="mt-1 text-xs text-muted">
              {me.nextAt !== null ? `${t('ranks.nextTier')}: ${me.nextLabel} · ${t('ranks.toGo', { xp: num(me.nextAt - me.xp) })}` : t('ranks.maxed')}
            </p>
          </div>
        </div>
      </Card>

      <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[1.35rem] before:top-4 before:w-0.5 before:bg-border" aria-label={t('ranks.title')}>
        {ladder.map((rank) => {
          const reached = me.xp >= rank.start;
          const isCurrent = me.rankIndex === rank.index;
          const isLast = rank.index === ladder.length - 1;
          return (
            <li key={rank.name} className="relative flex gap-4" aria-current={isCurrent ? 'step' : undefined}>
              <span
                className={cn(
                  'z-10 mt-3 grid size-11 shrink-0 place-items-center rounded-full border-2 font-mono text-sm font-bold',
                  isCurrent ? 'border-accent bg-accent text-accent-fg' : reached ? 'border-success bg-success/15 text-success' : 'border-border bg-card text-muted',
                )}
              >
                {reached && !isCurrent ? <Check className="size-5" aria-hidden /> : !reached ? <Lock className="size-4" aria-hidden /> : rank.index + 1}
              </span>
              <Card className={cn('flex-1 p-4', isCurrent && 'border-accent ring-2 ring-accent/30', !reached && 'opacity-75')}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-xl font-bold uppercase tracking-wide">{rank.name}</h2>
                  <span className="flex items-center gap-2 text-xs">
                    {isCurrent && (
                      <span className="flex items-center gap-1 font-semibold text-accent">
                        <MapPin className="size-3.5" aria-hidden /> {t('ranks.currentTag')}
                      </span>
                    )}
                    <span className={cn('rounded-md px-1.5 py-0.5 font-semibold', reached ? 'bg-success/15 text-success' : 'bg-subtle text-muted')}>{reached ? t('ranks.unlocked') : t('ranks.locked')}</span>
                    <span className="num font-mono text-muted">{t('ranks.from', { xp: num(rank.start) })}</span>
                  </span>
                </div>
                <ul className="grid gap-2 sm:grid-cols-3">
                  {rank.tiers.map((tier) => {
                    const done = tier.end !== null && me.xp >= tier.end;
                    const here = me.xp >= tier.start && (tier.end === null || me.xp < tier.end);
                    const value = done ? 1 : here ? (tier.end === null ? 1 : (me.xp - tier.start) / (tier.end - tier.start)) : 0;
                    return (
                      <li key={tier.label} className={cn('rounded-xl border p-2.5', here ? 'border-accent bg-accent-soft' : 'border-border')}>
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span>{tier.label}</span>
                          {done && <Check className="size-4 text-success" aria-hidden />}
                        </div>
                        <p className="num mb-1.5 font-mono text-[11px] text-muted">
                          {num(tier.start)}
                          {tier.end !== null ? ` – ${num(tier.end - 1)}` : '+'}
                        </p>
                        <Progress value={value} label={t('ranks.tierProgress', { tier: tier.label })} className="h-1.5" tone={done ? 'success' : 'accent'} />
                      </li>
                    );
                  })}
                </ul>
                {isLast && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-gold">
                    <InfinityIcon className="size-4" aria-hidden /> {t('ranks.noLimit')}
                  </p>
                )}
              </Card>
            </li>
          );
        })}
      </ol>

      <Card className="mt-8 space-y-1.5 p-5 text-sm text-muted">
        <h2 className="mb-2 font-display text-lg font-bold text-fg">{t('ranks.howToEarn')}</h2>
        <p>{t('ranks.earnDaily', { mult: XP_ECONOMY.dailyMultiplier })}</p>
        <p>{t('ranks.earnDifficulty', { easy: B.easy, normal: B.normal, hard: B.hard, expert: B.expert })}</p>
        <p>{t('ranks.earnBonuses', { first: XP_ECONOMY.firstDailyGameBonus, set: XP_ECONOMY.dailySetCompleteBonus })}</p>
      </Card>
    </div>
  );
}

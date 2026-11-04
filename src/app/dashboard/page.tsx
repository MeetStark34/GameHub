import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Award, Crown, Flame, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { GAMES } from '@/config/games';
import { getDb } from '@/lib/db';
import { formatDuration } from '@/lib/time';
import type { StreakView } from '@/lib/progression/streaks';
import { getTranslator } from '@/i18n/server';
import type { Translator } from '@/i18n/translate';
import { DailyGameCard, DailyStrip, GameTile } from '@/components/game-card';
import { RepairButton } from '@/components/dashboard/repair-button';
import { StreakNudge } from '@/components/dashboard/streak-nudge';
import { ButtonLink, Card, Eyebrow, Pill, Progress, SectionTitle, cn } from '@/components/ui';
import { currentUser } from '@/server/auth';
import { getPlayerSummary } from '@/server/queries';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('dashboard.title'), robots: { index: false } };
}

export default async function Dashboard() {
  const tr = await getTranslator();
  const { t, num } = tr;
  const user = await currentUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <Eyebrow className="mb-2">{t('dashboard.emptyEyebrow')}</Eyebrow>
        <h1 className="font-display text-3xl font-bold">{t('dashboard.emptyTitle')}</h1>
        <p className="mt-2 text-muted">{t('dashboard.emptyBody')}</p>
        <div className="mt-6 flex justify-center gap-2">
          <ButtonLink href="/daily">{t('landing.playDaily')}</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            {t('nav.signIn')}
          </ButtonLink>
        </div>
      </div>
    );
  }
  const now = new Date();
  const s = await getPlayerSummary(await getDb(), user.id, now);
  const next = s.today.games.find((g) => g.status === 'in-progress') ?? s.today.games.find((g) => g.status === 'not-started');

  return (
    <div className="space-y-8">
      {s.streaks.normal.status === 'at-risk' && <StreakNudge date={s.today.date} streak={s.streaks.normal.current} />}

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>
            {s.today.date} · {t('difficulty.day', { difficulty: t(`difficulty.${s.today.difficulty}`) })}
          </Eyebrow>
          <h1 className="font-display text-3xl font-bold tracking-tight">{s.user.isGuest ? t('dashboard.welcomeGuest') : t('dashboard.hey', { name: s.user.displayName })}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {s.badges.map((b) => (
              <Pill key={b}>{t(`badges.${b}`)}</Pill>
            ))}
          </div>
        </div>
        {s.user.isGuest && (
          <Card className="flex items-center gap-3 p-3 text-sm">
            <span>{t('dashboard.savedToBrowser')}</span>
            <ButtonLink href="/signup" size="sm">
              {t('dashboard.claim')}
            </ButtonLink>
          </Card>
        )}
      </section>

      <Card className="overflow-hidden">
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <Eyebrow className="mb-1">{t('dashboard.todaysSet')}</Eyebrow>
            <p className="font-display text-2xl font-bold">
              {s.today.completed === 8 ? t('dashboard.setComplete') : next ? t('dashboard.nextUp', { game: GAMES[next.game].name }) : t('dashboard.dailySet')}
            </p>
            <p className="mb-3 text-sm text-muted">
              {t('dashboard.doneCount', { done: s.today.completed })}
              {s.today.completed === 0 && ` · ${t('dashboard.keepStreak')}`}
              {s.today.completed > 0 && s.today.completed < 8 && ` · ${t('dashboard.moreForTrue', { count: 8 - s.today.completed })}`}
            </p>
            <DailyStrip games={s.today.games} />
          </div>
          <div className="flex flex-wrap gap-2">
            {next ? (
              <ButtonLink href={`/play/${next.game}?mode=daily`} size="lg">
                {next.status === 'in-progress' ? t('dashboard.resumeGame', { game: GAMES[next.game].name }) : t('dashboard.playGame', { game: GAMES[next.game].name })}{' '}
                <ArrowRight className="size-5" aria-hidden />
              </ButtonLink>
            ) : (
              <ButtonLink href="/unlimited" size="lg">
                <InfinityIcon className="size-5" aria-hidden /> {t('dashboard.keepGoing')}
              </ButtonLink>
            )}
            <ButtonLink href="/daily" size="lg" variant="secondary">
              {t('dashboard.all8')}
            </ButtonLink>
          </div>
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={t('dashboard.progress')}>
        <Link href="/ranks" className="rounded-2xl border border-border bg-card p-4 transition hover:border-accent">
          <Eyebrow>{t('dashboard.rank')}</Eyebrow>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold uppercase">{s.rank.label}</span>
            <span className="text-xs text-muted">{t('common.lv', { level: s.rank.level })}</span>
          </div>
          <p className="num mb-2 font-mono text-sm text-muted">{num(s.xp)} XP</p>
          <Progress value={s.rank.progress} label={t('result.progressLabel')} />
          <p className="mt-1 text-xs text-muted">{s.rank.nextAt ? t('dashboard.toNext', { xp: num(s.rank.nextAt - s.xp), next: s.rank.nextLabel ?? '' }) : t('dashboard.topTier')}</p>
        </Link>
        <StreakCard tr={tr} title={t('streak.normal')} icon={<Flame className="size-5" />} view={s.streaks.normal} kind="normal" cards={s.cards.held} note={t('streak.normalNote')} />
        <StreakCard tr={tr} title={t('streak.truePlayer')} icon={<Crown className="size-5" />} view={s.streaks.truePlayer} kind="true_player" cards={s.cards.held} note={t('streak.trueNote')} />
        <Card className="p-4">
          <Eyebrow>{t('dashboard.goldCards')}</Eyebrow>
          <div className="mt-2 flex gap-1.5" aria-label={t('dashboard.cardsHeld', { held: s.cards.held, max: s.cards.max })}>
            {Array.from({ length: s.cards.max }, (_, i) => (
              <span key={i} className={cn('h-9 flex-1 rounded-lg border-2', i < s.cards.held ? 'border-gold bg-gold/25' : 'border-dashed border-border')} />
            ))}
          </div>
          <p className="mb-1.5 mt-3 text-xs text-muted">{t('dashboard.punchCard', { count: s.cards.punchProgress, total: s.cards.punchesPerCard })}</p>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: s.cards.punchesPerCard }, (_, i) => (
              <span key={i} className={cn('size-3.5 rounded-full border', i < s.cards.punchProgress ? 'border-gold bg-gold' : 'border-border')} />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">{t('dashboard.punchesHint', { today: s.today.gamesPlayedToday, target: s.today.volumeTarget })}</p>
        </Card>
      </section>

      <section aria-labelledby="daily-title">
        <SectionTitle
          id="daily-title"
          action={
            <Link href="/daily" className="text-sm text-accent">
              {t('dashboard.details')}
            </Link>
          }
        >
          {t('dashboard.dailySet')}
        </SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {s.today.games.map((g) => (
            <DailyGameCard key={g.game} {...g} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="mastery-title">
          <SectionTitle id="mastery-title" action={<Pill>{t('dashboard.overall', { rank: s.overallMastery.name })}</Pill>}>
            {t('dashboard.mastery')}
          </SectionTitle>
          <Card className="divide-y divide-border">
            {s.mastery.map((m) => (
              <Link key={m.game} href={`/play/${m.game}?mode=unlimited`} prefetch={false} className="flex items-center gap-3 p-3 hover:bg-subtle/60">
                <GameTile game={m.game} className="size-8" />
                <span className="w-28 shrink-0 text-sm font-semibold">{GAMES[m.game].name}</span>
                <span className="flex-1">
                  <Progress value={m.rank.progress} label={t('result.mastery', { game: GAMES[m.game].name })} className="h-1.5" />
                </span>
                <span className="w-28 shrink-0 text-right text-xs font-semibold">{m.rank.label}</span>
              </Link>
            ))}
          </Card>
        </section>

        <section aria-labelledby="recent-title" className="space-y-6">
          <div>
            <SectionTitle id="recent-title">{t('dashboard.recent')}</SectionTitle>
            <Card className="divide-y divide-border">
              {s.recent.length === 0 && <p className="p-4 text-sm text-muted">{t('dashboard.noRecent')}</p>}
              {s.recent.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 text-sm">
                  <GameTile game={r.game} className="size-7" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {GAMES[r.game].name} <span className="text-muted">· {r.mode === 'daily' ? t('nav.dailyShort') : t(`difficulty.${r.difficulty}`)}</span>
                    </span>
                    <span className="num block font-mono text-xs text-muted">
                      {formatDuration(r.durationMs)} · {t('common.pts', { count: r.score })}
                    </span>
                  </span>
                  <span className="num font-mono text-xs font-bold text-gold">+{r.xp}</span>
                </div>
              ))}
            </Card>
          </div>
          <Link href="/achievements" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-subtle/60">
            <Award className="size-6 text-gold" aria-hidden />
            <span className="flex-1">
              <span className="block font-semibold">{t('nav.achievements')}</span>
              <span className="block text-xs text-muted">{t('dashboard.unlocked', { count: s.achievements.unlocked, total: s.achievements.total })}</span>
            </span>
            <Sparkles className="size-4 text-muted" aria-hidden />
          </Link>
        </section>
      </div>
    </div>
  );
}

function StreakCard({ tr, title, icon, view, kind, cards, note }: { tr: Translator; title: string; icon: React.ReactNode; view: StreakView; kind: 'normal' | 'true_player'; cards: number; note: string }) {
  const { t } = tr;
  const tone = view.status === 'active' ? 'text-success' : view.status === 'at-risk' ? 'text-warning' : view.status === 'broken' ? 'text-danger' : 'text-muted';
  const label = { active: t('streak.active'), 'at-risk': t('streak.atRisk'), broken: t('streak.broken'), none: t('streak.none') }[view.status];
  return (
    <Card className="p-4">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-1 flex items-center gap-2">
        <span className={tone} aria-hidden>
          {icon}
        </span>
        <span className="num font-display text-3xl font-bold">{view.current}</span>
        <span className="text-sm text-muted">{t(view.current === 1 ? 'common.dayUnit' : 'common.daysUnit')}</span>
      </div>
      <p className={cn('text-xs font-semibold', tone)}>{label}</p>
      <p className="mb-2 text-xs text-muted">
        {t('streak.best', { count: view.best })} · {note}
      </p>
      {view.repairable && <RepairButton kind={kind} restoresTo={view.repairable.restoresTo} missedDays={view.repairable.missedDays} cardsHeld={cards} />}
    </Card>
  );
}

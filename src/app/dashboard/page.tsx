import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Award, Crown, Flame, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { DIFFICULTY_LABELS, GAMES } from '@/config/games';
import { getDb } from '@/lib/db';
import { formatDuration } from '@/lib/time';
import type { StreakView } from '@/lib/progression/streaks';
import { DailyGameCard, DailyStrip, GameTile } from '@/components/game-card';
import { RepairButton } from '@/components/dashboard/repair-button';
import { StreakNudge } from '@/components/dashboard/streak-nudge';
import { ButtonLink, Card, Eyebrow, Pill, Progress, SectionTitle, cn, BADGE_LABELS } from '@/components/ui';
import { currentUser } from '@/server/auth';
import { getPlayerSummary } from '@/server/queries';

export const metadata: Metadata = { title: 'Dashboard', robots: { index: false } };

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <Eyebrow className="mb-2">Welcome to GameHub</Eyebrow>
        <h1 className="font-display text-3xl font-bold">Your dashboard starts with one game.</h1>
        <p className="mt-2 text-muted">Play any Daily Set game and a guest profile is created automatically. Claim it with an account whenever you like.</p>
        <div className="mt-6 flex justify-center gap-2">
          <ButtonLink href="/daily">Play the Daily Set</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            Sign in
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
          <Eyebrow>{s.today.date} · {DIFFICULTY_LABELS[s.today.difficulty]} day</Eyebrow>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {s.user.isGuest ? 'Welcome, guest' : `Hey, ${s.user.displayName}`}
          </h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {s.badges.map((b) => (
              <Pill key={b}>{BADGE_LABELS[b] ?? b}</Pill>
            ))}
          </div>
        </div>
        {s.user.isGuest && (
          <Card className="flex items-center gap-3 p-3 text-sm">
            <span>Your progress is saved to this browser.</span>
            <ButtonLink href="/signup" size="sm">
              Claim it
            </ButtonLink>
          </Card>
        )}
      </section>

      {/* Primary action */}
      <Card className="overflow-hidden">
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <Eyebrow className="mb-1">Today&apos;s Daily Set</Eyebrow>
            <p className="font-display text-2xl font-bold">
              {s.today.completed === 8 ? 'Complete. True Player day secured.' : next ? `Next up: ${GAMES[next.game].name}` : 'Daily Set'}
            </p>
            <p className="mb-3 text-sm text-muted">
              {s.today.completed}/8 done
              {s.today.completed === 0 && ' · play one game to keep your Normal Streak'}
              {s.today.completed > 0 && s.today.completed < 8 && ` · ${8 - s.today.completed} more for a True Player day`}
            </p>
            <DailyStrip games={s.today.games} />
          </div>
          <div className="flex flex-wrap gap-2">
            {next ? (
              <ButtonLink href={`/play/${next.game}?mode=daily`} size="lg">
                {next.status === 'in-progress' ? 'Resume' : 'Play'} {GAMES[next.game].name} <ArrowRight className="size-5" aria-hidden />
              </ButtonLink>
            ) : (
              <ButtonLink href="/unlimited" size="lg">
                <InfinityIcon className="size-5" aria-hidden /> Keep going in Unlimited
              </ButtonLink>
            )}
            <ButtonLink href="/daily" size="lg" variant="secondary">
              All 8
            </ButtonLink>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Your progress">
        <Card className="p-4">
          <Eyebrow>Rank</Eyebrow>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold">{s.rank.label}</span>
            <span className="text-xs text-muted">Lv {s.rank.level}</span>
          </div>
          <p className="num mb-2 font-mono text-sm text-muted">{s.xp.toLocaleString('en-US')} XP</p>
          <Progress value={s.rank.progress} label="Progress to next rank" />
          <p className="mt-1 text-xs text-muted">{s.rank.nextAt ? `${(s.rank.nextAt - s.xp).toLocaleString('en-US')} XP to ${s.rank.nextLabel}` : 'Top tier. XP keeps counting.'}</p>
        </Card>
        <StreakCard title="Normal Streak" icon={<Flame className="size-5" />} view={s.streaks.normal} kind="normal" cards={s.cards.held} note="1+ Daily game a day" />
        <StreakCard title="True Player Streak" icon={<Crown className="size-5" />} view={s.streaks.truePlayer} kind="true_player" cards={s.cards.held} note="All 8 Daily games a day" />
        <Card className="p-4">
          <Eyebrow>Gold Repair Cards</Eyebrow>
          <div className="mt-2 flex gap-1.5" aria-label={`${s.cards.held} of ${s.cards.max} cards held`}>
            {Array.from({ length: s.cards.max }, (_, i) => (
              <span key={i} className={cn('h-9 flex-1 rounded-lg border-2', i < s.cards.held ? 'border-gold bg-gold/25' : 'border-dashed border-border')} />
            ))}
          </div>
          <p className="mb-1.5 mt-3 text-xs text-muted">
            Punch card {s.cards.punchProgress}/{s.cards.punchesPerCard}
          </p>
          <div className="flex gap-1" aria-label={`${s.cards.punchProgress} of ${s.cards.punchesPerCard} punches`}>
            {Array.from({ length: s.cards.punchesPerCard }, (_, i) => (
              <span key={i} className={cn('size-3.5 rounded-full border', i < s.cards.punchProgress ? 'border-gold bg-gold' : 'border-border')} />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Punches: {s.today.gamesPlayedToday}/{s.today.volumeTarget} games today, or every 2 full Daily Sets.
          </p>
        </Card>
      </section>

      <section aria-labelledby="daily-title">
        <SectionTitle id="daily-title" action={<Link href="/daily" className="text-sm text-accent">Details</Link>}>
          Daily Set
        </SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {s.today.games.map((g) => (
            <DailyGameCard key={g.game} {...g} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="mastery-title">
          <SectionTitle id="mastery-title" action={<Pill>Overall: {s.overallMastery.name}</Pill>}>
            Game mastery
          </SectionTitle>
          <Card className="divide-y divide-border">
            {s.mastery.map((m) => (
              <Link key={m.game} href={`/play/${m.game}?mode=unlimited`} className="flex items-center gap-3 p-3 hover:bg-subtle/60">
                <GameTile game={m.game} className="size-8" />
                <span className="w-28 shrink-0 text-sm font-semibold">{GAMES[m.game].name}</span>
                <span className="flex-1">
                  <Progress value={m.rank.progress} label={`${GAMES[m.game].name} mastery progress`} className="h-1.5" />
                </span>
                <span className="w-28 shrink-0 text-right text-xs font-semibold">{m.rank.label}</span>
              </Link>
            ))}
          </Card>
        </section>

        <section aria-labelledby="recent-title" className="space-y-6">
          <div>
            <SectionTitle id="recent-title">Recent activity</SectionTitle>
            <Card className="divide-y divide-border">
              {s.recent.length === 0 && <p className="p-4 text-sm text-muted">No games yet. Your completions will show up here.</p>}
              {s.recent.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 text-sm">
                  <GameTile game={r.game} className="size-7" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {GAMES[r.game].name} <span className="text-muted">· {r.mode === 'daily' ? 'Daily' : DIFFICULTY_LABELS[r.difficulty]}</span>
                    </span>
                    <span className="num block font-mono text-xs text-muted">
                      {formatDuration(r.durationMs)} · {r.score} pts
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
              <span className="block font-semibold">Achievements</span>
              <span className="block text-xs text-muted">
                {s.achievements.unlocked} of {s.achievements.total} unlocked
              </span>
            </span>
            <Sparkles className="size-4 text-muted" aria-hidden />
          </Link>
        </section>
      </div>
    </div>
  );
}

function StreakCard({ title, icon, view, kind, cards, note }: { title: string; icon: React.ReactNode; view: StreakView; kind: 'normal' | 'true_player'; cards: number; note: string }) {
  const tone = view.status === 'active' ? 'text-success' : view.status === 'at-risk' ? 'text-warning' : view.status === 'broken' ? 'text-danger' : 'text-muted';
  const label = { active: 'Done today', 'at-risk': 'Play today to keep it', broken: 'Broken', none: 'Not started' }[view.status];
  return (
    <Card className="p-4">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-1 flex items-center gap-2">
        <span className={tone} aria-hidden>
          {icon}
        </span>
        <span className="num font-display text-3xl font-bold">{view.current}</span>
        <span className="text-sm text-muted">day{view.current === 1 ? '' : 's'}</span>
      </div>
      <p className={cn('text-xs font-semibold', tone)}>{label}</p>
      <p className="mb-2 text-xs text-muted">
        Best {view.best} · {note}
      </p>
      {view.repairable && <RepairButton kind={kind} restoresTo={view.repairable.restoresTo} missedDays={view.repairable.missedDays} cardsHeld={cards} />}
    </Card>
  );
}

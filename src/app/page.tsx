import Link from 'next/link';
import { ArrowRight, CalendarDays, Crown, Flame, Infinity as InfinityIcon, Medal, Palette, ShieldCheck, Trophy } from 'lucide-react';
import { ACHIEVEMENTS } from '@/config/achievements';
import { GAMES } from '@/config/games';
import { RANK_NAMES } from '@/config/ranks';
import { THEMES } from '@/config/themes';
import { GAME_IDS } from '@/games/types';
import { GameTile } from '@/components/game-card';
import { ButtonLink, Card, Eyebrow } from '@/components/ui';

export default function Landing() {
  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 pt-4 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <Eyebrow className="mb-4">Play. Progress. Master.</Eyebrow>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            GameHub: Your daily brain training, <span className="text-accent">without the daily limit</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Eight original logic and word puzzles. One shared Daily Set for everyone, every UTC day, and Unlimited mode whenever you want more. Earn XP, climb ranks, keep your streaks and master every game.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/daily" size="lg">
              Play today&apos;s Daily Set <ArrowRight className="size-5" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/unlimited" size="lg" variant="secondary">
              <InfinityIcon className="size-5" aria-hidden /> Try Unlimited
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-muted">No sign-up needed to start. Progress saves to a guest profile you can claim any time.</p>
        </div>
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Eyebrow>Today&apos;s Daily Set</Eyebrow>
              <p className="font-display text-xl font-bold">8 puzzles · shared worldwide</p>
            </div>
            <CalendarDays className="size-6 text-accent" aria-hidden />
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {GAME_IDS.map((g) => (
              <li key={g} className="flex items-center gap-2.5 rounded-xl border border-border p-2.5">
                <GameTile game={g} className="size-9" />
                <span className="text-sm font-semibold">{GAMES[g].name}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: Flame, label: 'Normal Streak', note: '1+ daily game' },
              { icon: Crown, label: 'True Player', note: 'all 8 in a day' },
              { icon: ShieldCheck, label: 'Repair cards', note: 'save a streak' },
            ].map(({ icon: Icon, label, note }) => (
              <div key={label} className="rounded-xl bg-subtle p-2">
                <Icon className="mx-auto mb-1 size-5 text-accent" aria-hidden />
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-[11px] text-muted">{note}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section aria-labelledby="games-title">
        <Eyebrow className="mb-2">The eight games</Eyebrow>
        <h2 id="games-title" className="mb-6 font-display text-3xl font-bold tracking-tight">Each with four real difficulties</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GAME_IDS.map((g) => (
            <Link key={g} href={`/play/${g}?mode=unlimited&difficulty=easy`} className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <GameTile game={g} className="mb-3 size-11" />
              <p className="font-display text-lg font-bold">{GAMES[g].name}</p>
              <p className="text-sm text-muted">{GAMES[g].tagline}</p>
              <p className="mt-3 text-xs text-muted">
                Easy → Expert: {GAMES[g].difficultyNotes.easy} → {GAMES[g].difficultyNotes.expert}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="How GameHub works">
        <Card className="p-5">
          <CalendarDays className="mb-3 size-6 text-accent" aria-hidden />
          <h3 className="font-display text-lg font-bold">Daily Set</h3>
          <p className="mt-1 text-sm text-muted">The same eight puzzles for every player, reset at 00:00 UTC. Daily games pay extra XP and drive both streaks.</p>
        </Card>
        <Card className="p-5">
          <InfinityIcon className="mb-3 size-6 text-accent" aria-hidden />
          <h3 className="font-display text-lg font-bold">Unlimited</h3>
          <p className="mt-1 text-sm text-muted">Fresh procedurally generated puzzles at any difficulty, as many as you like. No lives, no energy, no timers.</p>
        </Card>
        <Card className="p-5">
          <Trophy className="mb-3 size-6 text-accent" aria-hidden />
          <h3 className="font-display text-lg font-bold">Progression</h3>
          <p className="mt-1 text-sm text-muted">XP, 30 rank tiers, per-game mastery, {ACHIEVEMENTS.length} achievements (some hidden), Gold Repair Cards and leaderboards.</p>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <Medal className="mb-3 size-6 text-gold" aria-hidden />
          <h2 className="font-display text-2xl font-bold">Ten ranks, three tiers each</h2>
          <p className="mt-1 text-sm text-muted">From Rookie I to Legend III, and your XP keeps counting after that. Every game has its own mastery ladder too.</p>
          <ol className="mt-4 flex flex-wrap gap-1.5">
            {RANK_NAMES.map((r, i) => (
              <li key={r} className="rounded-lg border border-border px-2 py-1 text-xs font-semibold" style={{ opacity: 0.45 + i * 0.06 }}>
                {r}
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-6">
          <Palette className="mb-3 size-6 text-accent" aria-hidden />
          <h2 className="font-display text-2xl font-bold">Eleven themes, all free</h2>
          <p className="mt-1 text-sm text-muted">Every theme restyles the entire app, game boards included. Switch any time in Settings.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <li key={t.id} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs">
                <span className="flex" aria-hidden>
                  {t.swatch.map((c) => (
                    <span key={c} className="-ml-1 size-3 rounded-full border border-black/10 first:ml-0" style={{ background: c }} />
                  ))}
                </span>
                {t.name}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="rounded-3xl bg-fg px-6 py-12 text-center text-bg">
        <h2 className="font-display text-3xl font-bold tracking-tight">Your first Daily Set is waiting.</h2>
        <p className="mx-auto mt-2 max-w-lg opacity-75">Takes about fifteen minutes. Or play Unlimited until you&apos;re a Legend.</p>
        <Link href="/daily" className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 font-semibold text-accent-fg hover:brightness-110">
          Start playing <ArrowRight className="size-5" aria-hidden />
        </Link>
      </section>
    </div>
  );
}

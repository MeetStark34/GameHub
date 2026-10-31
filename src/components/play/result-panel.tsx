'use client';

import { ArrowRight, Crown, Flame, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { GAMES } from '@/config/games';
import type { CompletionResult } from '@/lib/contracts';
import { formatDuration } from '@/lib/time';
import { AchievementIcon } from '@/components/achievement-icon';
import { Button, ButtonLink, Card, Eyebrow, Progress } from '@/components/ui';

export function ResultPanel({ result, onPlayAgain }: { result: CompletionResult; onPlayAgain?: () => void }) {
  const meta = GAMES[result.game];
  return (
    <Card className="animate-toast-in overflow-hidden" aria-labelledby="result-title">
      <div className="border-b border-border bg-subtle/60 p-5 text-center">
        <Eyebrow className="mb-1">{result.perfect ? 'Perfect run' : 'Solved'}</Eyebrow>
        <h2 id="result-title" className="font-display text-3xl font-bold tracking-tight">
          {result.perfect && <Sparkles className="mr-1 inline size-6 text-gold" aria-hidden />}
          {meta.name} complete
        </h2>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Time" value={formatDuration(result.durationMs)} />
          <Stat label="Score" value={result.score.toLocaleString('en-US')} />
          <Stat label="XP" value={`+${result.xpGained.toLocaleString('en-US')}`} gold />
        </dl>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <section aria-label="XP breakdown">
          <Eyebrow className="mb-2">XP earned</Eyebrow>
          <ul className="space-y-1 text-sm">
            {result.breakdown.map((b) => (
              <li key={b.label} className="flex justify-between">
                <span className="text-muted">{b.label}</span>
                <span className="num font-mono font-semibold">{b.amount > 0 ? '+' : ''}{b.amount}</span>
              </li>
            ))}
            {result.xpGained > result.breakdown.reduce((s, b) => s + b.amount, 0) && (
              <li className="flex justify-between">
                <span className="text-muted">Bonuses &amp; rewards</span>
                <span className="num font-mono font-semibold">+{result.xpGained - result.breakdown.reduce((s, b) => s + b.amount, 0)}</span>
              </li>
            )}
          </ul>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-semibold">{result.rank.after}</span>
              <span className="text-muted">{result.rank.nextLabel ? `Next: ${result.rank.nextLabel}` : 'Top tier'}</span>
            </div>
            <Progress value={result.rank.progress} label="Progress to next rank" />
            {result.rank.levelUp && <p className="mt-2 text-sm font-semibold text-accent">Level up! {result.rank.before} → {result.rank.after}</p>}
          </div>
        </section>

        <section aria-label="Progress" className="space-y-3 text-sm">
          <Eyebrow className="mb-2">Progress</Eyebrow>
          <Row icon={<Trophy className="size-4" />} label={`${meta.name} mastery`} value={result.mastery.after} highlight={result.mastery.rankUp} />
          {result.mode === 'daily' && (
            <>
              <Row icon={<Flame className="size-4" />} label="Normal Streak" value={`${result.streaks.normal} day${result.streaks.normal === 1 ? '' : 's'}`} highlight={result.streaks.normalAdvanced} />
              <Row icon={<Crown className="size-4" />} label="True Player Streak" value={`${result.streaks.truePlayer} day${result.streaks.truePlayer === 1 ? '' : 's'}`} highlight={result.streaks.truePlayerAdvanced} />
              {result.daily && (
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>Daily Set</span>
                    <span className="num font-mono">
                      {result.daily.completed}/{result.daily.total}
                    </span>
                  </div>
                  <Progress value={result.daily.completed / result.daily.total} label="Daily Set progress" tone="success" />
                </div>
              )}
            </>
          )}
          {result.mode === 'unlimited' && <p className="text-xs text-muted">Unlimited games build XP and mastery. Streaks only count Daily Set games.</p>}
        </section>
      </div>

      {result.achievements.length > 0 && (
        <div className="border-t border-border p-5">
          <Eyebrow className="mb-2">Achievements unlocked</Eyebrow>
          <ul className="grid gap-2 sm:grid-cols-2">
            {result.achievements.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 p-2.5">
                <AchievementIcon name={a.icon} className="size-5 shrink-0 text-gold" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{a.name}</span>
                  <span className="block truncate text-xs text-muted">{a.description}</span>
                </span>
                <span className="num font-mono text-xs font-bold text-gold">+{a.xp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2 border-t border-border p-4">
        {result.mode === 'daily' ? (
          <ButtonLink href="/daily">
            {result.daily?.setComplete ? 'View Daily Set' : 'Next Daily game'} <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        ) : (
          onPlayAgain && (
            <Button onClick={onPlayAgain}>
              <RotateCcw className="size-4" aria-hidden /> Play another
            </Button>
          )
        )}
        <ButtonLink href="/dashboard" variant="secondary">
          Dashboard
        </ButtonLink>
      </div>
    </Card>
  );
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="rounded-xl bg-card p-2">
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className={`num font-mono text-xl font-bold ${gold ? 'text-gold' : ''}`}>{value}</dd>
    </div>
  );
}

function Row({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-success' : ''}`}>
        {value}
        {highlight && <span className="sr-only"> (increased)</span>}
        {highlight && <span aria-hidden> ↑</span>}
      </span>
    </div>
  );
}

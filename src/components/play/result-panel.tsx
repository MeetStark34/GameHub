'use client';

import { ArrowRight, Crown, Flame, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { GAMES } from '@/config/games';
import type { CompletionResult } from '@/lib/contracts';
import { formatDuration } from '@/lib/time';
import { useI18n } from '@/i18n/client';
import { achievementText } from '@/i18n/helpers';
import { AchievementIcon } from '@/components/achievement-icon';
import { Button, ButtonLink, Card, Eyebrow, Progress } from '@/components/ui';

/** Server breakdown labels are English; map them to dictionary keys for display. */
const BREAKDOWN_KEYS: Record<string, string> = {
  'Daily game': 'result.breakdown.daily',
  'Unlimited game': 'result.breakdown.unlimited',
  Performance: 'result.breakdown.performance',
  'Perfect run': 'result.breakdown.perfect',
  'Same-day taper': 'result.breakdown.taper',
  'First Daily game today': 'result.breakdown.firstDaily',
  'Daily Set complete': 'result.breakdown.setComplete',
};

export function ResultPanel({ result, onPlayAgain }: { result: CompletionResult; onPlayAgain?: () => void }) {
  const tr = useI18n();
  const { t, num } = tr;
  const meta = GAMES[result.game];
  const listed = result.breakdown.reduce((s, b) => s + b.amount, 0);
  return (
    <Card className="animate-toast-in overflow-hidden" aria-labelledby="result-title">
      <div className="border-b border-border bg-subtle/60 p-5 text-center">
        <Eyebrow className="mb-1">{result.perfect ? t('result.perfect') : t('result.solved')}</Eyebrow>
        <h2 id="result-title" className="font-display text-3xl font-bold tracking-tight">
          {result.perfect && <Sparkles className="mr-1 inline size-6 text-gold" aria-hidden />}
          {t('result.complete', { game: meta.name })}
        </h2>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          <Stat label={t('result.time')} value={formatDuration(result.durationMs)} />
          <Stat label={t('result.score')} value={num(result.score)} />
          <Stat label={t('result.xp')} value={`+${num(result.xpGained)}`} gold />
        </dl>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <section aria-label={t('result.xpEarned')}>
          <Eyebrow className="mb-2">{t('result.xpEarned')}</Eyebrow>
          <ul className="space-y-1 text-sm">
            {result.xpFrozen && <li className="text-muted">{t('result.xpFrozen')}</li>}
            {result.breakdown.map((b) => (
              <li key={b.label} className="flex justify-between">
                <span className="text-muted">{BREAKDOWN_KEYS[b.label] ? t(BREAKDOWN_KEYS[b.label]) : b.label}</span>
                <span className="num font-mono font-semibold">
                  {b.amount > 0 ? '+' : ''}
                  {b.amount}
                </span>
              </li>
            ))}
            {result.xpGained > listed && (
              <li className="flex justify-between">
                <span className="text-muted">{t('result.bonuses')}</span>
                <span className="num font-mono font-semibold">+{result.xpGained - listed}</span>
              </li>
            )}
          </ul>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-semibold">{result.rank.after}</span>
              <span className="text-muted">{result.rank.nextLabel ? t('result.next', { rank: result.rank.nextLabel }) : t('result.topTier')}</span>
            </div>
            <Progress value={result.rank.progress} label={t('result.progressLabel')} />
            {result.rank.levelUp && <p className="mt-2 text-sm font-semibold text-accent">{t('result.levelUp', { from: result.rank.before, to: result.rank.after })}</p>}
          </div>
        </section>

        <section aria-label={t('result.progress')} className="space-y-3 text-sm">
          <Eyebrow className="mb-2">{t('result.progress')}</Eyebrow>
          <Row icon={<Trophy className="size-4" />} label={t('result.mastery', { game: meta.name })} value={result.mastery.after} highlight={result.mastery.rankUp} />
          {result.mode === 'daily' && (
            <>
              <Row icon={<Flame className="size-4" />} label={t('streak.normal')} value={t(result.streaks.normal === 1 ? 'common.day' : 'common.days', { count: result.streaks.normal })} highlight={result.streaks.normalAdvanced} />
              <Row icon={<Crown className="size-4" />} label={t('streak.truePlayer')} value={t(result.streaks.truePlayer === 1 ? 'common.day' : 'common.days', { count: result.streaks.truePlayer })} highlight={result.streaks.truePlayerAdvanced} />
              {result.daily && (
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{t('nav.daily')}</span>
                    <span className="num font-mono">
                      {result.daily.completed}/{result.daily.total}
                    </span>
                  </div>
                  <Progress value={result.daily.completed / result.daily.total} label={t('daily.progress')} tone="success" />
                </div>
              )}
            </>
          )}
          {result.mode === 'unlimited' && <p className="text-xs text-muted">{t('result.unlimitedNote')}</p>}
        </section>
      </div>

      {result.achievements.length > 0 && (
        <div className="border-t border-border p-5">
          <Eyebrow className="mb-2">{t('result.achievements')}</Eyebrow>
          <ul className="grid gap-2 sm:grid-cols-2">
            {result.achievements.map((a) => {
              const text = achievementText(tr, a.id);
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 p-2.5">
                  <AchievementIcon name={a.icon} className="size-5 shrink-0 text-gold" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{text.name}</span>
                    <span className="block truncate text-xs text-muted">{text.description}</span>
                  </span>
                  <span className="num font-mono text-xs font-bold text-gold">+{a.xp}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2 border-t border-border p-4">
        {result.mode === 'daily' ? (
          <ButtonLink href="/daily" prefetch>
            {result.daily?.setComplete ? t('result.viewSet') : t('result.nextDaily')} <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        ) : (
          onPlayAgain && (
            <Button onClick={onPlayAgain}>
              <RotateCcw className="size-4" aria-hidden /> {t('result.playAnother')}
            </Button>
          )
        )}
        <ButtonLink href="/dashboard" prefetch variant="secondary">
          {t('nav.dashboard')}
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
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-success' : ''}`}>
        {value}
        {highlight && <span className="sr-only"> {t('result.increased')}</span>}
        {highlight && <span aria-hidden> ↑</span>}
      </span>
    </div>
  );
}

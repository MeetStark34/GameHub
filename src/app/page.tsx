import Link from 'next/link';
import { ArrowRight, CalendarDays, Crown, Flame, Infinity as InfinityIcon, Medal, Palette, ShieldCheck, Trophy } from 'lucide-react';
import { ACHIEVEMENTS } from '@/config/achievements';
import { GAMES } from '@/config/games';
import { RANK_NAMES } from '@/config/ranks';
import { THEMES } from '@/config/themes';
import { GAME_IDS } from '@/games/types';
import { getTranslator } from '@/i18n/server';
import { GameTile } from '@/components/game-card';
import { ButtonLink, Card, Eyebrow } from '@/components/ui';

export default async function Landing() {
  const { t } = await getTranslator();
  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 pt-4 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <Eyebrow className="mb-4">{t('brand.tagline')}</Eyebrow>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            {t('brand.headlineA')} <span className="text-accent">{t('brand.headlineB')}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{t('landing.lead')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/daily" size="lg">
              {t('landing.playDaily')} <ArrowRight className="size-5" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/unlimited" size="lg" variant="secondary">
              <InfinityIcon className="size-5" aria-hidden /> {t('landing.tryUnlimited')}
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-muted">{t('landing.noSignup')}</p>
        </div>
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Eyebrow>{t('landing.todaysSet')}</Eyebrow>
              <p className="font-display text-xl font-bold">{t('landing.sharedWorldwide')}</p>
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
              { icon: Flame, label: t('landing.normalStreak'), note: t('landing.normalNote') },
              { icon: Crown, label: t('landing.truePlayer'), note: t('landing.trueNote') },
              { icon: ShieldCheck, label: t('landing.repairCards'), note: t('landing.repairNote') },
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
        <Eyebrow className="mb-2">{t('landing.eightGames')}</Eyebrow>
        <h2 id="games-title" className="mb-6 font-display text-3xl font-bold tracking-tight">
          {t('landing.fourDifficulties')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GAME_IDS.map((g) => (
            <Link key={g} href={`/play/${g}?mode=unlimited&difficulty=easy`} prefetch={false} className="group rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <GameTile game={g} className="mb-3 size-11" />
              <p className="font-display text-lg font-bold">{GAMES[g].name}</p>
              <p className="text-sm text-muted">{t(`games.${g}.tagline`)}</p>
              <p className="mt-3 text-xs text-muted">{t('landing.easyToExpert', { easy: t(`games.${g}.difficulty.easy`), expert: t(`games.${g}.difficulty.expert`) })}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label={t('landing.howItWorks')}>
        {[
          { icon: CalendarDays, title: t('landing.dailyTitle'), body: t('landing.dailyBody') },
          { icon: InfinityIcon, title: t('landing.unlimitedTitle'), body: t('landing.unlimitedBody') },
          { icon: Trophy, title: t('landing.progressionTitle'), body: t('landing.progressionBody', { count: ACHIEVEMENTS.length }) },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-5">
            <Icon className="mb-3 size-6 text-accent" aria-hidden />
            <h3 className="font-display text-lg font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <Medal className="mb-3 size-6 text-gold" aria-hidden />
          <h2 className="font-display text-2xl font-bold">{t('landing.ranksTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('landing.ranksBody')}</p>
          <ol className="mt-4 flex flex-wrap gap-1.5">
            {RANK_NAMES.map((r, i) => (
              <li key={r} className="rounded-lg border border-border px-2 py-1 text-xs font-semibold" style={{ opacity: 0.45 + i * 0.06 }}>
                {r}
              </li>
            ))}
          </ol>
          <Link href="/ranks" className="mt-4 inline-block text-sm font-semibold text-accent">
            {t('nav.rankRoadmap')} →
          </Link>
        </Card>
        <Card className="p-6">
          <Palette className="mb-3 size-6 text-accent" aria-hidden />
          <h2 className="font-display text-2xl font-bold">{t('landing.themesTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('landing.themesBody')}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {THEMES.map((th) => (
              <li key={th.id} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs">
                <span className="flex" aria-hidden>
                  {th.swatch.map((c) => (
                    <span key={c} className="-ml-1 size-3 rounded-full border border-black/10 first:ml-0" style={{ background: c }} />
                  ))}
                </span>
                {t(`themes.${th.id}.name`)}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="rounded-3xl bg-fg px-6 py-12 text-center text-bg">
        <h2 className="font-display text-3xl font-bold tracking-tight">{t('landing.ctaTitle')}</h2>
        <p className="mx-auto mt-2 max-w-lg opacity-75">{t('landing.ctaBody')}</p>
        <Link href="/daily" className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 font-semibold text-accent-fg hover:brightness-110">
          {t('landing.ctaButton')} <ArrowRight className="size-5" aria-hidden />
        </Link>
      </section>
    </div>
  );
}

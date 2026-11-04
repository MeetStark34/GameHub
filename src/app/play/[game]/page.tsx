import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GAMES } from '@/config/games';
import { isGameId } from '@/games/types';
import { playTarget } from '@/lib/play-url';
import { getTranslator } from '@/i18n/server';
import { PlayClient } from '@/components/play/play-client';
import { currentUser } from '@/server/auth';

type Props = { params: Promise<{ game: string }>; searchParams: Promise<{ mode?: string; difficulty?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game } = await params;
  if (!isGameId(game)) return {};
  const { t } = await getTranslator();
  return { title: GAMES[game].name, description: t(`games.${game}.tagline`), robots: { index: false } };
}

export default async function PlayPage({ params, searchParams }: Props) {
  const sp = await searchParams;
  // Same parsing as the early session start on click (PlayIntent).
  const target = playTarget((await params).game, sp.mode, sp.difficulty);
  if (!target) notFound();
  const { game, mode, difficulty } = target;
  // Already loaded by the root layout (memoised per request): no extra query.
  const hasSession = !!(await currentUser());
  return <PlayClient key={`${game}-${mode}-${difficulty}`} game={game} mode={mode} difficulty={difficulty} hasSession={hasSession} />;
}

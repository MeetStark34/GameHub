import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GAMES } from '@/config/games';
import { isDifficulty, isGameId } from '@/games/types';
import { getTranslator } from '@/i18n/server';
import { PlayClient } from '@/components/play/play-client';

type Props = { params: Promise<{ game: string }>; searchParams: Promise<{ mode?: string; difficulty?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game } = await params;
  if (!isGameId(game)) return {};
  const { t } = await getTranslator();
  return { title: GAMES[game].name, description: t(`games.${game}.tagline`), robots: { index: false } };
}

export default async function PlayPage({ params, searchParams }: Props) {
  const { game } = await params;
  const sp = await searchParams;
  if (!isGameId(game)) notFound();
  const mode = sp.mode === 'unlimited' ? 'unlimited' : 'daily';
  const difficulty = isDifficulty(sp.difficulty) ? sp.difficulty : 'normal';
  return <PlayClient key={`${game}-${mode}-${difficulty}`} game={game} mode={mode} difficulty={difficulty} />;
}

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { cookies } from 'next/headers';
import { isThemeId, type ThemeId } from '@/config/themes';
import { getDb, maybeOne } from '@/lib/db';
import { toUtcDate } from '@/lib/time';
import { Providers } from '@/components/providers';
import { Header, type HeaderUser } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Footer } from '@/components/layout/footer';
import { ResetTicker } from '@/components/layout/reset-ticker';
import { getPreferences } from '@/server/account';
import { currentUser, isAdmin } from '@/server/auth';
import { dailyDifficultyFor } from '@/server/play';
import { siteUrl } from '@/server/request';
import { rankFromXp } from '@/lib/progression/ranks';
import { PLAYER_RANKS } from '@/config/ranks';
import './globals.css';

const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['500', '600', '700'] });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap', weight: ['500', '700'] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'GameHub: Your daily brain training, without the daily limit', template: '%s · GameHub' },
  description:
    'Eight original logic and word puzzles. A shared Daily Set every UTC day, unlimited practice, XP, ranks, streaks, mastery and achievements. Play. Progress. Master.',
  applicationName: 'GameHub',
  openGraph: {
    type: 'website',
    siteName: 'GameHub',
    title: 'GameHub: Your daily brain training, without the daily limit',
    description: 'Play. Progress. Master. Eight puzzles, one Daily Set, unlimited practice.',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f4ef' },
    { media: '(prefers-color-scheme: dark)', color: '#111216' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const user = await currentUser();
  const db = await getDb();
  const prefs = user ? await getPreferences(db, user.id) : null;
  const cookieTheme = jar.get('gh-theme')?.value;
  const theme: ThemeId = isThemeId(prefs?.theme) && prefs?.theme !== 'system' ? prefs.theme : isThemeId(cookieTheme) ? cookieTheme : 'system';
  const sound = prefs ? prefs.sound_enabled : jar.get('gh-sound')?.value !== '0';

  let headerUser: HeaderUser | null = null;
  const now = new Date();
  const today = toUtcDate(now);
  let dailyDone = 0;
  if (user) {
    const row = await maybeOne<{ total_xp: number; unread: number; daily_done: number }>(
      db,
      `select coalesce((select total_xp from user_stats where user_id = $1), 0) total_xp,
         (select count(*)::int from notifications where user_id = $1 and read_at is null) unread,
         coalesce((select daily_completed from daily_activity where user_id = $1 and utc_date = $2), 0) daily_done`,
      [user.id, today],
    );
    dailyDone = row?.daily_done ?? 0;
    const rank = rankFromXp(row?.total_xp ?? 0, PLAYER_RANKS);
    headerUser = {
      handle: user.handle,
      displayName: user.display_name,
      isGuest: user.is_guest,
      isAdmin: !user.is_guest && (await isAdmin(user.id)),
      xp: rank.xp,
      rankLabel: rank.label,
      level: rank.level,
      unread: row?.unread ?? 0,
    };
  }

  return (
    <html lang="en" data-theme={theme} className={`${body.variable} ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-bg font-sans text-fg antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
          Skip to content
        </a>
        <Providers initialTheme={theme} initialSound={sound} signedIn={!!user && !user.is_guest}>
          <ResetTicker serverNow={now.toISOString()} difficulty={dailyDifficultyFor(today)} dailyDone={user ? dailyDone : null} />
          <Header user={headerUser} />
          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pb-12">
            {children}
          </main>
          <Footer />
          <BottomNav signedIn={!!user} />
        </Providers>
      </body>
    </html>
  );
}

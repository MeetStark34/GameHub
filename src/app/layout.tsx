import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { cookies } from 'next/headers';
import { isThemeId, type ThemeId } from '@/config/themes';
import { LOCALES } from '@/i18n/config';
import { I18nProvider } from '@/i18n/client';
import { MESSAGES } from '@/i18n/messages';
import { getLocale, getTranslator } from '@/i18n/server';
import { getDb, maybeOne } from '@/lib/db';
import { Providers } from '@/components/providers';
import { Header, type HeaderUser } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Footer } from '@/components/layout/footer';
import { PlayIntent } from '@/components/play/play-intent';
import { requestPreferences } from '@/server/account';
import { currentUser, isAdmin } from '@/server/auth';
import { siteUrl } from '@/server/request';
import { rankFromXp } from '@/lib/progression/ranks';
import { viewStreak } from '@/lib/progression/streaks';
import { toUtcDate } from '@/lib/time';
import { loadStreaks } from '@/server/progress';
import { PLAYER_RANKS } from '@/config/ranks';
import './globals.css';

// `subsets` only picks which files are preloaded: every @font-face (Cyrillic
// included) is still declared, so Russian text loads its glyphs on demand
// instead of every first visit downloading them.
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['500', '600', '700'] });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap', weight: ['500', '700'] });

const NO_MESSAGES = {};

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getTranslator();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: tr.t('meta.title'), template: '%s · GameHub' },
    description: tr.t('meta.description'),
    applicationName: 'GameHub',
    openGraph: { type: 'website', siteName: 'GameHub', title: tr.t('meta.title'), description: tr.t('meta.description') },
    twitter: { card: 'summary_large_image' },
  };
}

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
  // Only signed-in (or guest) requests need the database here; anonymous pages
  // render without opening a connection.
  const db = user ? await getDb() : null;
  // Everything below depends only on the user, so it is fetched concurrently.
  const [locale, tr, prefs, row, streaks, admin] = await Promise.all([
    getLocale(),
    getTranslator(),
    user ? requestPreferences(user.id) : null,
    user && db
      ? maybeOne<{ total_xp: number; unread: number }>(
          db,
          `select coalesce((select total_xp from user_stats where user_id = $1), 0) total_xp,
             (select count(*)::int from notifications where user_id = $1 and read_at is null) unread`,
          [user.id],
        )
      : null,
    user && db ? loadStreaks(db, user.id) : null,
    user && !user.is_guest ? isAdmin(user.id) : false,
  ]);
  const cookieTheme = jar.get('gh-theme')?.value;
  const theme: ThemeId = isThemeId(prefs?.theme) && prefs?.theme !== 'system' ? prefs.theme : isThemeId(cookieTheme) ? cookieTheme : 'system';
  const sound = prefs ? prefs.sound_enabled : jar.get('gh-sound')?.value !== '0';

  let headerUser: HeaderUser | null = null;
  if (user && streaks) {
    // Same rules as the dashboard: a streak shows 0 once its UTC day has been missed.
    const today = toUtcDate(new Date());
    const streak = (kind: 'normal' | 'true_player') => {
      const v = viewStreak(streaks[kind], today);
      return { current: v.current, best: v.best, status: v.status };
    };
    const rank = rankFromXp(row?.total_xp ?? 0, PLAYER_RANKS);
    headerUser = {
      handle: user.handle,
      displayName: user.display_name,
      isGuest: user.is_guest,
      isAdmin: admin,
      xp: rank.xp,
      rankLabel: rank.label,
      level: rank.level,
      unread: row?.unread ?? 0,
      streaks: { normal: streak('normal'), truePlayer: streak('true_player') },
    };
  }
  const htmlLang = LOCALES.find((l) => l.code === locale)?.htmlLang ?? 'en';

  return (
    <html lang={htmlLang} data-theme={theme} className={`${body.variable} ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-bg font-sans text-fg antialiased">
        {/* English is bundled in the client as the fallback: sending it again added ~30 KB to every English page. */}
        <I18nProvider locale={locale} messages={locale === 'en' ? NO_MESSAGES : MESSAGES[locale]} signedIn={!!user && !user.is_guest}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
            {tr.t('nav.skip')}
          </a>
          <Providers initialTheme={theme} initialSound={sound} signedIn={!!user && !user.is_guest}>
            <Header user={headerUser} />
            <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 xl:pb-12">
              {children}
            </main>
            <Footer />
            <BottomNav signedIn={!!user} />
            <PlayIntent />
          </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}

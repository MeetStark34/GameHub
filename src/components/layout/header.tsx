import Link from 'next/link';
import { Bell, Flame } from 'lucide-react';
import { getTranslator } from '@/i18n/server';
import { Wordmark } from '@/components/brand';
import { buttonClass } from '@/components/ui';
import { LanguageMenu } from './language-menu';
import { NavLinks } from './nav-links';
import { ThemeMenu } from './theme-menu';
import { UserMenu } from './user-menu';

export interface HeaderUser {
  handle: string;
  displayName: string;
  isGuest: boolean;
  isAdmin: boolean;
  xp: number;
  rankLabel: string;
  level: number;
  unread: number;
  streak: number;
}

/** Compact progression controls share one visual language: rank, streak, themes, language. */
const CONTROL = 'flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border border-border bg-card px-2.5 text-xs hover:bg-elevated';

export async function Header({ user }: { user: HeaderUser | null }) {
  const { t, num } = await getTranslator();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href={user ? '/dashboard' : '/'} className="shrink-0 rounded-lg" aria-label={t('nav.homeLink')}>
          <Wordmark />
        </Link>
        <nav aria-label={t('nav.main')} className="hidden flex-1 xl:block">
          <NavLinks />
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          {user && (
            <Link href="/ranks" className={`${CONTROL} hidden sm:flex`} title={t('nav.rankRoadmap')} aria-label={`${t('nav.rankRoadmap')}: ${user.rankLabel}, ${num(user.xp)} XP`}>
              <span className="grid size-6 place-items-center rounded-md bg-accent font-mono text-[11px] font-bold text-accent-fg">{user.level}</span>
              <span className="leading-tight">
                <span className="hidden font-semibold uppercase tracking-wide xl:block">{user.rankLabel}</span>
                <span className="num block font-mono text-[10px] text-muted">{num(user.xp)} XP</span>
              </span>
            </Link>
          )}
          {user && (
            <Link href="/dashboard" className={`${CONTROL} hidden md:flex`} title={t('streak.normal')}>
              <Flame className="size-4 text-warning" aria-hidden />
              <span className="num font-mono font-bold">{user.streak}</span>
              <span className="sr-only">{t('streak.normal')}</span>
            </Link>
          )}
          <ThemeMenu />
          <LanguageMenu />
          {user && (
            <Link
              href="/notifications"
              className="relative rounded-xl p-2 text-muted hover:bg-subtle hover:text-fg"
              aria-label={user.unread ? t('nav.notificationsUnread', { count: user.unread }) : t('nav.notifications')}
            >
              <Bell className="size-5" />
              {user.unread > 0 && (
                <span className="num absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 font-mono text-[10px] font-bold leading-4 text-white">
                  {user.unread > 9 ? '9+' : user.unread}
                </span>
              )}
            </Link>
          )}
          {user && !user.isGuest ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Link href="/login" className={buttonClass('ghost', 'sm')}>
                {t('nav.signIn')}
              </Link>
              <span className="hidden sm:block">
                <Link href="/signup" className={buttonClass('primary', 'sm')}>
                  {user?.isGuest ? t('nav.saveProgress') : t('nav.createAccount')}
                </Link>
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

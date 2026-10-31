import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { buttonClass } from '@/components/ui';
import { NavLinks } from './nav-links';
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
}

export function Header({ user }: { user: HeaderUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href={user ? '/dashboard' : '/'} className="shrink-0 rounded-lg" aria-label="GameHub home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden flex-1 md:block">
          <NavLinks />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user && (
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1 text-xs sm:flex"
              title={`${user.xp.toLocaleString('en-US')} XP`}
            >
              <span className="grid size-6 place-items-center rounded-md bg-accent font-mono text-[11px] font-bold text-accent-fg">{user.level}</span>
              <span className="leading-tight">
                <span className="block font-semibold">{user.rankLabel}</span>
                <span className="num block font-mono text-[10px] text-muted">{user.xp.toLocaleString('en-US')} XP</span>
              </span>
            </Link>
          )}
          {user && (
            <Link href="/notifications" className="relative rounded-xl p-2 text-muted hover:bg-subtle hover:text-fg" aria-label={`Notifications${user.unread ? `, ${user.unread} unread` : ''}`}>
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
                Sign in
              </Link>
              <Link href="/signup" className={buttonClass('primary', 'sm', 'hidden sm:inline-flex')}>
                {user?.isGuest ? 'Save progress' : 'Create account'}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

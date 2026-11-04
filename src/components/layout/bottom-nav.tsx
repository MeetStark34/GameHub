'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, Infinity as InfinityIcon, Settings, Trophy } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { cn } from '@/components/ui';
import { LinkPending } from './link-pending';

/** Thumb-reachable primary navigation for phones and tablets (the top nav shows from xl). */
export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const { t } = useI18n();
  if (path.startsWith('/play/')) return null;
  const items = [
    { href: signedIn ? '/dashboard' : '/', label: t('nav.home'), icon: Home },
    { href: '/daily', label: t('nav.dailyShort'), icon: CalendarDays },
    { href: '/unlimited', label: t('nav.unlimited'), icon: InfinityIcon },
    { href: '/leaderboards', label: t('nav.leaderboardsShort'), icon: Trophy },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ];
  return (
    <nav aria-label={t('nav.primary')} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur xl:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== '/' && path.startsWith(`${href}/`));
          return (
            <li key={href}>
              <Link href={href} prefetch aria-current={active ? 'page' : undefined} className={cn('relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', active ? 'text-accent' : 'text-muted')}>
                <Icon className="size-5" aria-hidden />
                <span className="max-w-full truncate px-0.5">{label}</span>
                <LinkPending className="inset-x-5 top-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

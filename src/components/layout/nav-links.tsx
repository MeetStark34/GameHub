'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/i18n/client';
import { cn } from '@/components/ui';
import { LinkPending } from './link-pending';

export const NAV = [
  { href: '/dashboard', key: 'nav.dashboard' },
  { href: '/daily', key: 'nav.daily' },
  { href: '/unlimited', key: 'nav.unlimited' },
  { href: '/leaderboards', key: 'nav.leaderboards' },
  { href: '/achievements', key: 'nav.achievements' },
] as const;

export function NavLinks() {
  const path = usePathname();
  const { t } = useI18n();
  return (
    <ul className="flex items-center gap-1">
      {NAV.map((n) => {
        const active = path === n.href || path.startsWith(`${n.href}/`);
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              prefetch
              aria-current={active ? 'page' : undefined}
              className={cn('relative whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium transition', active ? 'bg-subtle text-fg' : 'text-muted hover:text-fg')}
            >
              {t(n.key)}
              <LinkPending className="inset-x-2.5 bottom-0" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

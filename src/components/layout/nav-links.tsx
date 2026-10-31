'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/ui';

export const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/daily', label: 'Daily Set' },
  { href: '/unlimited', label: 'Unlimited' },
  { href: '/leaderboards', label: 'Leaderboards' },
  { href: '/achievements', label: 'Achievements' },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <ul className="flex items-center gap-1">
      {NAV.map((n) => {
        const active = path === n.href || path.startsWith(`${n.href}/`);
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={active ? 'page' : undefined}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition', active ? 'bg-subtle text-fg' : 'text-muted hover:text-fg')}
            >
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

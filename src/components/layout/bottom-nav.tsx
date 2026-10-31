'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, Infinity as InfinityIcon, Settings, Trophy } from 'lucide-react';
import { cn } from '@/components/ui';

/** Thumb-reachable primary navigation for phones. */
export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  if (path.startsWith('/play/')) return null;
  const items = [
    { href: signedIn ? '/dashboard' : '/', label: 'Home', icon: Home },
    { href: '/daily', label: 'Daily', icon: CalendarDays },
    { href: '/unlimited', label: 'Unlimited', icon: InfinityIcon },
    { href: '/leaderboards', label: 'Ranks', icon: Trophy },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== '/' && path.startsWith(`${href}/`));
          return (
            <li key={label}>
              <Link href={href} aria-current={active ? 'page' : undefined} className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', active ? 'text-accent' : 'text-muted')}>
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Settings, Shield, Trophy, User } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import type { HeaderUser } from './header';

export function UserMenu({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    router.push('/');
    router.refresh();
  }

  const item = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-subtle';
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-xl p-1 hover:bg-subtle sm:pr-2"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-elevated font-display text-sm font-bold uppercase">{user.displayName.slice(0, 1)}</span>
        <ChevronDown className="hidden size-4 text-muted sm:block" aria-hidden />
        <span className="sr-only">{t('nav.accountMenu')}</span>
      </button>
      {open && (
        <div role="menu" className="animate-toast-in absolute right-0 top-11 z-50 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-black/15">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.displayName}</p>
            <p className="truncate text-xs text-muted">@{user.handle}</p>
          </div>
          <Link role="menuitem" href="/ranks" className={item} onClick={() => setOpen(false)}>
            <Trophy className="size-4" aria-hidden /> {t('nav.rankRoadmap')}
          </Link>
          <Link role="menuitem" href={`/u/${user.handle}`} className={item} onClick={() => setOpen(false)}>
            <User className="size-4" aria-hidden /> {t('nav.profile')}
          </Link>
          <Link role="menuitem" href="/settings" className={item} onClick={() => setOpen(false)}>
            <Settings className="size-4" aria-hidden /> {t('nav.settings')}
          </Link>
          {user.isAdmin && (
            <Link role="menuitem" href="/admin" className={item} onClick={() => setOpen(false)}>
              <Shield className="size-4" aria-hidden /> {t('nav.admin')}
            </Link>
          )}
          <button role="menuitem" onClick={signOut} className={`${item} text-danger`}>
            <LogOut className="size-4" aria-hidden /> {t('nav.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

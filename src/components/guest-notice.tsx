'use client';

import { TriangleAlert } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { ButtonLink, cn } from '@/components/ui';

/** "2026-11-04 20:15 UTC": the app talks about time in UTC everywhere (Daily Set reset, D-042). */
export function formatUtcMinute(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}

/**
 * Warning shown to guests (and to visitors about to become one) that guest
 * accounts are deleted 12 hours after creation. Never rendered for members:
 * every caller checks is_guest / signed-out state first.
 */
export function GuestNotice({ expiresAt, showCta = true, className }: { expiresAt?: string | null; showCta?: boolean; className?: string }) {
  const { t } = useI18n();
  return (
    <div
      role="note"
      aria-label={t('guest.title')}
      className={cn('flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm sm:flex-row sm:items-center', className)}
    >
      <TriangleAlert className="hidden size-5 shrink-0 text-warning sm:block" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold">
          <TriangleAlert className="size-4 shrink-0 text-warning sm:hidden" aria-hidden />
          {t('guest.title')}
        </p>
        <p className="mt-0.5 text-muted">{t('guest.warning')}</p>
        {expiresAt && <p className="num mt-1 font-medium">{t('guest.expiresAt', { time: formatUtcMinute(expiresAt) })}</p>}
      </div>
      {showCta && (
        <ButtonLink href="/signup" size="sm" className="self-start sm:self-center">
          {t('nav.createAccount')}
        </ButtonLink>
      )}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { useToasts } from '@/components/providers';
import { Button } from '@/components/ui';

/** Spends a Gold Repair Card on the chosen streak (never automatic). Two-step confirm. */
export function RepairButton({ kind, restoresTo, missedDays, cardsHeld }: { kind: 'normal' | 'true_player'; restoresTo: number; missedDays: number; cardsHeld: number }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToasts();
  const { t, msg } = useI18n();
  const router = useRouter();

  if (cardsHeld < 1) return <p className="text-xs text-muted">{t('streak.noCards', { count: restoresTo })}</p>;

  async function repair() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/streaks/repair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, requestId: crypto.randomUUID() }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.code ? msg(json.code) : t('streak.repairFailed'));
    push(json.events ?? []);
    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      {!confirming ? (
        <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
          <ShieldCheck className="size-4 text-gold" aria-hidden /> {t('streak.repairTo', { count: restoresTo })}
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs">{t('streak.repairConfirm', { cards: cardsHeld, missed: missedDays })}</span>
          <Button size="sm" onClick={repair} disabled={busy}>
            {t('streak.useCard')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

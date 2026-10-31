'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useToasts } from '@/components/providers';
import { Button } from '@/components/ui';

/** Spends a Gold Repair Card on the chosen streak (never automatic). Two-step confirm. */
export function RepairButton({ kind, restoresTo, missedDays, cardsHeld }: { kind: 'normal' | 'true_player'; restoresTo: number; missedDays: number; cardsHeld: number }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToasts();
  const router = useRouter();

  if (cardsHeld < 1)
    return <p className="text-xs text-muted">Broken streak of {restoresTo} days is repairable for a while. Earn a Gold Repair Card to fix it.</p>;

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
    if (!res.ok) return setError(json.error ?? 'Repair failed.');
    push(json.events ?? []);
    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      {!confirming ? (
        <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
          <ShieldCheck className="size-4 text-gold" aria-hidden /> Repair to {restoresTo} days
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs">
            Use 1 of {cardsHeld} cards to bridge {missedDays} missed day{missedDays === 1 ? '' : 's'}?
          </span>
          <Button size="sm" onClick={repair} disabled={busy}>
            Use card
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

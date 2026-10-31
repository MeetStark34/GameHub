'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GAMES } from '@/config/games';
import { DIFFICULTIES, GAME_IDS } from '@/games/types';
import { Button, Card } from '@/components/ui';

async function run(body: Record<string, unknown>) {
  const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return res.ok ? { ok: true as const, result: json.result } : { ok: false as const, error: json.error ?? 'Failed' };
}

const BADGES = ['developer', 'moderator', 'tester', 'founder', 'contributor'];

export function AdminUserTools({ userId, roles, badges, excluded, achievements }: { userId: string; roles: string[]; badges: string[]; excluded: boolean; achievements: { id: string; name: string }[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [ach, setAch] = useState(achievements[0]?.id ?? '');
  const [pending, setPending] = useState<string | null>(null);

  async function act(label: string, body: Record<string, unknown>, confirm = false) {
    if (confirm && pending !== label) {
      setPending(label);
      setMsg(`Click "${label}" again to confirm.`);
      return;
    }
    setPending(null);
    const r = await run({ ...body, userId });
    setMsg(r.ok ? `${label}: done${r.result && typeof r.result === 'object' && 'completed' in r.result ? ` (${(r.result as { completed: number }).completed} games)` : ''}` : `${label}: ${r.error}`);
    router.refresh();
  }

  const b = 'h-8 rounded-lg border border-border bg-bg px-2.5 text-xs font-medium hover:bg-subtle';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <button className={b} onClick={() => act('+1000 XP', { action: 'grant-xp', amount: 1000 })}>+1000 XP</button>
        <button className={b} onClick={() => act('Complete Daily Set', { action: 'complete-daily-set' })}>Complete Daily Set</button>
        <button className={b} onClick={() => act('Break Normal streak', { action: 'break-streak', kind: 'normal' }, true)}>Break Normal</button>
        <button className={b} onClick={() => act('Break True Player streak', { action: 'break-streak', kind: 'true_player' }, true)}>Break True Player</button>
        <button className={b} onClick={() => act('Repair Normal', { action: 'repair-streak', kind: 'normal' })}>Repair Normal</button>
        <button className={b} onClick={() => act('Repair True Player', { action: 'repair-streak', kind: 'true_player' })}>Repair True Player</button>
        <button className={b} onClick={() => act('Grant card', { action: 'grant-card' })}>+1 Repair Card</button>
        <button className={b} onClick={() => act('Reset Daily State', { action: 'reset-daily-state' }, true)}>Reset Daily State</button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <select value={ach} onChange={(e) => setAch(e.target.value)} className="h-8 rounded-lg border border-border bg-bg px-2 text-xs" aria-label="Achievement to unlock">
          {achievements.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <button className={b} onClick={() => act('Unlock achievement', { action: 'unlock-achievement', achievementId: ach })}>Unlock</button>
        <span className="mx-1 h-5 w-px bg-border" />
        {BADGES.map((badge) => (
          <button key={badge} className={b} aria-pressed={badges.includes(badge)} onClick={() => act(`Badge ${badge}`, { action: 'set-badge', badge, on: !badges.includes(badge) })}>
            {badges.includes(badge) ? '✓ ' : ''}
            {badge}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <button className={b} aria-pressed={excluded} onClick={() => act(excluded ? 'Include in leaderboards' : 'Exclude from leaderboards', { action: 'set-leaderboard-excluded', on: !excluded })}>
          {excluded ? '✓ excluded from leaderboards' : 'Exclude from leaderboards'}
        </button>
        <button className={`${b} text-danger`} onClick={() => act(roles.includes('admin') ? 'Revoke admin' : 'Grant admin', { action: 'set-role', role: 'admin', on: !roles.includes('admin') }, true)}>
          {roles.includes('admin') ? 'Revoke admin' : 'Grant admin'}
        </button>
      </div>
      {msg && (
        <p role="status" className="text-xs text-muted">
          {msg}
        </p>
      )}
    </div>
  );
}

export function PuzzleGenerator() {
  const [game, setGame] = useState<(typeof GAME_IDS)[number]>('queens');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('normal');
  const [seed, setSeed] = useState('');
  const [out, setOut] = useState<string | null>(null);
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap gap-2">
        <select value={game} onChange={(e) => setGame(e.target.value as typeof game)} className="h-9 rounded-lg border border-border bg-bg px-2 text-sm" aria-label="Game">
          {GAME_IDS.map((g) => (
            <option key={g} value={g}>
              {GAMES[g].name}
            </option>
          ))}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className="h-9 rounded-lg border border-border bg-bg px-2 text-sm" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Seed (optional, e.g. daily:2026-11-01:queens)" className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 text-sm" aria-label="Seed" />
        <Button
          size="sm"
          onClick={async () => {
            const r = await run({ action: 'generate-puzzle', game, difficulty, seed: seed || undefined });
            setOut(r.ok ? JSON.stringify(r.result, null, 1) : r.error);
          }}
        >
          Generate
        </Button>
      </div>
      {out && <pre className="max-h-80 overflow-auto rounded-lg bg-subtle p-3 font-mono text-[11px]">{out}</pre>}
    </Card>
  );
}

export function DeveloperShowcase({ handle }: { handle: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  return (
    <Card className="space-y-2 p-4 text-sm">
      <p>
        Puts <b>@{handle}</b> (configured in <code>src/config/site.ts</code>) into the maximum-progression showcase state: Developer badge, Legend-level XP via the
        ledger, high streaks and mastery, all achievements, and excluded from public leaderboards. Only that account can receive it; everyone else&apos;s
        progression is untouched.
      </p>
      <Button
        size="sm"
        variant={confirm ? 'danger' : 'secondary'}
        onClick={async () => {
          if (!confirm) return setConfirm(true);
          setConfirm(false);
          const r = await run({ action: 'apply-developer-showcase' });
          setMsg(r.ok ? `Applied. @${handle} now has ${(r.result as { totalXp: number }).totalXp.toLocaleString('en-US')} XP.` : r.error);
          router.refresh();
        }}
      >
        {confirm ? 'Click again to apply' : 'Apply developer showcase'}
      </Button>
      {msg && (
        <p role="status" className="text-xs text-muted">
          {msg}
        </p>
      )}
    </Card>
  );
}

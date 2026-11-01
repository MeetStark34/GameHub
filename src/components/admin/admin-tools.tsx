'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { GAMES } from '@/config/games';
import { DIFFICULTIES, GAME_IDS } from '@/games/types';
import { Button, Card } from '@/components/ui';

async function run(body: Record<string, unknown>) {
  const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return res.ok ? { ok: true as const, result: json.result } : { ok: false as const, error: json.error ?? 'Failed' };
}

const BADGES = ['developer', 'moderator', 'tester', 'founder', 'contributor'];
const ROLES = ['admin', 'moderator'];
/** Mirrors the server limits in src/server/admin.ts (ADMIN_LIMITS); the server re-validates. */
const MAX_XP = 1_000_000;
const MAX_STREAK = 3_650;

export interface AdminUser {
  id: string;
  handle: string;
  displayName: string;
  email: string | null;
  isSelf: boolean;
  isDeveloper: boolean;
  totalXp: number;
  xpFrozen: boolean;
  roles: string[];
  badges: string[];
  excluded: boolean;
}

/** Parses a whole positive amount, or null. Rejects decimals, signs, exponents and blanks. */
function parseAmount(raw: string, max: number): number | null {
  if (!/^\d{1,9}$/.test(raw.trim())) return null;
  const n = Number(raw.trim());
  return n >= 1 && n <= max ? n : null;
}

const btn = 'h-8 rounded-lg border border-border bg-bg px-2.5 text-xs font-medium hover:bg-subtle disabled:opacity-50';
const field = 'h-8 rounded-lg border border-border bg-bg px-2 text-xs';

function Group({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-xl border border-border bg-subtle/40">
      <summary className="flex cursor-pointer select-none items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
        <span aria-hidden className="transition group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-3 border-t border-border p-3">{children}</div>
    </details>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
      <span className="w-28 shrink-0 text-xs font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

export function AdminUserTools({ user, achievements }: { user: AdminUser; achievements: { id: string; name: string }[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [ach, setAch] = useState(achievements[0]?.id ?? '');
  const [xp, setXp] = useState('');
  const [xpReason, setXpReason] = useState('');
  const [streakKind, setStreakKind] = useState<'normal' | 'true_player'>('normal');
  const [days, setDays] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function act(label: string, body: Record<string, unknown>, confirm = false) {
    if (confirm && pending !== label) {
      setPending(label);
      setMsg({ text: `Click "${label}" again to confirm.`, error: false });
      return;
    }
    setPending(null);
    setBusy(true);
    const r = await run({ ...body, userId: user.id });
    setBusy(false);
    if (!r.ok) return setMsg({ text: `${label}: ${r.error}`, error: true });
    const res = (r.result ?? {}) as { completed?: number; totalXp?: number; before?: number; after?: number; repeated?: boolean };
    const extra =
      res.completed !== undefined
        ? ` (${res.completed} games)`
        : res.totalXp !== undefined
          ? ` (total ${res.totalXp.toLocaleString('en-US')} XP${res.repeated ? ', already applied' : ''})`
          : res.after !== undefined
            ? ` (${res.before} → ${res.after} days)`
            : '';
    setMsg({ text: `${label}: done${extra}`, error: false });
    router.refresh();
    return true;
  }

  async function adjustXp(sign: 1 | -1) {
    const n = parseAmount(xp, MAX_XP);
    if (n === null) return setMsg({ text: `Enter a whole number of XP from 1 to ${MAX_XP.toLocaleString('en-US')}.`, error: true });
    const ok = await act(`${sign > 0 ? 'Add' : 'Remove'} ${n.toLocaleString('en-US')} XP`, { action: 'adjust-xp', amount: sign * n, reason: xpReason || undefined, requestId: crypto.randomUUID() });
    if (ok) setXp('');
  }

  async function adjustStreak(sign: 1 | -1) {
    const n = parseAmount(days, MAX_STREAK);
    if (n === null) return setMsg({ text: `Enter a whole number of days from 1 to ${MAX_STREAK.toLocaleString('en-US')}.`, error: true });
    const name = streakKind === 'normal' ? 'Normal Streak' : 'True Player Streak';
    const ok = await act(`${name} ${sign > 0 ? '+' : '−'}${n}`, { action: 'adjust-streak', kind: streakKind, amount: sign * n });
    if (ok) setDays('');
  }

  const frozenLabel = user.xpFrozen ? 'Unfreeze XP' : 'Freeze XP';
  return (
    <div className="space-y-2">
      <Group title="Player progression" open>
        <Row label="XP">
          <input
            value={xp}
            onChange={(e) => setXp(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            placeholder="Amount"
            aria-label={`XP amount for @${user.handle}`}
            className={`${field} w-28 font-mono`}
          />
          <input value={xpReason} onChange={(e) => setXpReason(e.target.value)} maxLength={200} placeholder="Reason (optional)" aria-label="Reason" className={`${field} w-44`} />
          <button className={btn} disabled={busy} onClick={() => adjustXp(1)}>
            Add XP
          </button>
          <button className={btn} disabled={busy} onClick={() => adjustXp(-1)}>
            Remove XP
          </button>
        </Row>
        <Row label="Streak">
          <select value={streakKind} onChange={(e) => setStreakKind(e.target.value as typeof streakKind)} className={field} aria-label="Streak to adjust">
            <option value="normal">Normal Streak</option>
            <option value="true_player">True Player Streak</option>
          </select>
          <input
            value={days}
            onChange={(e) => setDays(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            placeholder="Days"
            aria-label={`Streak days for @${user.handle}`}
            className={`${field} w-20 font-mono`}
          />
          <button className={btn} disabled={busy} onClick={() => adjustStreak(1)}>
            Add days
          </button>
          <button className={btn} disabled={busy} onClick={() => adjustStreak(-1)}>
            Remove days
          </button>
        </Row>
        <Row label="Repair">
          <button className={btn} disabled={busy} onClick={() => act('Grant card', { action: 'grant-card' })}>
            +1 Repair Card
          </button>
          <button className={btn} disabled={busy} onClick={() => act('Repair Normal', { action: 'repair-streak', kind: 'normal' })}>
            Repair Normal
          </button>
          <button className={btn} disabled={busy} onClick={() => act('Repair True Player', { action: 'repair-streak', kind: 'true_player' })}>
            Repair True Player
          </button>
          <button className={btn} disabled={busy} onClick={() => act('Break Normal streak', { action: 'break-streak', kind: 'normal' }, true)}>
            Break Normal
          </button>
          <button className={btn} disabled={busy} onClick={() => act('Break True Player streak', { action: 'break-streak', kind: 'true_player' }, true)}>
            Break True Player
          </button>
        </Row>
        <Row label="Daily Set">
          <button className={btn} disabled={busy} onClick={() => act('Complete Daily Set', { action: 'complete-daily-set' })}>
            Complete Daily Set
          </button>
          <button className={btn} disabled={busy} onClick={() => act('Reset Daily State', { action: 'reset-daily-state' }, true)}>
            Reset Daily State
          </button>
        </Row>
        <Row label="Achievement">
          <select value={ach} onChange={(e) => setAch(e.target.value)} className={field} aria-label="Achievement to unlock">
            {achievements.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button className={btn} disabled={busy} onClick={() => act('Unlock achievement', { action: 'unlock-achievement', achievementId: ach })}>
            Unlock
          </button>
        </Row>
      </Group>

      <Group title="Account">
        <Row label="XP freeze">
          <span className="text-xs">
            Currently <b>{user.xpFrozen ? 'ON' : 'OFF'}</b>
            <span className="text-muted">{user.xpFrozen ? ': gameplay earns no XP; manual adjustments still apply.' : ': gameplay earns XP normally.'}</span>
          </span>
          <button className={btn} disabled={busy} aria-pressed={user.xpFrozen} onClick={() => act(frozenLabel, { action: 'set-xp-frozen', on: !user.xpFrozen }, true)}>
            {frozenLabel}
          </button>
        </Row>
        <Row label="Delete">
          {user.isSelf ? (
            <span className="text-xs text-muted">This is your account. Delete it from Settings instead.</span>
          ) : user.isDeveloper ? (
            <span className="text-xs text-muted">Protected developer account (DEVELOPER.handle in src/config/site.ts).</span>
          ) : (
            <button className={`${btn} border-danger/40 text-danger`} disabled={busy} onClick={() => setDeleting(true)}>
              Delete account…
            </button>
          )}
        </Row>
      </Group>

      <Group title="Roles & badges">
        <Row label="Roles">
          {ROLES.map((role) => {
            const on = user.roles.includes(role);
            return (
              <button
                key={role}
                className={`${btn} ${role === 'admin' ? 'text-danger' : ''}`}
                disabled={busy || (role === 'admin' && on && user.isSelf)}
                aria-pressed={on}
                onClick={() => act(`${on ? 'Revoke' : 'Grant'} ${role}`, { action: 'set-role', role, on: !on }, true)}
              >
                {on ? `✓ ${role}` : `Grant ${role}`}
              </button>
            );
          })}
        </Row>
        <Row label="Badges">
          {BADGES.map((badge) => (
            <button key={badge} className={btn} disabled={busy} aria-pressed={user.badges.includes(badge)} onClick={() => act(`Badge ${badge}`, { action: 'set-badge', badge, on: !user.badges.includes(badge) })}>
              {user.badges.includes(badge) ? '✓ ' : ''}
              {badge}
            </button>
          ))}
        </Row>
        <Row label="Leaderboards">
          <button className={btn} disabled={busy} aria-pressed={user.excluded} onClick={() => act(user.excluded ? 'Include in leaderboards' : 'Exclude from leaderboards', { action: 'set-leaderboard-excluded', on: !user.excluded })}>
            {user.excluded ? '✓ excluded from leaderboards' : 'Exclude from leaderboards'}
          </button>
        </Row>
      </Group>

      {msg && (
        <p role="status" className={`text-xs ${msg.error ? 'text-danger' : 'text-muted'}`}>
          {msg.text}
        </p>
      )}
      {deleting && <DeleteAccountDialog user={user} onClose={() => setDeleting(false)} onDeleted={(text) => setMsg({ text, error: false })} />}
    </div>
  );
}

/** Destructive confirmation: shows exactly who is being deleted and requires retyping their handle. */
function DeleteAccountDialog({ user, onClose, onDeleted }: { user: AdminUser; onClose: () => void; onDeleted: (msg: string) => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const matches = typed.trim().toLowerCase().replace(/^@/, '') === user.handle;

  async function confirmDelete() {
    setBusy(true);
    const r = await run({ action: 'delete-account', userId: user.id, confirmHandle: typed });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onDeleted(`@${user.handle} was deleted.`);
    onClose();
    router.refresh();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`delete-${user.id}`}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-0 text-fg shadow-2xl backdrop:bg-black/50"
    >
      <div className="space-y-4 p-5">
        <h2 id={`delete-${user.id}`} className="font-display text-lg font-bold">
          Delete account?
        </h2>
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm">
          <p className="font-semibold">{user.displayName}</p>
          <p className="text-muted">@{user.handle}</p>
          {user.email && <p className="text-muted">{user.email}</p>}
          <p className="mt-1 font-mono text-xs text-muted">{user.totalXp.toLocaleString('en-US')} XP</p>
        </div>
        <p className="text-sm text-muted">
          This permanently removes the account and all of its player data: sign-in sessions, XP history, streaks, cards, achievements, games and notifications. It cannot be undone. The audit log keeps a record of
          the deletion.
        </p>
        <label className="block text-sm">
          Type <b className="font-mono">@{user.handle}</b> to confirm
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} className="mt-1 h-10 w-full rounded-xl border border-border bg-bg px-3 font-mono" />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => ref.current?.close()}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" disabled={!matches || busy} onClick={confirmDelete}>
            Delete Account
          </Button>
        </div>
      </div>
    </dialog>
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

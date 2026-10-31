'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Download, Volume2, VolumeX } from 'lucide-react';
import { THEMES } from '@/config/themes';
import { usePrefs } from '@/components/providers';
import { Button, Card, cn } from '@/components/ui';

async function patch(body: Record<string, unknown>) {
  const res = await fetch('/api/me/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return res.ok ? null : (json.error ?? 'Could not save.');
}

export function ThemePicker() {
  const { theme, setTheme } = usePrefs();
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {THEMES.map((t) => {
        const active = t.id === theme;
        return (
          <button
            key={t.id}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(t.id)}
            className={cn('relative rounded-xl border p-3 text-left transition hover:-translate-y-0.5', active ? 'border-accent ring-2 ring-accent/40' : 'border-border')}
          >
            <span className="mb-2 flex h-10 overflow-hidden rounded-lg border border-black/10" aria-hidden>
              <span className="flex-[2]" style={{ background: t.swatch[0] }} />
              <span className="flex-1" style={{ background: t.swatch[1] }} />
              <span className="flex-1" style={{ background: t.swatch[2] }} />
            </span>
            <span className="block text-sm font-semibold">{t.name}</span>
            <span className="block text-[11px] leading-tight text-muted">{t.description}</span>
            {active && <Check className="absolute right-2 top-2 size-4 text-accent" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

export function SoundToggle() {
  const { sound, setSound } = usePrefs();
  return (
    <button role="switch" aria-checked={sound} onClick={() => setSound(!sound)} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left">
      {sound ? <Volume2 className="size-5 text-accent" aria-hidden /> : <VolumeX className="size-5 text-muted" aria-hidden />}
      <span className="flex-1">
        <span className="block text-sm font-semibold">Sound effects</span>
        <span className="block text-xs text-muted">Clicks, completions, level-ups and achievements. Never autoplays.</span>
      </span>
      <span className={cn('relative h-6 w-11 rounded-full transition', sound ? 'bg-accent' : 'bg-subtle')} aria-hidden>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition', sound ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

export function ProfileForm({ displayName, title, profilePublic, showOnLeaderboards }: { displayName: string; title: string; profilePublic: boolean; showOnLeaderboards: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ displayName, title, profilePublic, showOnLeaderboards });
  const [state, setState] = useState<{ saving: boolean; msg: string | null; error: boolean }>({ saving: false, msg: null, error: false });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState({ saving: true, msg: null, error: false });
    const err = await patch({ ...form, title: form.title || null });
    setState({ saving: false, msg: err ?? 'Saved.', error: !!err });
    if (!err) router.refresh();
  }
  const toggle = (key: 'profilePublic' | 'showOnLeaderboards', label: string, hint: string) => (
    <label className="flex items-start gap-3 rounded-xl border border-border p-3">
      <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="mt-1 size-4 accent-[var(--accent)]" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Display name</span>
          <input required maxLength={40} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="h-10 w-full rounded-xl border border-border bg-bg px-3" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Title (optional)</span>
          <input maxLength={40} value={form.title} placeholder="e.g. Puzzle enjoyer" onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10 w-full rounded-xl border border-border bg-bg px-3" />
        </label>
      </div>
      {toggle('profilePublic', 'Public profile', 'Anyone can view your profile page. Your email is never shown.')}
      {toggle('showOnLeaderboards', 'Appear on leaderboards', 'Turn off to keep playing without being ranked publicly.')}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={state.saving}>
          Save profile
        </Button>
        {state.msg && (
          <span role="status" className={cn('text-sm', state.error ? 'text-danger' : 'text-success')}>
            {state.msg}
          </span>
        )}
      </div>
    </form>
  );
}

export function DataControls({ handle, isGuest }: { handle: string; isGuest: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function del(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/me/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: confirm, password: password || undefined }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? 'Could not delete account.');
    router.push('/');
    router.refresh();
  }
  return (
    <div className="space-y-3">
      <a href="/api/me/export" className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-subtle">
        <Download className="size-5 text-accent" aria-hidden />
        <span>
          <span className="block text-sm font-semibold">Export my data</span>
          <span className="block text-xs text-muted">Download everything GameHub stores about you as JSON.</span>
        </span>
      </a>
      <Card className="border-danger/40 p-3">
        <p className="text-sm font-semibold text-danger">Delete account</p>
        <p className="mb-2 text-xs text-muted">Permanently removes your profile, progress, XP, achievements and history. This cannot be undone.</p>
        {!open ? (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Delete my account…
          </Button>
        ) : (
          <form onSubmit={del} className="space-y-2">
            <label className="block text-xs">
              Type your handle <span className="font-mono font-bold">{handle}</span> to confirm
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-bg px-2" autoComplete="off" />
            </label>
            {!isGuest && (
              <label className="block text-xs">
                Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-bg px-2" autoComplete="current-password" />
              </label>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button variant="danger" size="sm" type="submit" disabled={busy || confirm.trim().toLowerCase() !== handle}>
                Permanently delete
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

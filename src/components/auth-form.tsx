'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card } from '@/components/ui';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

const COPY: Record<Mode, { title: string; cta: string; endpoint: string }> = {
  login: { title: 'Welcome back', cta: 'Sign in', endpoint: '/api/auth/login' },
  signup: { title: 'Create your account', cta: 'Create account', endpoint: '/api/auth/signup' },
  forgot: { title: 'Reset your password', cta: 'Send reset link', endpoint: '/api/auth/forgot' },
  reset: { title: 'Choose a new password', cta: 'Set password', endpoint: '/api/auth/reset' },
};

export function AuthForm({ mode, token, isGuest }: { mode: Mode; token?: string; isGuest?: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState({ email: '', password: '', handle: '', displayName: '' });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const c = COPY[mode];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = mode === 'reset' ? { token, password: values.password } : mode === 'forgot' ? { email: values.email } : mode === 'login' ? { email: values.email, password: values.password } : values;
    const res = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? 'Something went wrong.');
    if (mode === 'forgot') return setDone('If that email has an account, a reset link is on its way. It expires in one hour.');
    if (mode === 'reset') return setDone('Password updated. You can sign in now.');
    router.push('/dashboard');
    router.refresh();
  }

  const field = (name: keyof typeof values, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        {...props}
        name={name}
        value={values[name]}
        onChange={(e) => setValues({ ...values, [name]: e.target.value })}
        className="h-11 w-full rounded-xl border border-border bg-bg px-3 focus:border-accent"
      />
    </label>
  );

  return (
    <Card className="mx-auto max-w-md p-6">
      <h1 className="mb-1 font-display text-2xl font-bold">{c.title}</h1>
      {mode === 'signup' && (
        <p className="mb-4 text-sm text-muted">{isGuest ? 'Your guest progress (XP, streaks, achievements) moves into this account.' : 'Save progress, get a public profile and join the leaderboards.'}</p>
      )}
      {done ? (
        <p role="status" className="mt-4 text-sm text-success">
          {done} {mode === 'reset' && <Link href="/login" className="font-semibold underline">Sign in</Link>}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {(mode === 'login' || mode === 'signup' || mode === 'forgot') && field('email', 'Email', { type: 'email', required: true, autoComplete: 'email', maxLength: 254 })}
          {mode === 'signup' && field('handle', 'Handle', { required: true, pattern: '[a-zA-Z0-9_\\-]{3,24}', title: '3-24 letters, numbers, - or _', autoComplete: 'username', placeholder: 'e.g. mr-stark' })}
          {mode === 'signup' && field('displayName', 'Display name', { required: true, maxLength: 40, autoComplete: 'nickname' })}
          {mode !== 'forgot' &&
            field('password', mode === 'reset' ? 'New password' : 'Password', {
              type: 'password',
              required: true,
              minLength: mode === 'login' ? undefined : 10,
              autoComplete: mode === 'login' ? 'current-password' : 'new-password',
            })}
          {(mode === 'signup' || mode === 'reset') && <p className="text-xs text-muted">At least 10 characters.</p>}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {c.cta}
          </Button>
        </form>
      )}
      <div className="mt-4 flex justify-between text-sm text-muted">
        {mode === 'login' && (
          <>
            <Link href="/signup" className="hover:text-fg">Create an account</Link>
            <Link href="/forgot" className="hover:text-fg">Forgot password?</Link>
          </>
        )}
        {mode === 'signup' && <Link href="/login" className="hover:text-fg">Already have an account? Sign in</Link>}
        {(mode === 'forgot' || mode === 'reset') && <Link href="/login" className="hover:text-fg">Back to sign in</Link>}
      </div>
    </Card>
  );
}

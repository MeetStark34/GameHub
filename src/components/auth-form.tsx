'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useI18n } from '@/i18n/client';
import { Button, Card } from '@/components/ui';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

const ENDPOINT: Record<Mode, string> = { login: '/api/auth/login', signup: '/api/auth/signup', forgot: '/api/auth/forgot', reset: '/api/auth/reset' };

export function AuthForm({ mode, token, isGuest }: { mode: Mode; token?: string; isGuest?: boolean }) {
  const { t, msg } = useI18n();
  const [values, setValues] = useState({ email: '', password: '', handle: '', displayName: '' });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = mode === 'reset' ? { token, password: values.password } : mode === 'forgot' ? { email: values.email } : mode === 'login' ? { email: values.email, password: values.password } : values;
    const res = await fetch(ENDPOINT[mode], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.code ? msg(json.code) : (json.error ?? t('play.generic')));
    if (mode === 'forgot') return setDone(t('auth.forgotSent'));
    if (mode === 'reset') return setDone(t('auth.resetDone'));
    // A full load, not router.push: pages prefetched while signed out (the
    // header links) would otherwise show the visitor version first, and the
    // root layout must pick up the account's theme, language and sound.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load on purpose (see above)
    window.location.assign('/dashboard');
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
      <h1 className="mb-1 font-display text-2xl font-bold">{t(`auth.${mode}Title`)}</h1>
      {mode === 'signup' && <p className="mb-4 text-sm text-muted">{isGuest ? t('auth.guestUpgrade') : t('auth.signupPitch')}</p>}
      {done ? (
        <p role="status" className="mt-4 text-sm text-success">
          {done}{' '}
          {mode === 'reset' && (
            <Link href="/login" className="font-semibold underline">
              {t('auth.login')}
            </Link>
          )}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {(mode === 'login' || mode === 'signup' || mode === 'forgot') && field('email', t('auth.email'), { type: 'email', required: true, autoComplete: 'email', maxLength: 254 })}
          {mode === 'signup' && field('handle', t('auth.handle'), { required: true, pattern: '[a-zA-Z0-9_\\-]{3,24}', title: t('auth.handleTitle'), autoComplete: 'username', placeholder: 'mr-stark' })}
          {mode === 'signup' && field('displayName', t('auth.displayName'), { required: true, maxLength: 40, autoComplete: 'nickname' })}
          {mode !== 'forgot' &&
            field('password', mode === 'reset' ? t('auth.newPassword') : t('auth.password'), {
              type: 'password',
              required: true,
              minLength: mode === 'login' ? undefined : 10,
              autoComplete: mode === 'login' ? 'current-password' : 'new-password',
            })}
          {(mode === 'signup' || mode === 'reset') && <p className="text-xs text-muted">{t('auth.passwordHint')}</p>}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {t(`auth.${mode}`)}
          </Button>
        </form>
      )}
      <div className="mt-4 flex justify-between gap-3 text-sm text-muted">
        {mode === 'login' && (
          <>
            <Link href="/signup" className="hover:text-fg">
              {t('auth.toSignup')}
            </Link>
            <Link href="/forgot" className="hover:text-fg">
              {t('auth.toForgot')}
            </Link>
          </>
        )}
        {mode === 'signup' && (
          <Link href="/login" className="hover:text-fg">
            {t('auth.toLogin')}
          </Link>
        )}
        {(mode === 'forgot' || mode === 'reset') && (
          <Link href="/login" className="hover:text-fg">
            {t('auth.backToLogin')}
          </Link>
        )}
      </div>
    </Card>
  );
}

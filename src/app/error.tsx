'use client';

import { useEffect } from 'react';
import { useI18n } from '@/i18n/client';
import { Button, ButtonLink } from '@/components/ui';

/** Page-level failures render inside the root layout, so navigation stays usable. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="py-16 text-center">
      <p className="font-mono text-sm text-muted">500</p>
      <h1 className="mt-1 font-display text-3xl font-bold">{t('errors.generic')}</h1>
      {/* The digest matches the server log entry on Vercel; it carries no error details. */}
      {error.digest && <p className="mt-2 font-mono text-xs text-muted">ref {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>{t('common.tryAgain')}</Button>
        <ButtonLink href="/" variant="secondary">
          {t('notFound.back')}
        </ButtonLink>
      </div>
    </div>
  );
}

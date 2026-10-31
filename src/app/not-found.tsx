import { getTranslator } from '@/i18n/server';
import { ButtonLink } from '@/components/ui';

export default async function NotFound() {
  const { t } = await getTranslator();
  return (
    <div className="py-16 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-1 font-display text-3xl font-bold">{t('notFound.title')}</h1>
      <p className="mt-2 text-muted">{t('notFound.body')}</p>
      <ButtonLink href="/" className="mt-6">
        {t('notFound.back')}
      </ButtonLink>
    </div>
  );
}

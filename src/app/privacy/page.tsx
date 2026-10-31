import type { Metadata } from 'next';
import { getTranslator } from '@/i18n/server';
import { PageHeader } from '@/components/ui';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('privacy.title'), description: t('privacy.intro') };
}

function H({ children }: { children: string }) {
  return <h2 className="font-display text-lg font-bold">{children}</h2>;
}

export default async function PrivacyPage() {
  const { t, list } = await getTranslator();
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-sm leading-relaxed">
      <PageHeader title={t('privacy.title')}>{t('privacy.intro')}</PageHeader>
      <H>{t('privacy.storeTitle')}</H>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        {list('privacy.store').map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <p className="text-muted">{t('privacy.guests')}</p>
      <H>{t('privacy.publicTitle')}</H>
      <p className="text-muted">{t('privacy.public')}</p>
      <H>{t('privacy.cookiesTitle')}</H>
      <p className="text-muted">{t('privacy.cookies')}</p>
      <H>{t('privacy.controlsTitle')}</H>
      <p className="text-muted">{t('privacy.controls')}</p>
    </article>
  );
}

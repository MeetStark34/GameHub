import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';
import { getTranslator } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('auth.resetTitle'), robots: { index: false } };
}

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) return <p className="text-center text-muted">{(await getTranslator()).t('auth.missingToken')}</p>;
  return <AuthForm mode="reset" token={token} />;
}

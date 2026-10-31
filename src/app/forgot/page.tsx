import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';
import { getTranslator } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('auth.forgotTitle'), robots: { index: false } };
}

export default function ForgotPage() {
  return <AuthForm mode="forgot" />;
}

import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';
import { getTranslator } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('auth.loginTitle'), robots: { index: false } };
}

export default function LoginPage() {
  return <AuthForm mode="login" />;
}

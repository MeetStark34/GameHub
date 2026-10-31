import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { getTranslator } from '@/i18n/server';
import { currentUser } from '@/server/auth';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('auth.signupTitle'), robots: { index: false } };
}

export default async function SignupPage() {
  const user = await currentUser();
  if (user && !user.is_guest) redirect('/dashboard');
  return <AuthForm mode="signup" isGuest={!!user?.is_guest} />;
}

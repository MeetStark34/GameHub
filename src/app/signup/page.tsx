import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { currentUser } from '@/server/auth';

export const metadata: Metadata = { title: 'Create account', robots: { index: false } };

export default async function SignupPage() {
  const user = await currentUser();
  if (user && !user.is_guest) redirect('/dashboard');
  return <AuthForm mode="signup" isGuest={!!user?.is_guest} />;
}

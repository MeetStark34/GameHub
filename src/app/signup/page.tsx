import { GuestNotice } from '@/components/guest-notice';
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
  return (
    <>
      {user?.is_guest && (
        <GuestNotice
          showCta={false}
          expiresAt={user.guest_expires_at ? new Date(user.guest_expires_at).toISOString() : null}
          className="mx-auto mb-4 max-w-md"
        />
      )}
      <AuthForm mode="signup" isGuest={!!user?.is_guest} />
    </>
  );
}

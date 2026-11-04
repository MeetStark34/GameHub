import { GuestNotice } from '@/components/guest-notice';
import type { Metadata } from 'next';
import { getTranslator } from '@/i18n/server';
import { Card, PageHeader, SectionTitle } from '@/components/ui';
import { DataControls, LanguagePicker, ProfileForm, SoundToggle, ThemePicker } from '@/components/settings/settings-client';
import { currentUser } from '@/server/auth';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('settings.title'), robots: { index: false } };
}

export default async function SettingsPage() {
  const { t } = await getTranslator();
  const user = await currentUser();
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title={t('settings.title')}>{t('settings.intro')}</PageHeader>

      <section aria-labelledby="language">
        <SectionTitle id="language">{t('settings.language')}</SectionTitle>
        <LanguagePicker />
        <p className="mt-2 text-xs text-muted">{t('settings.languageHint')}</p>
      </section>

      <section aria-labelledby="themes" id="themes-section">
        <SectionTitle id="themes">{t('settings.theme')}</SectionTitle>
        <ThemePicker />
      </section>

      <section aria-labelledby="sound">
        <SectionTitle id="sound">{t('settings.sound')}</SectionTitle>
        <SoundToggle />
      </section>

      {user && !user.is_guest && (
        <section aria-labelledby="profile">
          <SectionTitle id="profile">{t('settings.profile')}</SectionTitle>
          <Card className="p-4">
            <p className="mb-3 text-xs text-muted">{t('settings.signedInAs', { email: user.email ?? '', handle: user.handle })}</p>
            <ProfileForm displayName={user.display_name} title={user.title ?? ''} profilePublic={user.profile_public} showOnLeaderboards={user.show_on_leaderboards} />
          </Card>
        </section>
      )}

      {user?.is_guest && <GuestNotice expiresAt={user.guest_expires_at ? new Date(user.guest_expires_at).toISOString() : null} />}

      {user && (
        <section aria-labelledby="data">
          <SectionTitle id="data">{t('settings.data')}</SectionTitle>
          <DataControls handle={user.handle} isGuest={user.is_guest} />
        </section>
      )}
    </div>
  );
}

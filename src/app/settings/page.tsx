import type { Metadata } from 'next';
import { Card, ButtonLink, PageHeader, SectionTitle } from '@/components/ui';
import { DataControls, ProfileForm, SoundToggle, ThemePicker } from '@/components/settings/settings-client';
import { currentUser } from '@/server/auth';

export const metadata: Metadata = { title: 'Settings', robots: { index: false } };

export default async function SettingsPage() {
  const user = await currentUser();
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Settings">Themes and sound apply instantly and follow your account across devices when you are signed in.</PageHeader>

      <section aria-labelledby="themes">
        <SectionTitle id="themes">Theme</SectionTitle>
        <ThemePicker />
      </section>

      <section aria-labelledby="sound">
        <SectionTitle id="sound">Sound</SectionTitle>
        <SoundToggle />
      </section>

      {user && !user.is_guest && (
        <section aria-labelledby="profile">
          <SectionTitle id="profile">Profile &amp; privacy</SectionTitle>
          <Card className="p-4">
            <p className="mb-3 text-xs text-muted">
              Signed in as {user.email} (never shown publicly) · handle @{user.handle}
            </p>
            <ProfileForm displayName={user.display_name} title={user.title ?? ''} profilePublic={user.profile_public} showOnLeaderboards={user.show_on_leaderboards} />
          </Card>
        </section>
      )}

      {user?.is_guest && (
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <p className="flex-1 text-sm">You are playing as a guest. Create an account to keep your progress across devices, set up a public profile and join leaderboards.</p>
          <ButtonLink href="/signup">Create account</ButtonLink>
        </Card>
      )}

      {user && (
        <section aria-labelledby="data">
          <SectionTitle id="data">Your data</SectionTitle>
          <DataControls handle={user.handle} isGuest={user.is_guest} />
        </section>
      )}
    </div>
  );
}

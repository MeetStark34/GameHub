import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Privacy', description: 'What GameHub stores, why, and how to export or delete it.' };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-sm leading-relaxed">
      <PageHeader title="Privacy">Plain-language summary of how GameHub handles your data. This is not legal advice and has not had a legal review.</PageHeader>
      <h2 className="font-display text-lg font-bold">What we store</h2>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Account: email, password hash (scrypt), handle, display name, optional title.</li>
        <li>Gameplay: puzzles you start, completions (time, score), XP history, streaks, mastery, achievements, repair-card history.</li>
        <li>Preferences: theme and sound.</li>
        <li>Security: hashed session tokens, short-lived rate-limit counters, and an audit log of admin actions.</li>
      </ul>
      <p className="text-muted">Guests get the same gameplay records under a random handle, tied to a browser cookie.</p>
      <h2 className="font-display text-lg font-bold">What is public</h2>
      <p className="text-muted">If your profile is public: display name, handle, title, badges, rank, XP, streaks, mastery and achievements. Your email is never shown. You can hide your profile and leave the leaderboards in Settings.</p>
      <h2 className="font-display text-lg font-bold">Cookies</h2>
      <p className="text-muted">One essential session cookie (httpOnly) and two preference cookies (theme, sound). No advertising or third-party tracking cookies.</p>
      <h2 className="font-display text-lg font-bold">Your controls</h2>
      <p className="text-muted">Settings → Your data lets you export everything as JSON and permanently delete your account and all associated records.</p>
    </article>
  );
}

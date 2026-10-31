import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AchievementIcon } from '@/components/achievement-icon';
import { MarkAllRead } from '@/components/mark-all-read';
import { ButtonLink, Card, PageHeader, cn } from '@/components/ui';
import { currentUser } from '@/server/auth';
import { getNotifications } from '@/server/queries';

export const metadata: Metadata = { title: 'Notifications', robots: { index: false } };

const ICON: Record<string, string> = {
  achievement: 'Award',
  'level-up': 'Rocket',
  punch: 'Wallet',
  'card-created': 'ShieldCheck',
  'pocket-full': 'Wallet',
  'card-converted': 'Recycle',
  'true-player': 'Crown',
  'streak-milestone': 'Flame',
  'streak-repaired': 'Bandage',
  'mastery-up': 'GraduationCap',
};

export default async function NotificationsPage() {
  const user = await currentUser();
  if (!user)
    return (
      <div className="text-center">
        <p className="mb-4 text-muted">Play a game to start receiving notifications.</p>
        <ButtonLink href="/daily">Play the Daily Set</ButtonLink>
      </div>
    );
  const list = await getNotifications(await getDb(), user.id);
  const unread = list.filter((n) => !n.read).length;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Notifications">{unread ? `${unread} unread` : 'All caught up.'}</PageHeader>
        {unread > 0 && <MarkAllRead />}
      </div>
      <Card className="divide-y divide-border">
        {list.length === 0 && <p className="p-6 text-center text-sm text-muted">Nothing yet. Level-ups, achievements and repair cards will appear here.</p>}
        {list.map((n) => (
          <div key={n.id} className={cn('flex gap-3 p-4', !n.read && 'bg-accent-soft/50')}>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle text-accent">
              <AchievementIcon name={(n.data.icon as string) ?? ICON[n.kind] ?? 'Award'} className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {n.kind === 'achievement' && <span className="mr-1 text-gold">Achievement:</span>}
                {n.title}
              </p>
              <p className="text-sm text-muted">{n.body}</p>
              <p className="mt-0.5 text-xs text-muted">{new Date(n.createdAt).toUTCString().replace(' GMT', ' UTC')}</p>
            </div>
            {typeof n.data.xp === 'number' && <span className="num font-mono text-xs font-bold text-gold">+{n.data.xp}</span>}
          </div>
        ))}
      </Card>
    </div>
  );
}

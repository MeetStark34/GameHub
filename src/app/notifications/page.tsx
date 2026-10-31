import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { getTranslator } from '@/i18n/server';
import type { Msg } from '@/i18n/translate';
import { AchievementIcon } from '@/components/achievement-icon';
import { MarkAllRead } from '@/components/mark-all-read';
import { ButtonLink, Card, PageHeader, cn } from '@/components/ui';
import { currentUser } from '@/server/auth';
import { getNotifications } from '@/server/queries';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('notifications.title'), robots: { index: false } };
}

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
  const { t, msg, locale } = await getTranslator();
  const user = await currentUser();
  if (!user)
    return (
      <div className="text-center">
        <p className="mb-4 text-muted">{t('notifications.signedOut')}</p>
        <ButtonLink href="/daily">{t('landing.playDaily')}</ButtonLink>
      </div>
    );
  const list = await getNotifications(await getDb(), user.id);
  const unread = list.filter((n) => !n.read).length;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={t('notifications.title')}>{unread ? t('notifications.unread', { count: unread }) : t('notifications.caughtUp')}</PageHeader>
        {unread > 0 && <MarkAllRead label={t('notifications.markAll')} />}
      </div>
      <Card className="divide-y divide-border">
        {list.length === 0 && <p className="p-6 text-center text-sm text-muted">{t('notifications.empty')}</p>}
        {list.map((n) => {
          const i18n = n.data.i18n as { title: Msg; body: Msg } | null | undefined;
          return (
            <div key={n.id} className={cn('flex gap-3 p-4', !n.read && 'bg-accent-soft/50')}>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle text-accent">
                <AchievementIcon name={(n.data.icon as string) ?? ICON[n.kind] ?? 'Award'} className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {n.kind === 'achievement' && <span className="mr-1 text-gold">{t('notifications.achievementPrefix')}</span>}
                  {msg(i18n?.title, n.title)}
                </p>
                <p className="text-sm text-muted">{msg(i18n?.body, n.body)}</p>
                <p className="mt-0.5 text-xs text-muted">{new Date(n.createdAt).toLocaleString(locale, { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC</p>
              </div>
              {typeof n.data.xp === 'number' && <span className="num font-mono text-xs font-bold text-gold">+{n.data.xp}</span>}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

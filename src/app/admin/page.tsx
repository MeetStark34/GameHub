import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ACHIEVEMENTS } from '@/config/achievements';
import { DEVELOPER } from '@/config/site';
import { getDb } from '@/lib/db';
import { formatDuration } from '@/lib/time';
import { AdminUserTools, DeveloperShowcase, PuzzleGenerator } from '@/components/admin/admin-tools';
import { Card, PageHeader, Pill, SectionTitle, cn } from '@/components/ui';
import { adminAuditLog, adminSearchUsers } from '@/server/admin';
import { adminDashboard } from '@/server/admin-dashboard';
import { currentUser, isAdmin } from '@/server/auth';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'daily', label: 'Daily puzzles' },
  { id: 'activity', label: 'Activity & suspicious' },
  { id: 'users', label: 'Users & dev tools' },
  { id: 'system', label: 'System & audit' },
] as const;
type Tab = (typeof TABS)[number]['id'];

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="num font-display text-xl font-bold">{typeof value === 'number' ? value.toLocaleString('en-US') : value}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </Card>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number | React.ReactNode)[][] }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-subtle text-left text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length} className="px-3 py-4 text-center text-muted">
                Nothing to show.
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/**
 * Admin / developer dashboard. Server-side authorization on every render:
 * only accounts with the `admin` role in user_roles get past this check.
 * Display badges (e.g. Developer) never grant access. Admin UI is English-only.
 */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const user = await currentUser();
  if (!user || user.is_guest || !(await isAdmin(user.id))) notFound();
  const { q = '', tab: rawTab } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : 'overview';
  const db = await getDb();
  const now = new Date();
  const d = await adminDashboard(db, now);
  const maxDist = Math.max(1, ...d.xpDistribution.map((x) => x.count));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Restricted · admin role required" title="Developer dashboard">
        Every action here is checked server-side against the admin role and written to the audit log.
      </PageHeader>

      <nav aria-label="Admin sections" className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin?tab=${t.id}`} aria-current={t.id === tab ? 'page' : undefined} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', t.id === tab ? 'bg-accent text-accent-fg' : 'bg-card text-muted hover:text-fg')}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="space-y-6">
          <section>
            <SectionTitle>Players</SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Total users" value={d.users.total} />
              <Stat label="Members" value={d.users.members} />
              <Stat label="Guests" value={d.users.guests} />
              <Stat label="Daily active (UTC today)" value={d.users.dau} />
              <Stat label="Weekly active" value={d.users.wau} />
              <Stat label="New today" value={d.users.newToday} />
            </div>
          </section>
          <section>
            <SectionTitle>Games</SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Games played (all time)" value={d.games.total} />
              <Stat label="Games today" value={d.games.today} />
              <Stat label="Daily Set completions today" value={d.games.dailyToday} />
              <Stat label="Unlimited today" value={d.games.unlimitedToday} sub={`${d.games.unlimitedTotal.toLocaleString('en-US')} all time`} />
              <Stat label="True Players today" value={d.truePlayer.today} sub={`${d.truePlayer.allTime} sets all time`} />
              <Stat label="Active sessions" value={d.games.activeSessions} />
            </div>
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <SectionTitle>XP distribution by rank</SectionTitle>
              <Card className="space-y-1.5 p-4">
                {d.xpDistribution.map((x) => (
                  <div key={x.name} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 font-semibold">{x.name}</span>
                    <span className="h-3 flex-1 overflow-hidden rounded bg-subtle">
                      <span className="block h-full rounded bg-accent" style={{ width: `${(x.count / maxDist) * 100}%` }} />
                    </span>
                    <span className="num w-10 text-right font-mono">{x.count}</span>
                  </div>
                ))}
                <p className="pt-2 text-[11px] text-muted">
                  Total {Math.round(d.xpTotals.total).toLocaleString('en-US')} XP · average {d.xpTotals.avg.toLocaleString('en-US')} · max {d.xpTotals.max.toLocaleString('en-US')}
                </p>
              </Card>
            </div>
            <div className="space-y-6">
              <div>
                <SectionTitle>Streaks & cards</SectionTitle>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Stat label="Live Normal streaks" value={d.streaks.activeNormal} sub={`avg ${d.streaks.avgNormal} days`} />
                  <Stat label="Best Normal streak" value={d.streaks.bestNormal} />
                  <Stat label="Best True Player streak" value={d.truePlayer.bestStreak} />
                  <Stat label="Repair cards held" value={d.streaks.cardsHeld} />
                  <Stat label="Repair cards used" value={d.streaks.cardsUsed} />
                  <Stat label="Achievement unlocks" value={d.achievementTotal} />
                </div>
              </div>
              <div>
                <SectionTitle>Leaderboards</SectionTitle>
                <Card className="space-y-1 p-4 text-sm">
                  <p>
                    Ranked players: <b>{d.leaderboard.ranked}</b> · opted out: <b>{d.leaderboard.optedOut}</b>
                  </p>
                  <p>
                    Excluded by admin:{' '}
                    {d.leaderboard.excluded.length ? d.leaderboard.excluded.map((h) => <Pill key={h} className="mr-1">@{h}</Pill>) : <span className="text-muted">none</span>}
                  </p>
                </Card>
              </div>
            </div>
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <SectionTitle>Game usage</SectionTitle>
              <Table head={['Game', 'Today', 'All time', 'Avg time', 'Avg score']} rows={d.gameUsage.map((g) => [g.name, g.today, g.total, formatDuration(g.avgMs), g.avgScore])} />
            </div>
            <div>
              <SectionTitle>Most unlocked achievements</SectionTitle>
              <Table head={['Achievement', 'Unlocks']} rows={d.topAchievements.map((a) => [a.name, a.count])} />
            </div>
          </section>
        </div>
      )}

      {tab === 'daily' && (
        <div className="space-y-6">
          <section>
            <SectionTitle>Current Daily Set ({now.toISOString().slice(0, 10)} UTC)</SectionTitle>
            <Table
              head={['Game', 'Difficulty', 'Fingerprint', 'Attempt', 'Reused', 'Completions']}
              rows={d.currentSet.map((r) => [
                r.game,
                r.difficulty,
                <code key="f" className="font-mono">
                  {r.fingerprint ?? '—'}
                </code>,
                r.attempt,
                r.reused ? <span className="font-semibold text-warning">yes</span> : 'no',
                r.completions,
              ])}
            />
            {d.currentSet.length === 0 && <p className="mt-2 text-xs text-muted">Today&apos;s set is created on the first Daily request.</p>}
          </section>
          <section>
            <SectionTitle>Content pools & repeats</SectionTitle>
            <Table
              head={['Game', 'Distinct Daily puzzles used', 'Pool size', 'Reused (pool exhausted)']}
              rows={d.dailyPools.map((p) => [p.name, p.used, p.pool ?? 'generated (effectively unbounded)', p.reused])}
            />
          </section>
          <section>
            <SectionTitle>Fingerprint history (latest)</SectionTitle>
            <Table head={['Date', 'Game', 'Fingerprint', 'Reused']} rows={d.history.map((h) => [h.utc_date, h.game, <code key="f" className="font-mono">{h.fingerprint}</code>, h.reused ? 'yes' : ''])} />
          </section>
          <section>
            <SectionTitle>Puzzle generator</SectionTitle>
            <PuzzleGenerator />
          </section>
        </div>
      )}

      {tab === 'activity' && (
        <div className="space-y-6">
          <p className="text-sm text-muted">Heuristics for human review. Nothing here is acted on automatically.</p>
          <section>
            <SectionTitle>Completions near the plausibility floor (last 7 days)</SectionTitle>
            <Table head={['When (UTC)', 'Player', 'Game', 'Difficulty', 'Time']} rows={d.suspicious.nearFloor.map((c) => [c.completed_at.slice(0, 19).replace('T', ' '), `@${c.handle}`, c.game, c.difficulty, formatDuration(c.duration_ms)])} />
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <SectionTitle>100+ games in a day</SectionTitle>
              <Table head={['Date', 'Player', 'Games']} rows={d.suspicious.heavyDays.map((h) => [h.utc_date, `@${h.handle}`, h.games_completed])} />
            </div>
            <div>
              <SectionTitle>150+ Unlimited starts today</SectionTitle>
              <Table head={['Player', 'Starts']} rows={d.suspicious.startBursts.map((s) => [`@${s.handle}`, s.n])} />
            </div>
          </section>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-6">
          <section>
            <SectionTitle>Developer showcase</SectionTitle>
            <DeveloperShowcase handle={DEVELOPER.handle} />
          </section>
          <section>
            <SectionTitle>Users & developer tools</SectionTitle>
            <form className="mb-3 flex gap-2">
              <input type="hidden" name="tab" value="users" />
              <input name="q" defaultValue={q} placeholder="Search handle, email or name" className="h-10 flex-1 rounded-xl border border-border bg-card px-3" aria-label="Search users" />
              <button className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg">Search</button>
            </form>
            <UserList q={q} />
          </section>
        </div>
      )}

      {tab === 'system' && (
        <div className="space-y-6">
          <section>
            <SectionTitle>System status</SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Database" value={d.system.driver} />
              <Stat label="Migrations" value={d.system.migrations.length} sub={d.system.migrations.join(', ')} />
              <Stat label="Node" value={d.system.node} sub={`uptime ${d.system.uptimeMin} min`} />
              <Stat label="Server time" value={d.system.serverTime.slice(11, 19)} sub="UTC" />
              <Stat label="Password reset email" value={d.system.resend ? 'Configured' : 'Not configured'} />
              <Stat label="Site URL" value={d.system.siteUrl} />
              <Stat label="Bootstrap admins env" value={d.system.bootstrapAdmins ? 'Set (remove once admins exist)' : 'Not set'} />
            </div>
          </section>
          <section>
            <SectionTitle>Audit log</SectionTitle>
            <AuditLog />
          </section>
        </div>
      )}
    </div>
  );
}

async function UserList({ q }: { q: string }) {
  const users = await adminSearchUsers(await getDb(), q.slice(0, 64));
  return (
    <div className="space-y-2">
      {users.map((u) => (
        <Card key={u.id} className="p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{u.display_name}</span>
            <span className="text-muted">@{u.handle}</span>
            {u.email && <span className="text-xs text-muted">{u.email}</span>}
            {u.is_guest && <Pill>guest</Pill>}
            {u.roles.map((r) => (
              <Pill key={r} className="border-danger/40 text-danger">
                role: {r}
              </Pill>
            ))}
            {u.badges.map((b) => (
              <Pill key={b}>badge: {b}</Pill>
            ))}
            {u.leaderboard_excluded && <Pill>leaderboard-excluded</Pill>}
            <span className="num ml-auto font-mono text-xs">{(u.total_xp ?? 0).toLocaleString('en-US')} XP</span>
          </div>
          <AdminUserTools userId={u.id} roles={u.roles} badges={u.badges} excluded={u.leaderboard_excluded} achievements={ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name }))} />
        </Card>
      ))}
      {users.length === 0 && <p className="text-sm text-muted">No users match.</p>}
    </div>
  );
}

async function AuditLog() {
  const log = await adminAuditLog(await getDb(), 50);
  return (
    <Table
      head={['When (UTC)', 'Actor', 'Action', 'Target', 'Details']}
      rows={log.map((l) => [
        new Date(l.created_at).toISOString().slice(0, 19).replace('T', ' '),
        l.actor ?? '—',
        <b key="a">{l.action}</b>,
        l.target ?? '—',
        <span key="d" className="block max-w-xs truncate font-mono text-muted">
          {JSON.stringify(l.details)}
        </span>,
      ])}
    />
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ACHIEVEMENTS } from '@/config/achievements';
import { getDb } from '@/lib/db';
import { AdminUserTools, PuzzleGenerator } from '@/components/admin/admin-tools';
import { BADGE_LABELS, Card, PageHeader, Pill, SectionTitle } from '@/components/ui';
import { adminAuditLog, adminOverview, adminSearchUsers } from '@/server/admin';
import { currentUser, isAdmin } from '@/server/auth';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  // Server-side authorization: non-admins get a 404, not a hidden button.
  const user = await currentUser();
  if (!user || user.is_guest || !(await isAdmin(user.id))) notFound();
  const { q = '' } = await searchParams;
  const db = await getDb();
  const now = new Date();
  const [overview, users, log] = await Promise.all([adminOverview(db, now), adminSearchUsers(db, q.slice(0, 64)), adminAuditLog(db, 40)]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Restricted" title="Admin">
        Every action here is checked server-side against the admin role and written to the audit log.
      </PageHeader>

      <section aria-labelledby="ov">
        <SectionTitle id="ov">Overview</SectionTitle>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {Object.entries(overview).map(([k, v]) => (
            <Card key={k} className="p-3">
              <dt className="text-[11px] capitalize text-muted">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt>
              <dd className="num font-display text-xl font-bold">{v.toLocaleString('en-US')}</dd>
            </Card>
          ))}
        </dl>
      </section>

      <section aria-labelledby="users">
        <SectionTitle id="users">Users &amp; developer tools</SectionTitle>
        <form className="mb-3 flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search handle, email or name" className="h-10 flex-1 rounded-xl border border-border bg-card px-3" aria-label="Search users" />
          <button className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg">Search</button>
        </form>
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
                  <Pill key={b}>{BADGE_LABELS[b]}</Pill>
                ))}
                <span className="num ml-auto font-mono text-xs">{(u.total_xp ?? 0).toLocaleString('en-US')} XP</span>
              </div>
              <AdminUserTools userId={u.id} roles={u.roles} badges={u.badges} achievements={ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name }))} />
            </Card>
          ))}
          {users.length === 0 && <p className="text-sm text-muted">No users match.</p>}
        </div>
      </section>

      <section aria-labelledby="gen">
        <SectionTitle id="gen">Puzzle generator</SectionTitle>
        <PuzzleGenerator />
      </section>

      <section aria-labelledby="log">
        <SectionTitle id="log">Audit log</SectionTitle>
        <Card className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-subtle text-left text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">When (UTC)</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Target</th>
                <th className="px-3 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {log.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono">{new Date(l.created_at).toISOString().slice(0, 19).replace('T', ' ')}</td>
                  <td className="px-3 py-2">{l.actor ?? '—'}</td>
                  <td className="px-3 py-2 font-semibold">{l.action}</td>
                  <td className="px-3 py-2">{l.target ?? '—'}</td>
                  <td className="max-w-xs truncate px-3 py-2 font-mono text-muted">{JSON.stringify(l.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {log.length === 0 && <p className="p-4 text-sm text-muted">No admin actions yet.</p>}
        </Card>
      </section>
    </div>
  );
}

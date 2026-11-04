// One-off removal of EVERY current guest account (DECISIONS D-042).
// Needs migration 0006 (purge_expired_guests) on the target database.
//
//   npm run ops:purge-guests                      read-only report (default)
//   npm run ops:purge-guests -- --execute --expect=<N>
//
// The report counts the guest accounts and every record that would go with
// them. --execute runs in ONE transaction: it re-counts the guests and aborts
// unless the number equals --expect, marks them expired, runs the same
// purge_expired_guests() that the scheduled job uses, then checks that exactly
// N accounts were deleted, that the number of registered accounts did not
// change and that every admin and the developer account still exist. Any
// mismatch rolls everything back. Prints counts only, never handles or emails.
import postgres from 'postgres';

const DEVELOPER_HANDLE = 'mstark'; // src/config/site.ts DEVELOPER.handle
const execute = process.argv.includes('--execute');
const expectArg = process.argv.find((a) => a.startsWith('--expect='));
const expected = expectArg ? Number(expectArg.slice('--expect='.length)) : null;
if (execute && !Number.isInteger(expected)) throw new Error('--execute needs --expect=<number of guests from the report>');

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const sql = postgres(url, { prepare: false, max: 1, max_pipeline: 1, connect_timeout: 20, onnotice: () => {} });

// Same selection as purge_expired_guests(), minus the expiry condition.
const GUESTS = `select u.id from users u
  where u.is_guest and u.email is null and u.password_hash is null and u.handle like 'guest-%'
    and not exists (select 1 from user_roles r where r.user_id = u.id)`;

const PER_USER_TABLES = [
  'auth_sessions', 'password_resets', 'user_roles', 'user_badges', 'preferences', 'game_sessions', 'completions',
  'xp_ledger', 'user_stats', 'mastery', 'daily_activity', 'streaks', 'card_events', 'achievement_unlocks', 'notifications',
];

async function report(q) {
  const n = async (text) => Number((await q.unsafe(text))[0].n);
  const fn = await q.unsafe(`select 1 from pg_proc where proname = 'purge_expired_guests'`);
  if (!fn.length) throw new Error('purge_expired_guests() is missing: apply migration 0006 first (npm run db:migrate:env).');
  const out = {
    guestAccounts: await n(`select count(*) n from (${GUESTS}) g`),
    guestRowsNotMatchingSafetyFilter: await n(`select count(*) n from users where is_guest`) - (await n(`select count(*) n from (${GUESTS}) g`)),
    registeredAccounts: await n(`select count(*) n from users where not is_guest`),
    admins: await n(`select count(*) n from user_roles where role = 'admin'`),
    developerAccountExists: (await n(`select count(*) n from users where handle = '${DEVELOPER_HANDLE}' and not is_guest`)) === 1,
    records: {},
    unlimitedPuzzlesToDelete: await n(`select count(distinct p.id) n from puzzles p join game_sessions s on s.puzzle_id = p.id
      where p.mode = 'unlimited' and s.user_id in (${GUESTS})
        and not exists (select 1 from game_sessions o where o.puzzle_id = p.id and o.user_id not in (${GUESTS}))`),
    auditRowsKeptWithGuestReferenceCleared: await n(`select count(*) n from admin_audit_log where actor_id in (${GUESTS}) or target_user_id in (${GUESTS})`),
    dailyPuzzlesUntouched: await n(`select count(*) n from daily_puzzles`),
  };
  for (const t of PER_USER_TABLES) out.records[t] = await n(`select count(*) n from ${t} where user_id in (${GUESTS})`);
  return out;
}

try {
  const before = await report(sql);
  console.log(JSON.stringify(before, null, 2));
  if (!before.developerAccountExists) console.log(`note: no registered @${DEVELOPER_HANDLE} account exists yet (nothing to protect).`);
  if (!execute) {
    console.log(`\nRead-only. To delete these ${before.guestAccounts} guest accounts: npm run ops:purge-guests -- --execute --expect=${before.guestAccounts}`);
  } else {
    const result = await sql.begin(async (tx) => {
      const now = await report(tx);
      if (now.guestAccounts !== expected) throw new Error(`Aborted: ${now.guestAccounts} guests now, expected ${expected}. Nothing was deleted.`);
      await tx.unsafe(`update users set guest_expires_at = least(guest_expires_at, now()) where id in (${GUESTS})`);
      const [purged] = await tx.unsafe(`select * from purge_expired_guests('one-off', 1000000)`);
      const after = await report(tx);
      if (Number(purged.deleted_guests) !== expected) throw new Error(`Aborted: purge removed ${purged.deleted_guests}, expected ${expected}. Rolled back.`);
      if (after.registeredAccounts !== now.registeredAccounts) throw new Error('Aborted: registered account count changed. Rolled back.');
      if (after.admins !== now.admins || after.developerAccountExists !== now.developerAccountExists)
        throw new Error('Aborted: an admin or the developer account would be affected. Rolled back.');
      if (after.guestAccounts !== 0 || after.dailyPuzzlesUntouched !== now.dailyPuzzlesUntouched) throw new Error('Aborted: unexpected state after purge. Rolled back.');
      return { deletedGuests: Number(purged.deleted_guests), deletedUnlimitedPuzzles: Number(purged.deleted_puzzles), after };
    });
    console.log('\nCommitted.', JSON.stringify(result, null, 2));
  }
} finally {
  await sql.end();
}

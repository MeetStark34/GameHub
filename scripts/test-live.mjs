// Runs the opt-in live database tests (tests/live) against the configured
// DATABASE_URL. All work happens in a rolled-back transaction.
//   npm run test:live
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['vitest', 'run', 'tests/live'], { stdio: 'inherit', shell: true, env: { ...process.env, LIVE_DB: '1' } });
process.exit(r.status ?? 1);

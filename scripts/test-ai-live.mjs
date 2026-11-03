// Runs the opt-in AI live check (ai/tests/live-readonly.test.ts) against DATABASE_URL.
//   npm run test:ai:live
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['vitest', 'run', 'ai/tests/live-readonly.test.ts'], { stdio: 'inherit', shell: true, env: { ...process.env, LIVE_DB: '1' } });
process.exit(r.status ?? 1);

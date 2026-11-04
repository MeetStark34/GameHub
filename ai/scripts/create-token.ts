import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { createPostgresDb } from '@/lib/db';
import { createSession, verifyLogin } from '@/server/users';

/**
 * Signs in to YOUR GameHub account (the same check as the login page) and
 * stores a session token for the AI layer in .data/ai-live/session-token
 * (git-ignored). This is equivalent to logging in on the website: it creates
 * one row in auth_sessions and nothing else. Then:
 *
 *   npm run ai:ask -- --live "What is my rank?"
 *
 *   npm run ai:token -- you@example.com        (asks for the password)
 *
 * Alternative without this script: copy the value of the `gh_session`
 * cookie from your browser into GAMEHUB_SESSION_TOKEN.
 */
async function main() {
  const url = process.env.AI_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('Set DATABASE_URL in .env.local (or AI_DATABASE_URL).');
  const email = process.argv[2];
  if (!email) throw new Error('Usage: npm run ai:token -- you@example.com');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const password = process.env.GAMEHUB_PASSWORD ?? (await rl.question('GameHub password: '));
  rl.close();
  const db = await createPostgresDb(url);
  try {
    const user = await verifyLogin(db, email, password);
    if (!user) throw new Error('Wrong email or password.');
    const { token, expires } = await createSession(db, user.id, user.is_guest ? user.guest_expires_at : null);
    const file = path.join(process.cwd(), '.data', 'ai-live', 'session-token');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, token, { mode: 0o600 });
    console.log(`Token for @${user.handle} saved to ${path.relative(process.cwd(), file)} (expires ${expires.toISOString().slice(0, 10)}).`);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});

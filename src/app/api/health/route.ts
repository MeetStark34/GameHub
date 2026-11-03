import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * Deployment check: confirms the server can reach the database. The response
 * says only ok/unavailable; the reason goes to the server log (Vercel runtime logs).
 */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    await (await getDb()).query('select 1');
    return NextResponse.json({ ok: true, db: 'ok' }, { headers });
  } catch (err) {
    console.error('[health] database unavailable:', (err as Error).message);
    return NextResponse.json({ ok: false, db: 'unavailable' }, { status: 503, headers });
  }
}

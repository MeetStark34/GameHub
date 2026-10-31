import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { PlayError } from './play';
import { AuthError } from './users';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * CSRF defence for cookie-authenticated mutations: the request must come
 * from our own origin (browsers always send Origin on cross-site POSTs) and
 * carry a JSON body, which cross-site HTML forms cannot send.
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || !host) throw new HttpError(403, 'Missing origin.');
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Bad origin.');
  }
  if (originHost !== host) throw new HttpError(403, 'Cross-site request blocked.');
  const type = req.headers.get('content-type') ?? '';
  if (req.method !== 'GET' && req.method !== 'DELETE' && !type.includes('application/json'))
    throw new HttpError(415, 'Expected JSON.');
}

export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Request too large.');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response | unknown>;

/** Wraps a route handler with CSRF checks and a consistent JSON error shape. */
export function route<C = unknown>(fn: Handler<C>, opts: { mutation?: boolean } = { mutation: true }) {
  return async (req: Request, ctx: C) => {
    try {
      if (opts.mutation !== false && req.method !== 'GET') assertSameOrigin(req);
      const out = await fn(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (err) {
      if (err instanceof HttpError || err instanceof PlayError || err instanceof AuthError)
        return NextResponse.json({ error: err.message }, { status: err.status });
      if (err instanceof ZodError) return NextResponse.json({ error: 'Invalid request.', issues: err.issues.slice(0, 5) }, { status: 400 });
      console.error('[api]', err);
      return NextResponse.json({ error: 'Something went wrong on our side.' }, { status: 500 });
    }
  };
}

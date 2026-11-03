import 'server-only';

/** Best-effort client IP for rate limiting (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'local').trim().slice(0, 64);
}

/** Normalises an origin: adds https:// when the scheme is missing; null if unusable. */
export function normalizeOrigin(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).origin;
  } catch {
    return null;
  }
}

let warnedSiteUrl = false;

/**
 * Public origin. Always a valid absolute URL: `new URL(siteUrl())` runs in the
 * root layout's metadata on every page, so a malformed NEXT_PUBLIC_SITE_URL
 * (e.g. set on Vercel without "https://") must not crash rendering.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const origin = normalizeOrigin(configured) ?? normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ?? 'http://localhost:3000';
  if (configured?.trim() && !normalizeOrigin(configured) && !warnedSiteUrl) {
    warnedSiteUrl = true;
    console.warn(`[config] NEXT_PUBLIC_SITE_URL is not a valid URL; using ${origin}.`);
  }
  return origin;
}

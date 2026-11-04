import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files and must be loaded by Node, not bundled.
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  poweredByHeader: false,
  // Migrations are read at runtime (PGlite dev DB / optional DB_AUTO_MIGRATE).
  outputFileTracingIncludes: { '/**': ['./db/migrations/*.sql'] },
  // On Vercel the database is always Postgres via DATABASE_URL. PGlite (about
  // 20 MB of WASM and extensions) would otherwise be traced into every function
  // bundle, roughly 90% of its size, and slow down every cold start.
  ...(process.env.VERCEL ? { outputFileTracingExcludes: { '/**': ['./node_modules/@electric-sql/pglite/**'] } } : {}),
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;

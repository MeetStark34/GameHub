import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeDbUrl, isConnectionError, resilientQueryable, type Queryable } from '@/lib/db';
import { normalizeOrigin, siteUrl } from '@/server/request';

const connReset = () => Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });

describe('siteUrl (root layout metadataBase)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('accepts origins with or without a scheme and never returns an invalid URL', () => {
    expect(normalizeOrigin('https://gamehub.example/')).toBe('https://gamehub.example');
    expect(normalizeOrigin('gamehub.example')).toBe('https://gamehub.example');
    expect(normalizeOrigin('  ')).toBeNull();
    expect(normalizeOrigin('http://')).toBeNull();
  });

  it('falls back to the Vercel production URL when NEXT_PUBLIC_SITE_URL is unusable', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'gamehub.vercel.app');
    expect(siteUrl()).toBe('https://gamehub.vercel.app');
    expect(() => new URL(siteUrl())).not.toThrow();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'gamehub.example');
    expect(siteUrl()).toBe('https://gamehub.example');
  });
});

describe('database connection handling', () => {
  it('describes a connection string without credentials', () => {
    const d = describeDbUrl('postgresql://postgres.ref:s3cret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres');
    expect(d).toBe('host=aws-0-eu-west-1.pooler.supabase.com port=6543');
    expect(d).not.toContain('s3cret');
  });

  it('retries a read once after a dropped pooled connection', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const query = vi.fn().mockRejectedValueOnce(connReset()).mockResolvedValueOnce([{ n: 1 }]);
    const q = resilientQueryable({ query } as Queryable, 'test');
    expect(await q.query('select 1 n')).toEqual([{ n: 1 }]);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('never retries writes (a reset mid-write is ambiguous)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const query = vi.fn().mockRejectedValue(connReset());
    const q = resilientQueryable({ query } as Queryable, 'test');
    await expect(q.query('update user_stats set total_xp = total_xp + 10')).rejects.toThrow('ECONNRESET');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('does not retry SQL errors', async () => {
    const query = vi.fn().mockRejectedValue(Object.assign(new Error('syntax error'), { code: '42601' }));
    const q = resilientQueryable({ query } as Queryable, 'test');
    await expect(q.query('select nope(')).rejects.toThrow('syntax error');
    expect(query).toHaveBeenCalledTimes(1);
    expect(isConnectionError({ code: '42601' })).toBe(false);
  });
});

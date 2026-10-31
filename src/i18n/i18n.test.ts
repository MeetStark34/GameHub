import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '@/config/achievements';
import { LOCALES, localeFromAcceptLanguage } from './config';
import { MESSAGES } from './messages';
import { en } from './messages/en';
import { createTranslator } from './translate';

function leaves(obj: unknown, prefix = ''): Map<string, string | string[]> {
  const out = new Map<string, string | string[]>();
  if (typeof obj === 'string' || Array.isArray(obj)) {
    out.set(prefix, obj as string | string[]);
    return out;
  }
  for (const [k, v] of Object.entries(obj as object)) for (const [p, x] of leaves(v, prefix ? `${prefix}.${k}` : k)) out.set(p, x);
  return out;
}
const placeholders = (s: string | string[]) => [...new Set((Array.isArray(s) ? s.join(' ') : s).match(/\{\w+\}/g) ?? [])].sort();

const EN = leaves(en);
// pocketFull.body is intentionally unused (the server sends cardCreated.body).
const OPTIONAL = new Set(['events.pocketFull.body']);

describe('i18n dictionaries', () => {
  for (const { code } of LOCALES.filter((l) => l.code !== 'en')) {
    it(`${code}: translates every English key with the same placeholders`, () => {
      const dict = leaves(MESSAGES[code]);
      const missing = [...EN.keys()].filter((k) => !dict.has(k) && !OPTIONAL.has(k));
      expect(missing, `${code} missing keys`).toEqual([]);
      for (const [k, v] of dict) {
        if (k.startsWith('achievements.items.')) continue;
        expect(EN.has(k), `${code} has unknown key ${k}`).toBe(true);
        expect(placeholders(v), `${code} placeholders for ${k}`).toEqual(placeholders(EN.get(k)!));
        if (Array.isArray(EN.get(k))) expect((v as string[]).length, k).toBe((EN.get(k) as string[]).length);
      }
    });

    it(`${code}: translates every achievement`, () => {
      const items = (MESSAGES[code].achievements?.items ?? {}) as Record<string, { name: string; description: string }>;
      for (const a of ACHIEVEMENTS) {
        expect(items[a.id]?.name, `${code} ${a.id}`).toBeTruthy();
        expect(items[a.id]?.description, `${code} ${a.id}`).toBeTruthy();
      }
    });

    it(`${code}: is mostly not English (catches untranslated copy)`, () => {
      const dict = leaves(MESSAGES[code]);
      const same = [...dict].filter(([k, v]) => typeof v === 'string' && v === EN.get(k) && v.length > 12);
      expect(same.length / dict.size).toBeLessThan(0.05);
    });
  }

  it('every message key referenced in the source exists in English', () => {
    const src = path.resolve(__dirname, '..');
    const files: string[] = [];
    const walk = (d: string) => {
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, f.name);
        if (f.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f.name) && !f.name.endsWith('.test.ts') && !p.includes(`${path.sep}i18n${path.sep}messages`)) files.push(p);
      }
    };
    walk(src);
    const missing: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/\bmsg\('([\w.]+)'/g)) if (!EN.has(`gameMsg.${m[1]}`)) missing.push(`${file}: gameMsg.${m[1]}`);
      for (const m of text.matchAll(/'(errors\.\w+)'/g)) if (!EN.has(m[1])) missing.push(`${file}: ${m[1]}`);
      for (const m of text.matchAll(/\bt\('([a-zA-Z]+\.[\w.-]+)'/g)) if (!EN.has(m[1])) missing.push(`${file}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });
});

describe('translator', () => {
  it('interpolates, falls back to English, and resolves @key params', () => {
    const fr = createTranslator('fr', MESSAGES.fr);
    expect(fr.t('common.days', { count: 3 })).toBe('3 jours');
    expect(fr.t('events.streakMilestone.title', { count: 7, streak: '@streak.normal' })).toBe('Série normale : 7 jours !');
    expect(createTranslator('fr', {}).t('nav.dashboard')).toBe('Dashboard');
    expect(fr.t('does.not.exist')).toBe('does.not.exist');
    expect(fr.msg({ key: 'achievements.items.nope.name' }, 'Fallback')).toBe('Fallback');
    expect(fr.msg({ key: 'gameMsg.queens.count', params: { n: 8 } })).toBe('Placez exactement 8 couronnes.');
    expect(fr.list('games.queens.rules')).toHaveLength(3);
  });

  it('picks a supported browser language only as a fallback', () => {
    expect(localeFromAcceptLanguage('ru-RU,ru;q=0.9,en;q=0.8')).toBe('ru');
    expect(localeFromAcceptLanguage('de-DE,de;q=0.9,fr;q=0.5')).toBe('fr');
    expect(localeFromAcceptLanguage('de-DE')).toBe('en');
    expect(localeFromAcceptLanguage(null)).toBe('en');
  });
});

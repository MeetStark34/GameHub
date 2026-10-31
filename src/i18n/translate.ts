import type { Locale } from './config';
import { en, type Messages } from './messages/en';

/** Dotted paths to string (or string[]) leaves of the English dictionary. */
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string | readonly string[] ? `${P}${K}` : T[K] extends object ? Leaves<T[K], `${P}${K}.`> : never;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type Params = Record<string, string | number>;

/** A translatable message produced on the server (engines, errors, notifications). */
export interface Msg {
  key: string;
  params?: Params;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends string | readonly string[] ? T[K] | string | string[] : DeepPartial<T[K]> };
export type Translation = DeepPartial<Messages>;

function lookup(dict: unknown, key: string): unknown {
  let cur = dict;
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && part in (cur as object)) cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return cur;
}

/** Replaces {name} placeholders. A param value starting with '@' is itself translated via `resolve`. */
export const interpolate = (s: string, params?: Params, resolve?: (key: string) => string) =>
  params
    ? s.replace(/\{(\w+)\}/g, (m, k: string) => {
        if (!(k in params)) return m;
        const v = String(params[k]);
        return v.startsWith('@') && resolve ? resolve(v.slice(1)) : v;
      })
    : s;

export interface Translator {
  locale: Locale;
  /** Translated string; falls back to English, then to the key itself. */
  t: (key: MessageKey | (string & {}), params?: Params) => string;
  /** Translated string list (e.g. game rules). */
  list: (key: MessageKey | (string & {})) => string[];
  /** Renders a server message, with an English fallback text if the key is unknown. */
  msg: (m: Msg | string | null | undefined, fallback?: string) => string;
  /** Number formatting for the locale. */
  num: (n: number) => string;
}

const NUM_LOCALE: Record<Locale, string> = { en: 'en-US', fr: 'fr-FR', hi: 'en-IN', ru: 'ru-RU' };

export function createTranslator(locale: Locale, dict: Translation): Translator {
  const get = (key: string) => {
    const v = lookup(dict, key);
    return v !== undefined ? v : lookup(en, key);
  };
  const t: Translator['t'] = (key, params) => {
    const v = get(key);
    return typeof v === 'string' ? interpolate(v, params, (k) => t(k)) : key;
  };
  const list: Translator['list'] = (key) => {
    const v = get(key);
    return Array.isArray(v) ? (v as string[]) : [];
  };
  const fmt = new Intl.NumberFormat(NUM_LOCALE[locale]);
  return {
    locale,
    t,
    list,
    num: (n) => fmt.format(n),
    msg: (m, fallback) => {
      if (!m) return fallback ?? '';
      if (typeof m === 'string') {
        const v = get(m);
        return typeof v === 'string' ? v : m;
      }
      const v = get(m.key);
      return typeof v === 'string' ? interpolate(v, m.params, (k) => t(k)) : (fallback ?? m.key);
    },
  };
}

/** English rendering of a server message (logs, API fallback text). */
export const englishOf = (m: Msg) => createTranslator('en', en).msg(m);

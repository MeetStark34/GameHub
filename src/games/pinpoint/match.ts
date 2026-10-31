/**
 * Free-text category matching. A guess is accepted when, after
 * normalisation, it equals the label or an alias, or is within a small
 * edit distance of one (typos). Normalisation lowercases, strips accents,
 * punctuation, quotes, leading articles and filler like "types of", and
 * singularises simple plurals.
 */
const FILLER = /^(the|a|an|types? of|kinds? of|sorts? of|words? for|famous)\s+/;

export function normalizeAnswer(raw: string): string {
  let s = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[_"'’“”.,!?()]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let i = 0; i < 3; i++) s = s.replace(FILLER, '');
  return s
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.length > 3 && w.endsWith('es') && /(sh|ch|x|s)es$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ');
}

/** Optimal string alignment distance: a swapped pair of letters counts as one edit. */
export function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** Allowed typos grow with answer length: 0 under 5 chars, 1 under 10, else 2. */
const tolerance = (len: number) => (len < 5 ? 0 : len < 10 ? 1 : 2);

export function matchesAnswer(guess: string, accepted: readonly string[]): boolean {
  const g = normalizeAnswer(guess);
  if (!g) return false;
  return accepted.some((a) => {
    const n = normalizeAnswer(a);
    return n === g || editDistance(n, g) <= tolerance(n.length);
  });
}

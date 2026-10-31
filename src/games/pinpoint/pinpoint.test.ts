import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';
import { DIFFICULTIES } from '../types';
import { PINPOINT_CATEGORIES } from './categories';
import { PINPOINT_CONFIG } from './config';
import { pinpointEngine } from './engine';
import { matchesAnswer, normalizeAnswer } from './match';

describe('pinpoint content', () => {
  it('has a substantial, well-formed bank', () => {
    expect(PINPOINT_CATEGORIES.length).toBeGreaterThanOrEqual(170);
    expect(new Set(PINPOINT_CATEGORIES.map((c) => c.id)).size).toBe(PINPOINT_CATEGORIES.length);
    for (const c of PINPOINT_CATEGORIES) {
      expect(c.clues, c.id).toHaveLength(8);
      expect(new Set(c.clues.map((x) => x.toLowerCase())).size, c.id).toBe(8);
      expect(c.clues.every((x) => x.length > 0 && !x.includes('?')), c.id).toBe(true);
      expect(c.family, c.id).toBeTruthy();
    }
  });

  it('accepted answers never collide between categories', () => {
    const owner = new Map<string, string>();
    for (const c of PINPOINT_CATEGORIES)
      for (const a of [c.label, ...c.aliases]) {
        const n = normalizeAnswer(a);
        const prev = owner.get(n);
        expect(prev === undefined || prev === c.id, `"${a}" accepted by ${prev} and ${c.id}`).toBe(true);
        owner.set(n, c.id);
      }
  });

  it('every family has enough members for look-alike distractors', () => {
    const fam = new Map<string, number>();
    for (const c of PINPOINT_CATEGORIES) fam.set(c.family, (fam.get(c.family) ?? 0) + 1);
    for (const [f, n] of fam) expect(n, f).toBeGreaterThanOrEqual(5);
  });
});

describe('pinpoint matching', () => {
  it('accepts plurals, articles, case, punctuation and small typos', () => {
    const accept = ['Planets', 'planets in the solar system'];
    for (const g of ['planets', 'Planet', 'the planets', 'PLANETS!', 'plantes', 'types of planet']) expect(matchesAnswer(g, accept), g).toBe(true);
    for (const g of ['moons', 'plan', 'stars', '']) expect(matchesAnswer(g, accept), g).toBe(false);
    expect(matchesAnswer('words before ball', ['Words before "ball"'])).toBe(true);
    expect(matchesAnswer('Cafe', ['Café'])).toBe(true);
  });
});

describe('pinpoint engine', () => {
  for (const d of DIFFICULTIES) {
    it(`${d}: shows the configured clue window, hides the answer`, () => {
      const { puzzle } = pinpointEngine.generate(createRng(`pp-${d}`), d);
      const cat = PINPOINT_CATEGORIES.find((c) => c.id === puzzle.categoryId)!;
      expect(puzzle.clues).toEqual(cat.clues.slice(PINPOINT_CONFIG[d].clueStart, PINPOINT_CONFIG[d].clueStart + 5));
      expect(puzzle.options).toHaveLength(PINPOINT_CONFIG[d].options);
      const client = pinpointEngine.toClient(puzzle, pinpointEngine.initialState(puzzle));
      expect(client.clues).toHaveLength(1);
      expect(client.options).toBeNull();
      const json = JSON.stringify(client);
      expect(json).not.toContain(puzzle.categoryId);
      expect(json).not.toContain(puzzle.label);
    });
  }

  it('wrong guesses reveal clues; correct free text solves; first-clue solve is highlighted', () => {
    const { puzzle } = pinpointEngine.generate(createRng('flow'), 'normal');
    let s = pinpointEngine.initialState(puzzle);
    const r1 = pinpointEngine.act(puzzle, s, { type: 'guess', text: 'definitely not this zzz' });
    expect(r1.solved).toBe(false);
    s = r1.state;
    expect(s.revealed).toBe(2);
    const win = pinpointEngine.act(puzzle, s, { type: 'guess', text: puzzle.label.toLowerCase() });
    expect(win.solved).toBe(true);
    expect(pinpointEngine.toClient(puzzle, win.state).answer).toBe(puzzle.label);
    expect(pinpointEngine.highlights!(puzzle, win.state)).toEqual([]);
    const fresh = pinpointEngine.initialState(puzzle);
    const first = pinpointEngine.act(puzzle, fresh, { type: 'guess', text: puzzle.accept[1] ?? puzzle.label });
    expect(pinpointEngine.highlights!(puzzle, first.state)).toEqual(['pinpoint:one-clue']);
  });

  it('is always completable via the assist, which unlocks only after enough clues', () => {
    const { puzzle } = pinpointEngine.generate(createRng('assist'), 'expert');
    let s = pinpointEngine.initialState(puzzle);
    expect(pinpointEngine.act(puzzle, s, { type: 'assist' }).state.assist).toBe(false);
    for (let i = 0; i < 6; i++) s = pinpointEngine.act(puzzle, s, { type: 'guess', text: `nope ${i}` }).state;
    expect(s.revealed).toBe(5);
    s = pinpointEngine.act(puzzle, s, { type: 'assist' }).state;
    expect(pinpointEngine.toClient(puzzle, s).options).toHaveLength(8);
    for (const o of puzzle.options.filter((o) => o.id !== puzzle.categoryId)) s = pinpointEngine.act(puzzle, s, { type: 'pick', option: o.id }).state;
    expect(pinpointEngine.act(puzzle, s, { type: 'pick', option: puzzle.categoryId }).solved).toBe(true);
    expect(pinpointEngine.penalty(puzzle, s)).toBeLessThanOrEqual(0.85);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '@/lib/rng';
import { DIFFICULTIES } from '../types';
import { isWord } from '../words/dictionary';
import { oneLetterApart } from '../words/oneLetter';
import { CROSSCLIMB_CLUES } from './clues';
import { CROSSCLIMB_CONFIG } from './config';
import { crossclimbEngine } from './engine';
import { isLadder } from './logic';

describe('crossclimb', () => {
  it('clue bank: 4-letter dictionary words with non-empty clues that never contain the answer', () => {
    expect(CROSSCLIMB_CLUES.size).toBeGreaterThan(300);
    for (const [w, c] of CROSSCLIMB_CLUES) {
      expect(w, w).toMatch(/^[a-z]{4}$/);
      expect(isWord(w), `${w} not in dictionary`).toBe(true);
      expect(c.length, w).toBeGreaterThan(2);
      expect(c.toLowerCase().split(/\W+/), `${w} clue contains answer`).not.toContain(w);
    }
  });

  for (const difficulty of DIFFICULTIES) {
    it(`${difficulty}: valid, unambiguous, scrambled ladders`, () => {
      for (let i = 0; i < 6; i++) {
        const { puzzle, solution } = crossclimbEngine.generate(createRng(`cc-${difficulty}-${i}`), difficulty);
        const cfg = CROSSCLIMB_CONFIG[difficulty];
        expect(puzzle.middle).toHaveLength(cfg.rungs);
        expect(solution).toHaveLength(cfg.rungs + 2);
        expect(isLadder(solution)).toBe(true);
        expect(new Set(solution).size).toBe(solution.length);
        // No chords: only neighbours are one letter apart -> unique order.
        for (let a = 0; a < solution.length; a++)
          for (let b = a + 2; b < solution.length; b++) expect(oneLetterApart(solution[a], solution[b])).toBe(false);
        const ids = puzzle.middle.map((m) => m.id).join();
        expect(puzzle.shuffled.join()).not.toBe(ids);
        // Answers never leak to the client.
        const client = JSON.stringify(crossclimbEngine.toClient(puzzle, crossclimbEngine.initialState(puzzle)));
        for (const w of solution) expect(client).not.toContain(`"${w}"`);
      }
    });
  }

  it('full flow: wrong words, wrong order, reversed ladder accepted, ends solve', () => {
    const { puzzle } = crossclimbEngine.generate(createRng('flow'), 'hard');
    let s = crossclimbEngine.initialState(puzzle);
    const rows = puzzle.middle.map((m) => ({ id: m.id, word: m.word }));

    const bad = crossclimbEngine.act(puzzle, s, { type: 'middle', rows: rows.map((r, i) => (i === 0 ? { ...r, word: 'zzzz' } : r)) });
    expect(bad.solved).toBe(false);
    expect((bad.feedback as { wrong: string[] }).wrong).toEqual([rows[0].id]);
    s = bad.state;

    const scrambled = [rows[1], rows[0], ...rows.slice(2)];
    const order = crossclimbEngine.act(puzzle, s, { type: 'middle', rows: scrambled });
    expect((order.feedback as { orderWrong: boolean }).orderWrong).toBe(true);
    s = order.state;

    const rev = crossclimbEngine.act(puzzle, s, { type: 'middle', rows: [...rows].reverse() });
    expect(rev.state.phase).toBe('ends');
    s = rev.state;
    const client = crossclimbEngine.toClient(puzzle, s);
    expect(client.ends?.topClue).toBe(puzzle.bottom.clue); // reversed orientation
    expect(crossclimbEngine.act(puzzle, s, { type: 'ends', top: puzzle.top.word, bottom: puzzle.bottom.word }).solved).toBe(false);
    const win = crossclimbEngine.act(puzzle, s, { type: 'ends', top: puzzle.bottom.word.toUpperCase(), bottom: puzzle.top.word });
    expect(win.solved).toBe(true);
    expect(crossclimbEngine.penalty(puzzle, win.state)).toBeCloseTo(0.2);
  });
});

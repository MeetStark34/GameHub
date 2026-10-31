// Server-side word lists (SCOWL-derived, see THIRD_PARTY_NOTICES.md).
// `answers` are common words used to build puzzles; `dictionary` is the much
// larger list of words accepted from players.
import answers3 from './data/answers-3.json';
import answers4 from './data/answers-4.json';
import answers5 from './data/answers-5.json';
import answers6 from './data/answers-6.json';
import answers7 from './data/answers-7.json';
import dict3 from './data/dictionary-3.json';
import dict4 from './data/dictionary-4.json';
import dict5 from './data/dictionary-5.json';
import dict6 from './data/dictionary-6.json';
import dict7 from './data/dictionary-7.json';

export const WORD_LENGTHS = [3, 4, 5, 6, 7] as const;
export type WordLength = (typeof WORD_LENGTHS)[number];

const ANSWERS: Record<WordLength, readonly string[]> = { 3: answers3, 4: answers4, 5: answers5, 6: answers6, 7: answers7 };
const DICT: Record<WordLength, readonly string[]> = { 3: dict3, 4: dict4, 5: dict5, 6: dict6, 7: dict7 };

const dictSets = new Map<number, Set<string>>();

export function answerWords(length: WordLength): readonly string[] {
  return ANSWERS[length];
}

export function isWord(word: string): boolean {
  const len = word.length as WordLength;
  if (!DICT[len]) return false;
  let set = dictSets.get(len);
  if (!set) {
    // Answers are always valid guesses even if missing from the big list.
    set = new Set([...DICT[len], ...ANSWERS[len]]);
    dictSets.set(len, set);
  }
  return set.has(word);
}

export const normalizeWord = (raw: string) => raw.trim().toLowerCase();

/** Words differing in exactly one position (same length). */
export function oneLetterApart(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++diff > 1) return false;
  return diff === 1;
}

type Graph = Map<string, string[]>;
const graphs = new Map<string, Graph>();

/** One-letter-change adjacency for a word list, cached per list. */
export function ladderGraph(kind: 'answers' | 'dictionary', length: WordLength): Graph {
  const key = `${kind}-${length}`;
  const cached = graphs.get(key);
  if (cached) return cached;
  const words = kind === 'answers' ? ANSWERS[length] : [...new Set([...DICT[length], ...ANSWERS[length]])];
  const buckets = new Map<string, string[]>();
  for (const w of words)
    for (let i = 0; i < length; i++) {
      const pattern = w.slice(0, i) + '_' + w.slice(i + 1);
      const list = buckets.get(pattern);
      if (list) list.push(w);
      else buckets.set(pattern, [w]);
    }
  const graph: Graph = new Map();
  for (const w of words) {
    const out = new Set<string>();
    for (let i = 0; i < length; i++)
      for (const x of buckets.get(w.slice(0, i) + '_' + w.slice(i + 1)) ?? []) if (x !== w) out.add(x);
    graph.set(w, [...out].sort());
  }
  graphs.set(key, graph);
  return graph;
}

/** BFS distances from `start` over a ladder graph. */
export function ladderDistances(graph: Graph, start: string): Map<string, { dist: number; prev: string[] }> {
  const info = new Map<string, { dist: number; prev: string[] }>([[start, { dist: 0, prev: [] }]]);
  let frontier = [start];
  while (frontier.length) {
    const next: string[] = [];
    for (const w of frontier) {
      const d = info.get(w)!.dist;
      for (const x of graph.get(w) ?? []) {
        const seen = info.get(x);
        if (!seen) {
          info.set(x, { dist: d + 1, prev: [w] });
          next.push(x);
        } else if (seen.dist === d + 1) seen.prev.push(w);
      }
    }
    frontier = next;
  }
  return info;
}

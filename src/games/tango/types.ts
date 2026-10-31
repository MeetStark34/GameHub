/** 0 = Sun, 1 = Moon in the GameHub art; -1 = empty. */
export type TangoValue = 0 | 1;

export interface TangoEdge {
  /** Top/left cell. */
  a: [number, number];
  /** Bottom/right neighbour of `a`. */
  b: [number, number];
  kind: 'same' | 'diff';
}

export interface TangoPuzzle {
  size: number;
  /** givens[r][c] = 0 | 1 | -1 (empty). */
  givens: number[][];
  edges: TangoEdge[];
}

export type TangoSolution = TangoValue[][];

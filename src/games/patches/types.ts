export type PatchShape = 'square' | 'wide' | 'tall' | 'any';

export interface PatchClue {
  r: number;
  c: number;
  area: number;
  /** Shape hint shown to the player; 'any' means no hint. */
  shape: PatchShape;
}

export interface PatchRect {
  r: number;
  c: number;
  h: number;
  w: number;
}

export interface PatchesPuzzle {
  rows: number;
  cols: number;
  clues: PatchClue[];
}

export type PatchesSolution = PatchRect[];

/**
 * Pinpoint category bank: original GameHub content, grouped by family.
 * To add categories, append rows to a family file (or create a new file and
 * add it below). Each category needs a unique id, a label, accepted aliases
 * and exactly 8 clues ordered from most ambiguous to most obvious.
 * Keep ids stable: Daily history fingerprints use them.
 */
import { ARTS, MUSIC, WORDS } from './culture';
import { GAMES, SPORT, THINGS } from './everyday';
import { ANIMALS, NATURE, SPACE } from './nature';
import type { PinpointCategory } from './types';
import { FOOD, GEOGRAPHY, SCIENCE } from './world';

export type { PinpointCategory } from './types';

export const PINPOINT_CATEGORIES: PinpointCategory[] = [
  ...SPACE,
  ...ANIMALS,
  ...NATURE,
  ...MUSIC,
  ...ARTS,
  ...WORDS,
  ...FOOD,
  ...GEOGRAPHY,
  ...SCIENCE,
  ...SPORT,
  ...GAMES,
  ...THINGS,
];

export type GameId =
  | 'patches'
  | 'sudoku'
  | 'zip'
  | 'werd'
  | 'pinpoint'
  | 'crossclimb'
  | 'tango'
  | 'queens';

export type GameDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export interface GameDefinition {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  threeLinePunch: [string, string, string];
  icon: string; // Lucide icon key name
  accentColor: string; // Hex for game badge & border
  secondaryColor: string;
  order: number;
  instructions: string;
  difficulties: GameDifficulty[];
  defaultDifficulty: GameDifficulty;
  avgDurationSec: number;
}

export const GAMES: Record<GameId, GameDefinition> = {
  patches: {
    id: 'patches',
    name: 'Patches',
    tagline: 'Quilt the grid with perfect geometric harmony',
    description: 'Assemble distinct patterned polyomino patches to completely tile the board without overlaps.',
    threeLinePunch: [
      'Shape the board.',
      'Find the pattern.',
      'Master the grid.',
    ],
    icon: 'Grid3X3',
    accentColor: '#38bdf8', // Sky
    secondaryColor: '#0284c7',
    order: 1,
    instructions: 'Place all provided patch pieces onto the grid so that no two overlap and the entire area is covered.',
    difficulties: ['easy', 'normal', 'hard', 'expert'],
    defaultDifficulty: 'normal',
    avgDurationSec: 150,
  },
  sudoku: {
    id: 'sudoku',
    name: 'Mini Sudoku',
    tagline: 'Concentrated pure logical deduction',
    description: 'A rapid 6x6 numerical matrix challenge with row, column, and box constraints.',
    threeLinePunch: [
      'Deduce the digits.',
      'Break the gridlock.',
      'Zero guesswork.',
    ],
    icon: 'Hash',
    accentColor: '#fbbf24', // Amber
    secondaryColor: '#d97706',
    order: 2,
    instructions: 'Fill the 6x6 grid with digits 1 through 6 such that every row, column, and 2x3 box contains each digit exactly once.',
    difficulties: ['easy', 'normal', 'hard', 'expert'],
    defaultDifficulty: 'normal',
    avgDurationSec: 180,
  },
  zip: {
    id: 'zip',
    name: 'Zip',
    tagline: 'Connect the pathway through numbers in sequence',
    description: 'Trace a single unbroken circuit linking numbers in rising numerical order from 1 to the finish.',
    threeLinePunch: [
      'Trace the path.',
      'Connect the flow.',
      'Zip to the end.',
    ],
    icon: 'Route',
    accentColor: '#34d399', // Emerald
    secondaryColor: '#059669',
    order: 3,
    instructions: 'Connect the sequential numbered nodes through adjacent cells without crossing or leaving gaps.',
    difficulties: ['easy', 'normal', 'hard', 'expert'],
    defaultDifficulty: 'normal',
    avgDurationSec: 120,
  },
  werd: {
    id: 'werd',
    name: 'Werd',
    tagline: 'Crack the hidden word in six tries or fewer',
    description: 'GameHub’s crisp dictionary challenge with colored positional hints.',
    threeLinePunch: [
      'Choose your letters.',
      'Interpret the clues.',
      'Solve the word.',
    ],
    icon: 'FileText',
    accentColor: '#a78bfa', // Purple
    secondaryColor: '#7c3aed',
    order: 4,
    instructions: 'Guess the hidden 5-letter word. Green means correct spot, yellow means in word but wrong spot, gray means absent.',
    difficulties: ['easy', 'normal', 'hard', 'expert'],
    defaultDifficulty: 'normal',
    avgDurationSec: 90,
  },
  pinpoint: {
    id: 'pinpoint',
    name: 'Pinpoint',
    tagline: 'Spot the overarching connection among clues',
    description: 'Given four enigmatic clue words, pinpoint the single uniting theme that ties them together.',
    threeLinePunch: [
      'Read the clues.',
      'Isolate the link.',
      'Pinpoint the concept.',
    ],
    icon: 'Crosshair',
    accentColor: '#f43f5e', // Rose
    secondaryColor: '#e11d48',
    order: 5,
    instructions: 'Examine the clues revealed one by one and guess the category or secret link connecting all four.',
    difficulties: ['easy', 'normal', 'hard', 'expert'],
    defaultDifficulty: 'normal',
    avgDurationSec: 60,
  },
  crossclimb: {
    id: 'crossclimb',
    name: 'Crossclimb',
    tagline: 'Ascend the trivia ladder one letter change at a time',
    description: 'Solve trivia word clues and arrange the ladder so that adjacent words differ by exactly one letter.',
    threeLinePunch: [
      'Answer the clues.',
      'Morph the letters.',
      'Climb to the top.',
    ],
    icon: 'TrendingUp',
    accentColor: '#f97316', // Orange
    secondaryColor: '#ea580c',
    order: 6,
    instructions: 'Answer the crossword clues and arrange the words into a valid ladder where consecutive rungs differ by one character.',
    difficulties: ['easy', 'normal', 'hard', 'expert'],
    defaultDifficulty: 'normal',
    avgDurationSec: 210,
  },
  tango: {
    id: 'tango',
    name: 'Tango',
    tagline: 'Balance suns and moons in binary perfection',
    description: 'A 6x6 binary deduction puzzle with balance rules and no three consecutive identical symbols.',
    threeLinePunch: [
      'Sun and Moon.',
      'Equal count.',
      'Never three in a row.',
    ],
    icon: 'SunMoon',
    accentColor: '#38bdf8', // Cyan / Light Blue
    secondaryColor: '#0ea5e9',
    order: 7,
    instructions: 'Fill each row and column with equal numbers of suns and moons. No three of the same symbol can be adjacent horizontally or vertically.',
    difficulties: ['easy', 'normal', 'hard', 'expert'],
    defaultDifficulty: 'normal',
    avgDurationSec: 150,
  },
  queens: {
    id: 'queens',
    name: 'Queens',
    tagline: 'Place crowns with flawless spatial strategy',
    description: 'Position one royal queen in each row, column, and colored region without adjacent touches.',
    threeLinePunch: [
      'Claim your realm.',
      'Protect the crowns.',
      'Rule the board.',
    ],
    icon: 'Crown',
    accentColor: '#eab308', // Gold
    secondaryColor: '#ca8a04',
    order: 8,
    instructions: 'Place exactly one Queen in every row, every column, and each color-coded territory. Queens may never touch—even diagonally.',
    difficulties: ['easy', 'normal', 'hard', 'expert'],
    defaultDifficulty: 'normal',
    avgDurationSec: 240,
  },
};

export const GAME_LIST: GameDefinition[] = Object.values(GAMES).sort((a, b) => a.order - b.order);

export interface PinpointCategory {
  id: string;
  /** Canonical answer shown after solving. */
  label: string;
  family: string;
  /** Other accepted answers (normalised when matched; label is always accepted). */
  aliases: string[];
  /** Exactly 8 clues, most ambiguous first. */
  clues: string[];
}

/**
 * Compact row format for content files:
 *   [id, label, 'alias; alias', 'clue, clue, ... (8, ambiguous -> obvious)']
 */
export type Row = [id: string, label: string, aliases: string, clues: string];

export const defineFamily = (family: string, rows: Row[]): PinpointCategory[] =>
  rows.map(([id, label, aliases, clues]) => ({
    id,
    label,
    family,
    aliases: aliases
      .split(';')
      .map((a) => a.trim())
      .filter(Boolean),
    clues: clues.split(',').map((c) => c.trim()),
  }));

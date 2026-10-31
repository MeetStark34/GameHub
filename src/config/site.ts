/**
 * Site-wide identity settings. The footer credit and the developer
 * showcase both read from here; change the handle once and every link
 * follows.
 */
export const DEVELOPER = {
  /** Handle of the developer's GameHub account (lowercase). */
  handle: 'mstark',
  /** Name shown on the profile (rendered uppercase: MR. STARK). */
  displayName: 'Mr. Stark',
  /** Name used in the footer credit. */
  creditName: 'MStark',
  /**
   * Maximum-progression showcase applied from /admin (developer account
   * only). Values are real data written through the normal tables and the
   * XP ledger, so ranks are still derived from XP as for everyone else.
   * Set targetXp to 60_000 to show Elite instead of Legend.
   */
  showcase: {
    targetXp: 1_000_000,
    normalStreak: 365,
    truePlayerStreak: 240,
    truePlayerDays: 300,
    gamesPerGame: 320,
    masteryXpPerGame: 60_000,
  },
} as const;

/** Public profile URL of the developer account (used by the footer credit). */
export const DEVELOPER_PROFILE_PATH = `/u/${DEVELOPER.handle}`;

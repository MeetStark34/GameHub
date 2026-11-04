import 'server-only';

/**
 * A gameplay error with an HTTP status; the message is an i18n key
 * (errors.*). Kept apart from ./play so modules that only need the type
 * (the API route wrapper, streaks, developer tools) do not load the game
 * engines and word lists.
 */
export class PlayError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

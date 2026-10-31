# Progression

Config: `src/config/economy.ts`, `ranks.ts`, `achievements.ts`. Pure rules:
`src/lib/progression/`. Persistence: `src/server/progress.ts` and
`src/server/play.ts` (`processCompletion`).

## XP (all server-side, ledger-backed)

| Source | Amount | Idempotency key |
|---|---|---|
| Game completion | base (E20/N35/H55/X80) × game multiplier × 1.3 if Daily, + up to 25% performance + 10 perfect | `completion:<session>` |
| Unlimited taper | ×0.5 after 40 Unlimited games that day, ×0.25 after 80, min 3 | (part of the completion) |
| First Daily game of a UTC day | 15 | `daily-first:<date>` |
| Daily Set complete (8/8) | 150 | `daily-set:<date>` |
| Streak milestones | normal 3/7/14/30/60/100/200/365 days; True Player ≈ 2× | `streak:<kind>:<date>` |
| Punch | 25 | `<punch key>:xp` |
| Card created | 100 | `<punch key>:card:xp` |
| Card converted (pocket full) | 400 | `<punch key>:convert:xp` |
| Achievement | per definition | `achievement:<id>` |

`user_stats.total_xp` is only changed by `awardXp`, which inserts into
`xp_ledger` first (unique `(user_id, idempotency_key)`).

## Ranks

`rankFromXp(xp, ladder)`: ten ranks × tiers I–III. A rank's span is split in
thirds. Legend tiers are spaced by `finalTierStep`. Level = 1..30. Ranks are
never stored, so changing thresholds re-ranks everyone and leaves XP intact.

Mastery: per-game XP = the completion's game XP before taper. Same names on
`MASTERY_RANKS` (Legend at 37,500). Overall mastery = rank of the average.

## Streaks

`recordQualifyingDay`, `viewStreak` and `repairStreak` in `streaks.ts`. Normal
qualifies on the first Daily completion of a date; True Player on the eighth.
Status is derived from `last_date` against today (UTC): active, at-risk
(qualified yesterday, not yet today), or broken.

## Punches and Gold Repair Cards

- Source A: the 20th completion (any mode) in a UTC day gives one punch
  (`punch:volume:<date>`).
- Source B: every 2nd lifetime True Player day (`punch:daily-sets:<n>`).
- 10 punches give a card if fewer than 3 are held; otherwise the card
  converts to 400 XP with "Pocket full" notifications.
- Spending: `POST /api/streaks/repair {kind, requestId}`. The player chooses
  the streak. One card bridges one break whose first missed day is ≤ 7 days
  ago. Every event is in `card_events` with a unique key.

## Achievements

47 definitions across 7 categories. Criterion types: `stat`,
`difficultyCount`, `gameCount`, `masteryRank` (game/any/all), `completion`
(game/mode/difficulty/duration/par fraction/perfect/highlight), `dailySet`
(UTC hour window, non-canonical order). Hidden achievements show "???" until
unlocked. Evaluated after every completion, repair and admin XP grant, in two
passes so achievement XP can unlock XP achievements.

## Notifications

Stored in `notifications` for level-up, achievement, punch, card created,
pocket full, card converted, True Player, streak milestone, streak repaired
and mastery up. Completion responses also return these events, which the
client shows as toasts (achievements get the gold popup). "Streak at risk"
is a client toast shown at most once per UTC day from dashboard state.

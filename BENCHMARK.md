# Benchmark (course Block 9)

Can a local 4B model answer factual questions about a GameHub player
correctly when it has to get the facts through our MCP server? How does that
compare with the same model without tools, and with a smaller model?

## Method

- **Data:** the demo player from `npm run ai:seed`. That is 57 real games played
  through GameHub's own pipeline over 7 days, including a partial Daily Set
  today. All runs below used the same seeded database (seeded 2026-11-03 UTC).
- **Tasks:** 12 questions with known answers (`ai/benchmark/tasks.ts`).
- **Ground truth:** computed **independently of the MCP tools**, with separate SQL
  directly on the tables (for example True Player days = days with 8 distinct
  daily completions, *not* `user_stats.true_player_days`). A unit test
  (`ai/tests/analyze-benchmark.test.ts`) checks that the two independent paths,
  ground-truth SQL and MCP tools, agree.
- **Runs:** each task 3 times, in a fresh conversation each time (memory off, so
  runs are independent), Ollama seed = run number, temperature 0.7, thinking off.
- **Grading** (automatic, strict):
  - numbers: the **first** number that answers the question must be the expected
    value (dates and numbers repeated from the question are skipped);
  - games: the **first** game named must be the expected one (ties are all accepted);
  - ranks: the exact label (`Pro II` does not count for `Pro I`).
- **Hardware:** laptop, NVIDIA RTX 3050 Laptop GPU (6 GB), Windows 11, Ollama 0.40.12.

## Tasks

| Id | Question | Expected (this dataset) | Typical tool |
|---|---|---|---|
| xp | What is my current XP? | 6604 | get_player_stats |
| rank | What is my current player rank? | Amateur III | get_player_stats |
| best_streak | What is the longest daily streak I have ever had? | 7 | get_streaks |
| current_streak | How many days long is my current streak? | 7 | get_streaks |
| true_player_days | On how many days have I completed all 8 games of the Daily Set? | 6 | get_player_stats |
| total_games | How many games have I completed in total? | 57 | get_player_stats |
| achievements | How many achievements have I unlocked? | 11 | get_achievements |
| daily_done | How many of today's Daily Set games have I completed? | 3 | get_daily_set_status |
| most_played | Which game have I played the most? | Queens | get_game_performance / analyze |
| fastest_avg | Which game do I finish fastest on average, in seconds? | Zip | get_game_performance |
| fastest_single | In which game did I set my single fastest completion time? | Zip | get_game_performance |
| lowest_score | Which game has my lowest average score? | Pinpoint | get_game_performance / analyze |

The expected values are recomputed on every benchmark run. Re-seeding on another
day can change them, for example today's Daily Set count.

## Results (2026-11-03)

| Configuration | Accuracy | Per run | Mean ± SD (pp) | Failures | Latency (s) | Prompt tokens / question | Expected tool used |
|---|---|---|---|---|---|---|---|
| **Qwen3.5-4B Q4_K_M + MCP tools** | **100% (36/36)** | 100 / 100 / 100 | 100 ± 0 | 0 | 1.6 ± 0.4 | 2686 | 86.1% |
| Qwen3.5-4B Q4_K_M, no tools (baseline) | 0% (0/36) | 0 / 0 / 0 | 0 ± 0 | 36 | 1.0 ± 0.1 | 149 | – |
| Qwen3.5-2B + MCP tools | 97.2% (35/36) | 100 / 91.7 / 100 | 97.2 ± 4.8 | 1 | 1.4 ± 1.4 | 2629 | 75.0% |

Full per-task tables and every answer are in `ai/benchmark/results/*.md` and
`*.json`. Every trace is in `ai/traces/benchmark/<configuration>/`.

Latency is the full time per question, measured on every attempt; the benchmark
does not warm the model up first. Qwen3.5-4B was already loaded in Ollama when
its runs started (the memory demo ran just before), so its figures contain no
load time: the first question took 2.6 s. For Qwen3.5-2B the first question
took 9.5 s, most of it in the first model call (9.0 s), which is most likely the
2B model being loaded. That attempt is included in its 1.4 ± 1.4 s and accounts
for much of the spread.

### What the numbers say

- **Tools are the whole difference.** Without tools, the same 4B model got
  nothing right. To its credit it did not invent numbers either: all 36 answers
  were refusals ("I don't have access to your personal data").
  With the MCP server it answered all 36 correctly.
- **Tool calls cost tokens.** The tool definitions and results make each
  question about 18× more expensive in prompt tokens (2686 vs 149). Speed is
  still fine (1.6 s on a laptop GPU).
- **The smaller model is mostly right but less reliable.** The 2B made one
  wrong answer, picked the expected tool less often (75% vs 86%), and its
  latency varied more.
- 3 runs × 12 tasks is a small sample. With 36/36 the honest claim is
  "no failures observed in 36 attempts", not "always correct".

## Failure analysis

### 1. Qwen3.5-2B invented a number (graded failure)

Trace: `ai/traces/evidence/failure-2b-true-player-days.json` (task `true_player_days`, run 2).

```text
Q:     On how many days have I completed all 8 games of the Daily Set?
Qwen:  -> get_streaks {}
MCP:   {"normal":{"current":7,"best":7,...},"truePlayer":{"current":6,"best":6,"status":"at-risk",...}}
Qwen:  "Based on your streaks, you have completed all 8 games of the Daily Set on 2 days.
        Your "truePlayer" streak is currently at 6 days ..."
Truth: 6
```

There were two mistakes:

1. **Tool choice.** The exact figure is `truePlayerDays` in `get_player_stats`.
   The model picked `get_streaks`, which only gives the True Player *streak*.
   The streak happens to equal the total here (6) but would not in general.
2. **Fabrication.** "2" appears nowhere in the tool result. The model quoted the
   other numbers (6, 7) correctly in the same answer. So even with the right
   data in its context, a small model can produce a number that is not in it.

In the other two runs, and in all three 4B runs, the answer was right.
This is exactly why the answers are checked against independent ground truth
rather than trusted.

### 2. Qwen3.5-4B: correct main answer, wrong secondary number (not caught by the grader)

Trace: `ai/traces/evidence/ungraded-error-4b-xp-to-next-rank.json` (task `xp`, run 1).

```text
MCP:   {"xp":6604,"rank":"Amateur III","nextRank":"Pro I","xpToNextRank":396,...}
Qwen:  "Your current XP is 6,604. You're at Amateur III level 9, with 3,960 XP needed to reach Pro I."
```

The XP (6,604) is right, so the task is graded **PASS**. But "3,960" is wrong:
the tool said 396, and the model added a zero. In runs 2 and 3 the same model
said 396 correctly. The grader only checks the value that was asked for, so
this error does not show up in the accuracy figure. That limit of the
benchmark is real and is stated here. A stricter grader could check *every*
number in an answer against the tool results.

### 3. Without memory the model guessed (memory demo, not a benchmark task)

In the memory control session (memory off), Qwen was asked for the favourite
game it had been told earlier. It called `get_player_profile` and
`analyze_player_performance` and answered "Queens", the most played game. The
correct answer was Tango. See [EVIDENCE.md](EVIDENCE.md), Block 5.

## Reproduce

```bash
npm run ai:seed                                   # same data shape (values depend on the seed date)
npm run ai:benchmark                              # 4B + MCP, 3 runs
npm run ai:benchmark -- --no-tools                # baseline
npm run ai:benchmark -- --model qwen3.5:2b        # needs: ollama pull qwen3.5:2b
npm run ai:benchmark -- --runs 1 --tasks xp,rank  # quick check
```

Grading and ground-truth correctness are unit-tested in `ai/tests/analyze-benchmark.test.ts`.

import type { Queryable } from '@/lib/db';

/**
 * SECURITY RULE (course Block 3): the AI can READ progression (XP, rank,
 * streaks, achievements, statistics) but can NEVER change it. XP only moves
 * through GameHub's validated progression pipeline (`awardXp` in
 * src/server/progress.ts, reached only by finishing a game or by an audited
 * admin action in the web app).
 *
 * The rule is enforced in code, in three independent layers. A prompt can
 * change what the model *asks for*, but none of these layers read the prompt:
 *
 *  1. Tool allowlist (here): the MCP server only executes tools it declares,
 *     all of them read-only. Any other name (award_xp, set_xp, ...) is refused
 *     with POLICY_XP_READ_ONLY / POLICY_UNKNOWN_TOOL, and strict input schemas
 *     reject smuggled fields such as `{ "xp": 999999 }`.
 *  2. SQL guard (here): tool handlers get a Queryable that refuses every
 *     statement that is not a plain SELECT, and any statement that mentions a
 *     write keyword or a row lock.
 *  3. Database (ai/lib/db.ts): every tool call runs in a Postgres
 *     `READ ONLY` transaction on a connection opened with
 *     default_transaction_read_only = on, so Postgres itself rejects writes.
 */

export class PolicyViolation extends Error {
  constructor(
    public readonly code: 'POLICY_XP_READ_ONLY' | 'POLICY_UNKNOWN_TOOL' | 'POLICY_WRITE_SQL' | 'POLICY_INVALID_INPUT' | 'POLICY_FORBIDDEN',
    message: string,
  ) {
    super(message);
    this.name = 'PolicyViolation';
  }
}

/** Names a model might try in order to change progression. Matched case-insensitively. */
const PROGRESSION_MUTATION = /(award|grant|give|add|set|update|change|modify|remove|subtract|reset|increase|decrease|boost|edit|write|repair|unlock)[_\- ]?.*(xp|exp|experience|rank|level|streak|achievement|mastery|score|card|punch)|(xp|rank|level|streak|achievement)[_\- ]?.*(award|grant|set|update|add|remove|reset|edit|unlock)/i;

/** Refuses any tool that is not on the server's read-only allowlist. */
export function assertToolAllowed(name: string, allowlist: ReadonlySet<string>): void {
  if (allowlist.has(name)) return;
  if (PROGRESSION_MUTATION.test(name))
    throw new PolicyViolation(
      'POLICY_XP_READ_ONLY',
      `Refused "${name}": the AI has read-only access to XP, ranks, streaks and achievements. Progression changes only through GameHub's validated game-completion pipeline.`,
    );
  throw new PolicyViolation('POLICY_UNKNOWN_TOOL', `Refused "${name}": not a GameHub MCP tool. Available: ${[...allowlist].join(', ')}.`);
}

const WRITE_SQL = /\b(insert|update|delete|merge|upsert|alter|drop|truncate|create|grant|revoke|comment|copy|vacuum|reindex|cluster|lock|call|do|execute|prepare|listen|notify|refresh|security|set_config|pg_advisory\w*|nextval|setval)\b/i;
const ROW_LOCK = /\bfor\s+(no\s+key\s+)?(update|share)\b/i;

/** Throws unless `sql` is a single read-only SELECT (or WITH ... SELECT). */
export function assertReadOnlySql(sql: string): void {
  const text = sql.replace(/--[^\n]*/g, ' ').trim();
  if (!/^(select|with)\b/i.test(text)) throw new PolicyViolation('POLICY_WRITE_SQL', 'Only SELECT statements are allowed from the AI layer.');
  if (text.replace(/;\s*$/, '').includes(';')) throw new PolicyViolation('POLICY_WRITE_SQL', 'Multiple statements are not allowed from the AI layer.');
  // Strip string literals first so a value like 'update' cannot trip the check.
  const code = text.replace(/'(?:[^']|'')*'/g, "''");
  if (WRITE_SQL.test(code) || ROW_LOCK.test(code)) throw new PolicyViolation('POLICY_WRITE_SQL', 'Write or locking SQL is not allowed from the AI layer.');
}

/** Wraps a Queryable so every statement must pass `assertReadOnlySql`. */
export function readOnlyQueryable(q: Queryable): Queryable {
  return {
    query: async <T,>(text: string, params?: unknown[]) => {
      assertReadOnlySql(text);
      return q.query<T>(text, params);
    },
  };
}

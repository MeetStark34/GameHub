# Contributing to GameHub

## 1. Architectural Guardrails
1. **Never hardcode XP numbers:** Always import from `/src/config/economy.ts` or `/src/config/levels.ts`.
2. **Never expose administrative keys:** `SUPABASE_SERVICE_ROLE_KEY` must never be referenced in browser components or public client bundles.
3. **UTC Authoritative:** All daily resets, streaks, and timestamps must use UTC time.
4. **Follow Decimal Phase Protocol:** Keep `HANDOFF.md` updated after every phase or session.

## 2. Validation Checklist
Before opening a PR or completing a phase:
- `npm run test` (all unit tests must pass)
- `npm run typecheck` (strict TypeScript check must pass with 0 errors)
- `npm run build` (Next.js production build must compile cleanly)

# Copilot Instructions

## Agent Context
Read `AGENTS.md` and `.agents.local.md` (if it exists) before starting any task.
Follow the self-updating protocol defined in `AGENTS.md`.

## Code Clarity Standard

Every line of code should do exactly one thing. Use intermediate variables as documentation.

### Rules
1. **No chained crypto** — split `createHash().update().digest()` into steps
2. **No inline JSON.stringify with defaults** — extract `JSON.stringify(x || fallback)` into a named variable
3. **No complex fallback chains** — split `a?.b || (c?.d ? e : f)` into `dedicatedX` / `fallbackX`
4. **No parseInt with inline fallback** — extract the raw param first, then parse
5. **Name magic numbers** — `30 * 24 * 60 * 60 * 1000` becomes `const thirtyDaysMs = ...`
6. **Split compound conditions** — `if (a !== -1 && b >= c)` becomes named booleans like `isUnlimited`, `isOverLimit`
7. **No chained string methods** — `.replace().replace().replace()` should be sequential assignments
8. **Split key/token generation** — `prefix + randomBytes(24).toString('base64url')` → extract `randomPart`

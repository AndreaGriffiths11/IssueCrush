# Copilot Instructions

## First Steps
Read `AGENTS.md` and `.agents.local.md` (if it exists) before starting any task.

## Project
IssueCrush — Tinder-style GitHub issue triage. Swipe left to close, right to keep. React Native + Expo SDK 54, TypeScript 5.9.

## Architecture Boundaries
- `App.tsx` is composition only: ThemeContext, ErrorBoundary, layout branching
- Components receive props/callbacks — they do NOT call hooks or APIs directly
- Hook APIs (`useAuth`, `useIssues`, `useAnimations`) are frozen — no renames or signature changes without updating all call sites
- `swiperRef` from `useIssues` must be passed as prop — never recreate inside a component
- Token exchange happens server-side (`api/src/app.js`), never in the client
- All frontend→API auth uses `X-Session-Token` header (Azure SWA intercepts `Authorization`)

## Platform Awareness
- Mobile: `expo-secure-store` for tokens
- Web: `@react-native-async-storage/async-storage` for tokens
- Use `Platform.OS` checks, never assume one platform
- `expo export` may fail due to blocked `cdp.expo.dev` — use `npx tsc --noEmit` as build check

## Key Dependencies
- `react-native-deck-swiper` — requires ref wired via `useIssues().swiperRef` for undo
- `@github/copilot-sdk` 0.1.32 — requires `onPermissionRequest: approveAll` in `createSession()`
- `vscode-jsonrpc@8` — lacks ESM exports, patched by `scripts/patch-vscode-jsonrpc.js` (don't remove postinstall)

## Git Rules
- Never force-push, never rewrite history
- Run `npx tsc --noEmit` before committing
- Commit messages: `type: description` (fix, feat, refactor, docs, chore, test)

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

## Testing
- Run `npm test` before submitting changes to server.js, sessionStore.js, or api/
- Type-check with `npx tsc --noEmit` for any TypeScript changes
- No new dependencies unless absolutely required

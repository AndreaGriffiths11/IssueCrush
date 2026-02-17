# AGENTS.md

IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any React Native, Expo, or GitHub Copilot SDK tasks.

## Project Context
IssueCrush - Tinder-style GitHub issue triage app. Swipe left to close issues, right to keep.

## Tech Stack
- React Native 0.81 / React 19.1
- Expo SDK 54
- Azure Static Web Apps (deployment)
- Azure Functions v4 / Node 20 / ESM (API backend)
- Azure Cosmos DB NoSQL (session storage)
- @github/copilot-sdk 0.1.14
- TypeScript 5.9

## Architecture
```
App.tsx (composition only: ThemeContext, ErrorBoundary, layout branching)
    ├── src/components/AuthScreen.tsx    (OAuth UI, login/logout actions)
    ├── src/components/IssueCard.tsx     (pure render, no network)
    ├── src/components/Sidebar.tsx       (desktop: filters, progress, actions)
    ├── src/components/SwipeContainer.tsx (swiper + overlays, delegates to hooks)
    ├── src/api/github.ts (GitHub API client)
    ├── src/lib/tokenStorage.ts (secure token storage)
    └── src/lib/copilotService.ts (AI summary frontend)
api/src/app.js (Azure Functions: OAuth + AI proxy + issues)
api/src/sessionStore.js (Cosmos DB session storage)
```

## Key Patterns

### Token Storage
- Mobile: `expo-secure-store`
- Web: `@react-native-async-storage/async-storage`
- Never expose client secret to frontend

### GitHub OAuth
- Device flow for mobile, web flow for browser
- Scope must be `repo` (not `public_repo`) to close issues
- Token exchange happens in api/src/app.js (Azure Function), not client
- All frontend→API auth uses `X-Session-Token` header (Azure SWA intercepts `Authorization`)

### Session Storage
- Cosmos DB NoSQL: account `issuecrush-cosmos`, db `issuecrush`, container `sessions`
- 24-hour TTL, partition key `/id`
- `resolveSession()` reads `x-session-token` first, falls back to `authorization`

### AI Summaries
- Route through `/api/ai-summary` Azure Function
- Requires `GH_TOKEN` or `COPILOT_PAT` in SWA app settings
- Frontend calls copilotService.ts → Azure Function → Copilot SDK

### Refactor Boundaries (issue #38)
- `ErrorBoundary` (class component) stays in `App.tsx` — must wrap all children
- `ThemeContext` provider stays in `App.tsx` — root-level context
- Mobile/desktop layout branching (`isDesktop` / `useWindowDimensions`) stays in `App.tsx`
- Components receive props/callbacks; they do NOT call hooks or APIs directly
- Hook APIs (`useAuth`, `useIssues`, `useAnimations`) are frozen — no renames or signature changes for this issue; if a signature must change, update all call sites and explain why in the PR
- `swiperRef` from `useIssues` must be passed as a prop or via `forwardRef` into `SwipeContainer` — do not recreate the ref inside the component
- No new dependencies unless absolutely required by the issue

### Known Gotchas
- `expo export` may fail due to blocked network access to `cdp.expo.dev` — do not block a PR on this; use `npx tsc --noEmit` as the build check instead
- `react-native-deck-swiper` requires a `ref` wired via `useIssues().swiperRef` for undo (swipeBack) — this ref must survive the refactor

## File Quick Reference
|File|Purpose|
|---|---|
|App.tsx|Main component: auth state, swipe UI, issue cards|
|api/src/app.js|Azure Functions: OAuth, issues, AI proxy endpoints|
|api/src/sessionStore.js|Cosmos DB session CRUD + resolveSession()|
|src/api/github.ts|fetchIssues, closeIssue, reopenIssue|
|src/lib/tokenStorage.ts|getToken, setToken, clearToken|
|src/lib/copilotService.ts|getAISummary frontend wrapper|
|staticwebapp.config.json|SWA routing and API config|

## Scripts
- `npm run dev` - Server + Expo (mobile dev)
- `npm run web-dev` - Server + web browser
- `npm run server` - OAuth/AI server only (port 3000)
- `swa start` - Azure SWA emulator (local)
- `npx tsc --noEmit` - Type-check without building (run before committing any refactor work)

## Deployment
- Azure SWA: `https://gray-water-08b04e810.6.azurestaticapps.net`
- Resource group: `issuecrush-rg`
- Pushes to `main` auto-deploy via GitHub Actions

## Docs
- Expo SDK 54: https://docs.expo.dev
- React Native 0.81: https://reactnative.dev/docs
- GitHub Copilot SDK: https://github.com/github/copilot-sdk
- react-native-deck-swiper: https://github.com/alexbrillant/react-native-deck-swiper

## Local Context
Read `.agents.local.md` at session start for accumulated learnings.
At session end, append a Session Log entry: what changed, what worked, what didn't, decisions made, patterns learned.
Subagents: explicitly read `.agents.local.md` — you don't inherit main conversation history.

### Promotion Workflow
- During compression (300+ lines), flag patterns that recurred 3+ sessions in `.agents.local.md` → "Ready to Promote"
- Use pipe-delimited format: `pattern | context` → target section (Patterns, Gotchas, or Boundaries)
- Human decides when to move flagged items into this file
- After promoting: remove the item from Ready to Promote in `.agents.local.md`
- If an item is already captured in AGENTS.md, clear it from Ready to Promote — don't duplicate

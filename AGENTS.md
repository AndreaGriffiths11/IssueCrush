# AGENTS.md

IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any React Native, Expo, or GitHub Copilot SDK tasks.

## Project Context
IssueCrush - Tinder-style GitHub issue triage app. Swipe left to close issues, right to keep.

## Tech Stack
- React Native 0.81 / React 19.1
- Expo SDK 54
- @github/copilot-sdk 0.1.14
- Express 5.x (OAuth + AI proxy server)
- TypeScript 5.9

## Architecture
```
App.tsx (UI + swipe logic)
    ├── src/api/github.ts (GitHub API client)
    ├── src/lib/tokenStorage.ts (secure token storage)
    └── src/lib/copilotService.ts (AI summary frontend)
server.js (Express: OAuth token exchange + Copilot proxy)
```

## Key Patterns

### Token Storage
- Mobile: `expo-secure-store`
- Web: `@react-native-async-storage/async-storage`
- Never expose client secret to frontend

### GitHub OAuth
- Device flow for mobile, web flow for browser
- Scope must be `repo` (not `public_repo`) to close issues
- Token exchange happens in server.js, not client

### AI Summaries
- Route through `/api/copilot` endpoint in server.js
- Requires `GH_TOKEN` or `COPILOT_PAT` env var on server
- Frontend calls copilotService.ts → server proxy → Copilot SDK

## File Quick Reference
|File|Purpose|
|---|---|
|App.tsx|Main component: auth state, swipe UI, issue cards|
|server.js|Express server: OAuth callback, AI proxy endpoint|
|src/api/github.ts|fetchIssues, closeIssue, reopenIssue|
|src/lib/tokenStorage.ts|getToken, setToken, clearToken|
|src/lib/copilotService.ts|getAISummary frontend wrapper|

## Scripts
- `npm run dev` - Server + Expo (mobile dev)
- `npm run web-dev` - Server + web browser
- `npm run server` - OAuth/AI server only (port 3000)

## Docs
- Expo SDK 54: https://docs.expo.dev
- React Native 0.81: https://reactnative.dev/docs
- GitHub Copilot SDK: https://github.com/github/copilot-sdk
- react-native-deck-swiper: https://github.com/alexbrillant/react-native-deck-swiper

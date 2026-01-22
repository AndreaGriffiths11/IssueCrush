# IssueCrush 🎯

Swipe through your GitHub issues like Tinder. Close with a left swipe, keep with a right swipe. Powered by **GitHub Copilot AI** for intelligent issue summaries.

![IssueCrush Demo](assets/demo.png)

## Features

- **Tinder-Style Swipe Interface** - One card at a time, swipe right to keep, left to close
- **GitHub OAuth Authentication** - Secure login with device flow (mobile) or web flow (browser)
- **AI-Powered Summaries** ✨ - Get intelligent issue analysis powered by GitHub Copilot SDK
- **Instant Undo** - Accidentally closed an issue? Undo it instantly
- **Repository Filtering** - Focus on specific repos or view all your issues
- **Cross-Platform** - Works on web, iOS, and Android via React Native + Expo
- **Native Feel** - Action bar with Close/Undo/Keep buttons, toast notifications, stamp-style swipe overlays

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **GitHub account** with repositories containing issues
- **GitHub OAuth App** ([create one here](https://github.com/settings/developers))
- *Optional:* **GitHub Copilot subscription** for AI summaries

### 1. Clone and Install

```bash
git clone <your-repo>
cd IssueCrush
npm install
```

### 2. Configure GitHub OAuth

Create a GitHub OAuth App:

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** IssueCrush
   - **Homepage URL:** `http://localhost:8081`
   - **Authorization callback URL:** `http://localhost:8081`
4. Click "Register application"
5. Copy your **Client ID**
6. Generate a **Client Secret**

### 3. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
EXPO_PUBLIC_GITHUB_SCOPE=repo
```

> **Important:** Use `repo` scope (not `public_repo`) to enable closing issues.

### 4. Run the Application

**For Web:**
```bash
npm run web-dev
```

This starts both the OAuth server (port 3000) and opens the app in your web browser.

**For Mobile Development:**
```bash
npm run dev
```

This starts both the OAuth server (port 3000) and the Expo dev server (port 8081). Then press `w` to open in web browser, or scan the QR code with Expo Go.

> **Note:** If you navigate to `http://localhost:8081` in your browser, you'll see a JSON manifest instead of the app. This is normal - use the commands above to properly launch the web app.

### 5. Use the App

1. Click "Start GitHub login"
2. Authorize on GitHub
3. Enter a repo filter (e.g., `owner/repo`) or leave blank for all issues
4. Click "Refresh" to load issues
5. **Swipe right** to keep an issue open
6. **Swipe left** to close an issue
7. Tap the issue number to open it on GitHub
8. Use the bottom action bar for button-based actions

## AI Summaries (Optional)

Click the **"✨ Get AI Summary"** button on any issue card to get an AI-generated analysis including:

- What the issue is about
- Technical context and requirements
- Recommended next steps

The AI summary is powered by the GitHub Copilot SDK running on your backend server.

### Requirements for AI Features

- GitHub Copilot subscription or access
- `GH_TOKEN` environment variable with Copilot access (or use `COPILOT_PAT`)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    IssueCrush App                       │
│                   (React Native)                        │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Swipe UI   │  │  GitHub      │  │  AI Summary  │  │
│  │   (Tinder)   │  │  Auth        │  │  (Copilot)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────┬────────────────────┬────────────────────┬─────────┘
     │                    │                    │
     ▼                    ▼                    ▼
┌──────────┐      ┌──────────────┐      ┌──────────────┐
│ GitHub   │      │  Express     │      │ Copilot SDK  │
│ API      │      │  Server      │      │              │
│          │      │  (OAuth +    │      │              │
│          │      │   AI proxy)  │      │              │
└──────────┘      └──────────────┘      └──────────────┘
```

## Project Structure

```
IssueCrush/
├── App.tsx                    # Main app component (UI + swipe logic)
├── server.js                  # Express server (OAuth + AI proxy)
├── src/
│   ├── api/
│   │   └── github.ts         # GitHub API client
│   └── lib/
│       ├── tokenStorage.ts   # Secure token storage
│       └── copilotService.ts # Frontend Copilot service
├── .env.example              # Environment template
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## Available Scripts

```bash
npm run web-dev   # Start server + open web app (recommended for web)
npm run dev       # Start server + Expo dev server (for mobile)
npm run server    # Start OAuth/AI server only (port 3000)
npm start         # Start Expo app only
npm run web       # Open in web browser only
npm run ios       # Open in iOS simulator
npm run android   # Open in Android emulator
```

## Troubleshooting

### Authentication Issues

**"Failed to connect to auth server"**
- Make sure you run `npm run dev` (not just `npm start`)
- The OAuth server must be running on port 3000

**"GitHub OAuth failed: bad_verification_code"**
- Code expired or already used. Click "Start GitHub login" again

**Issues won't close**
- Check that your OAuth scope is `repo` (not `public_repo`)
- Sign out and sign in again to get a new token with the correct scope

### AI Summary Issues

**"AI summary failed: Failed to fetch"**
- Make sure the Express server is running (`npm run server`)
- Check that `GH_TOKEN` or `COPILOT_PAT` is set for Copilot access

### Build/Bundling Issues

**"Cannot find module 'babel-preset-expo'"**
- Run `npm install` to ensure all dependencies are installed
- If the issue persists, manually install: `npm install --save-dev babel-preset-expo`

**"Cannot find module 'react-dom' or 'react-native-web'"**
- Install web dependencies: `npx expo install react-dom react-native-web`

**Blank page or JSON manifest displayed**
- Don't navigate directly to `http://localhost:8081` - that's the Metro bundler endpoint
- Use `npm run web-dev` instead, which opens the correct web URL automatically

## Tech Stack

- **React Native** + **Expo** - Cross-platform mobile framework
- **react-native-deck-swiper** - Tinder-style swipe cards
- **Express** - OAuth token exchange and AI proxy server
- **GitHub Copilot SDK** - AI-powered issue analysis
- **TypeScript** - Type-safe development

## Security

- OAuth tokens stored securely using `expo-secure-store` (mobile) or `AsyncStorage` (web)
- Client Secret only used server-side, never exposed to client
- All GitHub API calls use user's OAuth token

## License

MIT

---

Made with ❤️ for developers who want to triage issues faster

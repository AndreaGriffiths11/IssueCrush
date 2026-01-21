# IssueCrush 🎯

Swipe through your GitHub issues like Tinder. Close with a left swipe, keep with a right swipe. Now powered by **GitHub Copilot AI** for intelligent issue summaries.

## Features

- **GitHub OAuth Authentication** - Secure login with device flow (mobile) or web flow (browser)
- **Swipe Interface** - Intuitive Tinder-style UI for triaging issues
- **Repository Filtering** - Focus on specific repos or view all your issues
- **AI Summaries** ✨ - Get intelligent summaries powered by GitHub Copilot SDK
- **Undo Support** - Accidentally closed an issue? Undo it instantly
- **Cross-Platform** - Works on web, iOS, and Android via React Native

## Quick Start

### Prerequisites

1. **Node.js** 18+ and npm
2. **GitHub account** with repositories
3. **GitHub OAuth App** ([create one here](https://github.com/settings/developers))
4. *Optional:* **GitHub Copilot subscription** for AI features

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
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here
EXPO_PUBLIC_GITHUB_SCOPE=public_repo
```

### 4. Run the Application

#### Option A: Run Everything (Recommended)

```bash
npm run dev
```

This starts both the OAuth server and the Expo app.

#### Option B: Run Separately

Terminal 1:
```bash
npm run server
```

Terminal 2:
```bash
npm start
```

Then press `w` to open in web browser.

### 5. Test Authentication

```bash
./test-auth.sh
```

This script verifies:
- Environment variables are set
- Server is running
- Health endpoint is responding

### 6. Use the App

1. Open http://localhost:8081 in your browser
2. Click "Start GitHub login"
3. Authorize on GitHub
4. You'll be redirected back and logged in
5. Enter a repo filter (e.g., `owner/repo`) or leave blank for all issues
6. Click "Refresh" to load issues
7. Swipe right to keep, left to close

## AI Features (Optional)

### Set Up GitHub Copilot Integration

To enable AI-powered issue summaries:

#### 1. Get GitHub Copilot

- Subscribe at https://github.com/features/copilot
- Free trial available, then $10/month for individuals

#### 2. Install Copilot CLI

```bash
# Via Homebrew (macOS/Linux)
brew install gh-copilot

# Or via GitHub CLI
gh extension install github/gh-copilot
```

#### 3. Authenticate

```bash
copilot auth login
```

#### 4. Verify Installation

```bash
copilot --version
copilot "hello"
```

#### 5. Restart IssueCrush

The app will automatically detect Copilot CLI and enable the AI summary button.

### Using AI Summaries

1. Load issues in IssueCrush
2. Click the **"✨ Get AI Summary"** button on any issue
3. Wait 2-5 seconds for the AI-generated summary
4. Get concise insights about:
   - What the issue is about
   - Key technical details
   - Current status and action needed

See [COPILOT_INTEGRATION.md](./COPILOT_INTEGRATION.md) for detailed documentation.

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Fast setup guide
- **[AUTH_SETUP.md](./AUTH_SETUP.md)** - Detailed authentication troubleshooting
- **[COPILOT_INTEGRATION.md](./COPILOT_INTEGRATION.md)** - AI features documentation

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    IssueCrush App                       │
│                   (React Native)                        │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  GitHub      │  │  Swipe UI    │  │  AI Summary  │  │
│  │  Auth        │  │  (Tinder)    │  │  (Copilot)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────┬────────────────────┬────────────────────┬─────────┘
     │                    │                    │
     ▼                    ▼                    ▼
┌──────────┐      ┌──────────────┐      ┌──────────────┐
│ Express  │      │  GitHub API  │      │ Copilot CLI  │
│ Server   │      │              │      │     SDK      │
│ (OAuth)  │      │              │      │              │
└────┬─────┘      └──────────────┘      └──────────────┘
     │
     ▼
┌──────────┐
│ GitHub   │
│ OAuth    │
└──────────┘
```

## Project Structure

```
IssueCrush/
├── App.tsx                    # Main app component
├── server.js                  # OAuth token exchange server
├── src/
│   ├── api/
│   │   └── github.ts         # GitHub API client
│   └── lib/
│       ├── tokenStorage.ts   # Secure token storage
│       └── copilotService.ts # Copilot SDK integration
├── .env.example              # Environment template
├── test-auth.sh              # Authentication test script
├── AUTH_SETUP.md             # Auth troubleshooting
├── COPILOT_INTEGRATION.md    # AI features docs
└── QUICKSTART.md             # Quick setup guide
```

## Available Scripts

```bash
# Start both server and app
npm run dev

# Start OAuth server only
npm run server

# Start Expo app only
npm start

# Start on specific platforms
npm run web       # Web browser
npm run ios       # iOS simulator
npm run android   # Android emulator

# Test authentication setup
./test-auth.sh
```

## Troubleshooting

### Authentication Issues

**Problem:** "Failed to connect to auth server"
- **Solution:** Run `npm run server` to start the OAuth server

**Problem:** "Server error: 500"
- **Solution:** Check that `GITHUB_CLIENT_SECRET` is set in `.env`

**Problem:** "GitHub OAuth failed: bad_verification_code"
- **Solution:** Code expired or already used. Click "Start GitHub login" again

**Problem:** Redirect URI mismatch
- **Solution:** Ensure GitHub OAuth app callback URL is exactly `http://localhost:8081`

### AI Summary Issues

**Problem:** "Copilot not available"
- **Solution:** Install and authenticate Copilot CLI (see AI Features section)

**Problem:** AI summary takes too long
- **Solution:** Normal for complex issues. Wait up to 60 seconds.

**Problem:** Summary quality is poor
- **Solution:** The AI works better with well-written issues that have clear descriptions

### General Issues

**Problem:** Issues won't load
- **Solution:** Check token permissions. Sign out and sign in again with `public_repo` scope

**Problem:** Can't close issues
- **Solution:** Token needs write permissions. Update `EXPO_PUBLIC_GITHUB_SCOPE` to include `repo`

See [AUTH_SETUP.md](./AUTH_SETUP.md) for detailed troubleshooting.

## Development

### Tech Stack

- **React Native** - Cross-platform mobile framework
- **Expo** - Development tooling and native APIs
- **Express** - OAuth token exchange server
- **GitHub Copilot SDK** - AI-powered features
- **TypeScript** - Type-safe development

### Adding Features

1. Create new components in `src/components/`
2. Add API calls in `src/api/github.ts`
3. Update types as needed
4. Test on web first, then mobile

### Code Style

- Follow existing patterns
- Use TypeScript for type safety
- Keep components focused and small
- Add error handling for all async operations

## Security

- **Tokens** stored securely using `expo-secure-store` (mobile) or `AsyncStorage` (web)
- **Client Secret** only used server-side, never exposed to client
- **OAuth flow** follows GitHub best practices
- **Scope** limited to `public_repo` by default (can be expanded as needed)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Credits

Built with:
- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk)
- [react-native-deck-swiper](https://github.com/webraptor/react-native-deck-swiper)

## Support

- **Issues:** [GitHub Issues](your-repo/issues)
- **Discussions:** [GitHub Discussions](your-repo/discussions)
- **Email:** your-email@example.com

---

Made with ❤️ for developers who want to triage issues faster

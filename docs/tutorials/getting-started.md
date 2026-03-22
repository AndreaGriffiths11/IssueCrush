# Getting Started with IssueCrush

This hands-on tutorial will guide you through setting up and using IssueCrush for the first time.

**Time Required:** 15-20 minutes

**What You'll Learn:**
- How to set up your development environment
- How to configure GitHub OAuth
- How to authenticate and load issues
- How to triage issues with swipes
- How to use AI summaries (optional)

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18 or later** installed ([Download](https://nodejs.org/))
- **npm** installed (comes with Node.js)
- **A GitHub account** with repositories that have issues
- **A code editor** (VS Code recommended)
- **Git** installed

## Step 1: Clone and Install (5 minutes)

### Clone the Repository

Open your terminal and run:

````bash
git clone https://github.com/AndreaGriffiths11/IssueCrush.git
cd IssueCrush
````

### Install Dependencies

````bash
npm install
````

This will install:
- React Native and Expo dependencies
- Express server dependencies
- API dependencies (in `api/` directory)
- Development tools (TypeScript, Jest)

**Expected output:** Should complete without errors in 1-2 minutes.

## Step 2: Create a GitHub OAuth App (5 minutes)

IssueCrush needs a GitHub OAuth app to authenticate users.

### Create the OAuth App

1. Go to https://github.com/settings/developers
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in the form:
   - **Application name:** `IssueCrush (Local Dev)`
   - **Homepage URL:** `http://localhost:8081`
   - **Application description:** (optional) "GitHub issue triage app"
   - **Authorization callback URL:** `http://localhost:8081`
4. Click **Register application**

### Get Your Credentials

After creating the app:

1. Copy your **Client ID** (visible on the page)
2. Click **Generate a new client secret**
3. Copy the **Client Secret** (you won't see it again!)

**Keep these safe** - you'll need them in the next step.

## Step 3: Configure Environment Variables (2 minutes)

### Create Your `.env` File

````bash
cp .env.example .env
````

### Add Your OAuth Credentials

Open `.env` in your code editor and update these lines:

````bash
# Required: Add your GitHub OAuth credentials
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
EXPO_PUBLIC_GITHUB_SCOPE=repo

# Optional: Leave these for now
# COSMOS_ENDPOINT=
# COSMOS_KEY=
# GH_TOKEN=
````

**Replace:**
- `your_client_id_here` with your Client ID
- `your_client_secret_here` with your Client Secret

**Important:** The scope must be `repo` (not `public_repo`) to close issues.

**Save the file.**

## Step 4: Start the App (2 minutes)

IssueCrush runs two servers:

1. **Backend server** (port 3000): OAuth token exchange, GitHub API proxy
2. **Expo dev server** (port 8081): Serves the React Native app

Start both with one command:

````bash
npm run web-dev
````

**Expected output:**
````
Server running on http://localhost:3000
Copilot mode: fallback (AI summaries will use description only)
Expo dev server running...
````

Your browser should automatically open to the app.

**If the browser doesn't open:**
- Manually navigate to `http://localhost:8081`

## Step 5: Sign In with GitHub (2 minutes)

### Authenticate

1. In the app, click **"Start GitHub login"**
2. You'll be redirected to GitHub
3. Click **"Authorize [your-app-name]"**
4. You'll be redirected back to IssueCrush

**What happens behind the scenes:**
1. Browser redirects to GitHub OAuth
2. GitHub sends authorization code back to app
3. App sends code to backend (`POST /api/github-token`)
4. Backend exchanges code for GitHub token
5. Backend stores token in session store
6. Backend returns session ID to app
7. App stores session ID securely

### Verify Authentication

After signing in, you should see:
- Your GitHub username/avatar (top right)
- A repo filter input
- A "Refresh" button

## Step 6: Load Your Issues (2 minutes)

### Load All Issues

Click **"Refresh"** (leave the repo filter empty).

**What happens:**
- App sends request to `/api/issues` with your session ID
- Backend fetches your GitHub issues
- Issues appear as swipeable cards

### Filter by Repository

To focus on one repo:

1. Enter `owner/repo` in the filter (e.g., `facebook/react`)
2. Click **"Refresh"**

**Result:** Only issues from that repository are shown.

### Filter by Label

To see issues with a specific label:

1. Enter label name in the label filter (e.g., `bug`, `good first issue`)
2. Click **"Refresh"**

**Result:** Only issues with that label are shown.

## Step 7: Triage Issues (3 minutes)

Now for the fun part - triaging!

### Swipe Right (Keep Open)

Swipe the card to the **right** to keep the issue open.

**Keyboard shortcut (web only):** Press `→` (right arrow) or `O`

**What happens:**
- Card disappears
- Next issue appears
- Brief haptic feedback (mobile only)

### Swipe Left (Close Issue)

Swipe the card to the **left** to close the issue.

**Keyboard shortcut (web only):** Press `←` (left arrow) or `X`

**What happens:**
- Card disappears with animation
- Issue is closed on GitHub
- Next issue appears
- "Issue closed" feedback message
- Strong haptic feedback (mobile only)

### Undo

Accidentally closed an issue?

Click the **"Undo"** button (or press `Z` or `U` on web).

**What happens:**
- Last closed issue reopens on GitHub
- Card returns to the deck
- Success haptic feedback

### Use Action Buttons

Don't like swiping? Use the buttons at the bottom:

- **X button:** Close issue
- **↻ button:** Undo last close
- **✓ button:** Keep issue open

## Step 8: Try AI Summaries (Optional, 2 minutes)

If you have GitHub Copilot access, you can enable AI summaries.

### Configure Copilot

1. Stop the server (Ctrl+C)
2. Edit `.env` and add:
   ````bash
   GH_TOKEN=your_github_token_with_copilot_access
   ````
3. Restart the server:
   ````bash
   npm run web-dev
   ````

### Generate a Summary

1. Load an issue
2. Click **"✨ Get AI Summary"** on the issue card
3. Wait 2-3 seconds
4. AI-generated summary appears below the issue description

**Summary includes:**
- What the issue is about
- Technical context
- Recommended next steps

## Next Steps

Congratulations! You've successfully set up and used IssueCrush. 🎉

### Learn More

- **[Hooks API Reference](../reference/api/hooks.md)** - Deep dive into the code
- **[Architecture Overview](../reference/architecture/overview.md)** - Understand how it works
- **[Deploy to Azure](../how-to/deploy-azure.md)** - Put it in production
- **[Contributing Guide](../../CONTRIBUTING.md)** - Contribute to the project

### Try Advanced Features

- **Keyboard shortcuts:** Use arrow keys, X/O, Z/U (web only)
- **Desktop sidebar:** Resize your browser to see the sidebar (desktop layout)
- **Persistent sessions:** Set up [Cosmos DB](../how-to/setup-cosmos-db.md) to keep sessions across restarts

### Customize

- **Theme:** Edit `src/theme/themes.ts` for custom colors
- **Animation:** Tweak `src/hooks/useAnimations.ts` for different effects
- **Add features:** See [How to Add Custom Actions](../how-to/add-custom-actions.md)

## Troubleshooting

### "Failed to connect to auth server"

**Problem:** Backend server not running

**Solution:** Run `npm run web-dev` (not just `npm start`)

### "GitHub OAuth failed: bad_verification_code"

**Problem:** Authorization code expired or already used

**Solution:** Click "Start GitHub login" again to get a new code

### "Issues won't close"

**Problem:** OAuth scope is `public_repo` instead of `repo`

**Solution:**
1. Edit `.env` → change `EXPO_PUBLIC_GITHUB_SCOPE=repo`
2. Restart server
3. Sign out and sign in again

### Blank page or JSON manifest

**Problem:** Navigating directly to `http://localhost:8081`

**Solution:** Use `npm run web-dev` which opens the correct URL

## Common Questions

**Q: Do I need Cosmos DB for local development?**

A: No. Sessions are stored in memory by default (fine for local testing).

**Q: Can I use IssueCrush without GitHub Copilot?**

A: Yes. AI summaries are optional. Without Copilot, the app shows issue descriptions.

**Q: Does IssueCrush work on mobile?**

A: Yes. Run `npm run dev` and scan the QR code with Expo Go app.

**Q: Is my GitHub token stored securely?**

A: Yes. Client stores only a session ID. The actual GitHub token is stored server-side.

## Get Help

- **Issues:** [GitHub Issues](https://github.com/AndreaGriffiths11/IssueCrush/issues)
- **Discussions:** [GitHub Discussions](https://github.com/AndreaGriffiths11/IssueCrush/discussions)

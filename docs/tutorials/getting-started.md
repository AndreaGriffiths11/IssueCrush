# Getting Started Tutorial

Learn how to set up and use IssueCrush in 15 minutes.

## What You'll Learn

- Installing and configuring IssueCrush locally
- Creating a GitHub OAuth App
- Authenticating with GitHub
- Swiping through issues
- Using AI summaries (optional)

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** and npm installed
- A **GitHub account** with repositories containing issues
- 15 minutes of your time

## Step 1: Clone and Install

Open your terminal and run:

````bash
# Clone the repository
git clone https://github.com/AndreaGriffiths11/IssueCrush.git
cd IssueCrush

# Install dependencies
npm install
````

**Expected output**: Dependencies installed successfully (may take 2-3 minutes).

## Step 2: Create a GitHub OAuth App

IssueCrush needs a GitHub OAuth App to authenticate users.

1. Go to https://github.com/settings/developers
2. Click **New OAuth App**
3. Fill in the form:

   | Field                        | Value                          |
   |------------------------------|--------------------------------|
   | Application name             | IssueCrush (Local)             |
   | Homepage URL                 | `http://localhost:8081`        |
   | Authorization callback URL   | `http://localhost:8081`        |

4. Click **Register application**
5. Copy your **Client ID** (starts with `Ov23li...`)
6. Click **Generate a new client secret**
7. Copy your **Client Secret** (long alphanumeric string)

**⚠️ Important**: Keep your Client Secret private. Never commit it to Git.

## Step 3: Configure Environment

Create your environment file:

````bash
cp .env.example .env
````

Open `.env` in your editor and add your credentials:

````bash
# Required: GitHub OAuth
EXPO_PUBLIC_GITHUB_CLIENT_ID=Ov23liYourClientIdHere
GITHUB_CLIENT_SECRET=your_client_secret_here
EXPO_PUBLIC_GITHUB_SCOPE=repo

# Optional: Azure Cosmos DB (leave blank for in-memory sessions)
COSMOS_ENDPOINT=
COSMOS_KEY=
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

**Why `repo` scope?** IssueCrush needs the `repo` scope (not `public_repo`) to close issues.

## Step 4: Start the Application

Run the development server:

````bash
npm run web-dev
````

This command:
1. Starts the OAuth server on port 3000
2. Starts the Expo dev server on port 8081
3. Opens your default browser to the app

**Expected output**:

````
Server running on http://localhost:3000
OAuth server ready
AI summaries: Copilot SDK available
Web app opened at http://localhost:8081
````

**Troubleshooting**: If the browser shows JSON instead of the app, you may have navigated to the Metro bundler. Close that tab and run `npm run web-dev` again.

## Step 5: Sign In to GitHub

1. In the app, click **Start GitHub login**
2. You'll be redirected to GitHub
3. Review the permissions:
   - **Read/write access to code** (needed to close issues)
   - **Read access to profile** (for your username)
4. Click **Authorize [Your App Name]**
5. You'll be redirected back to IssueCrush

**Expected result**: You should see the main app interface with a filter input.

## Step 6: Load Issues

Now let's load some issues to triage:

### Option A: All Your Issues

Leave the filter blank and click **Refresh**. This loads all open issues assigned to you or created by you across all repositories.

### Option B: Specific Repository

1. Enter a repository filter like `octocat/Hello-World`
2. Click **Refresh**

**Expected result**: Issue cards appear in the swipe deck.

## Step 7: Swipe Through Issues

Now for the fun part! Triage your issues:

### Desktop (Mouse)

- **Click and drag left**: Close the issue
- **Click and drag right**: Keep the issue open
- **Click Close button**: Close without swiping
- **Click Keep button**: Keep without swiping

### Mobile (Touch)

- **Swipe left**: Close the issue
- **Swipe right**: Keep the issue open

### Keyboard Shortcuts (Desktop Only)

- **←** (Left arrow): Close issue
- **→** (Right arrow): Keep issue
- **U**: Undo last close
- **?**: Show keyboard shortcuts help

**What happens when you swipe left?**

1. The issue gets closed on GitHub
2. A red "CLOSE" overlay appears
3. Haptic feedback (on mobile)
4. Toast notification: "Closed #42 · owner/repo"
5. Next issue appears

**What happens when you swipe right?**

1. The issue stays open on GitHub
2. A green "KEEP" overlay appears
3. Haptic feedback (on mobile)
4. Toast notification: "Kept open · #42"
5. Next issue appears

## Step 8: Undo a Mistake

Accidentally closed an issue? No problem:

1. Click the **Undo** button (or press **U** on desktop)
2. The last closed issue reopens on GitHub
3. The card returns to the deck
4. Toast notification: "Reopened #42"

**Limitation**: You can only undo the most recent close action.

## Step 9: Try AI Summaries (Optional)

If your GitHub account has Copilot access, try AI-powered issue summaries:

1. Click **✨ Get AI Summary** on an issue card
2. Wait 2-5 seconds
3. The summary appears below the issue body

**Example AI Summary**:

> This issue requests adding swipe gesture support for mobile devices. Key technical requirements include touch event handling and gesture recognition. Recommended next steps: 1) Research react-native-gesture-handler, 2) Create a proof of concept for basic swipe detection, 3) Integrate with the existing issue card component.

**Troubleshooting**: If AI summaries fail, ensure:
- Your GitHub account has Copilot access
- The server is running (`npm run server` in a separate terminal)
- Environment variable `GH_TOKEN` or `COPILOT_PAT` is set (optional for local dev)

## Step 10: Filter by Labels

Want to focus on specific issue types? Use label filtering:

1. Enter labels in the **Label filter** field (e.g., `bug,enhancement`)
2. Click **Refresh**
3. Only issues with those labels appear

**Tips**:
- Use comma-separated labels: `bug,critical`
- Combine with repository filter: `owner/repo` + `bug`

## What's Next?

Congratulations! You've completed the IssueCrush tutorial. 🎉

### Next Steps

- **Deploy to production**: See [Deployment Guide](../guides/deployment.md)
- **Understand the architecture**: Read [Architecture Guide](../guides/architecture.md)
- **Explore the API**: Check [API Reference](../api/README.md)
- **Contribute**: Read [CONTRIBUTING.md](../../CONTRIBUTING.md)

### Tips for Effective Issue Triage

1. **Start broad, then narrow**: Load all issues first, then filter by repo or labels
2. **Use keyboard shortcuts**: Much faster than clicking (desktop only)
3. **Review AI summaries**: Helps you understand complex issues quickly
4. **Don't overthink it**: The goal is fast triage. When in doubt, keep it open.
5. **Undo is your friend**: Made a mistake? Press U to undo.

### Common Workflows

#### Morning Triage

1. Sign in to IssueCrush
2. Load all issues (no filter)
3. Swipe through quickly, closing obvious spam/duplicates
4. Filter by `bug` label
5. Review and close fixed bugs

#### Focused Repository Cleanup

1. Enter repository filter: `yourname/yourrepo`
2. Filter by label: `stale,wontfix`
3. Review each issue
4. Close outdated issues
5. Keep active ones for later

#### AI-Assisted Deep Dive

1. Load complex issues (filter by `enhancement` or `investigation`)
2. For each issue:
   - Click **✨ Get AI Summary**
   - Read the summary
   - Decide: keep for work, close if out of scope

## Troubleshooting

### "Failed to connect to auth server"

**Cause**: OAuth server not running.

**Solution**: Make sure you ran `npm run web-dev` (not just `npm start`).

### "GitHub OAuth failed: bad_verification_code"

**Cause**: Authorization code expired or already used.

**Solution**: Click **Start GitHub login** again.

### "Issues won't close"

**Cause**: OAuth scope is `public_repo` instead of `repo`.

**Solution**:
1. Update `.env` to `EXPO_PUBLIC_GITHUB_SCOPE=repo`
2. Sign out of IssueCrush
3. Sign in again to get a new token

### Blank page or JSON displayed

**Cause**: Navigated directly to `http://localhost:8081` (Metro bundler endpoint).

**Solution**: Close the tab and run `npm run web-dev` again. Don't navigate manually.

### "AI summary failed: Failed to fetch"

**Cause**: Server not running or Copilot not configured.

**Solution**:
1. Ensure server is running: `npm run server`
2. Check that you have GitHub Copilot access
3. (Optional) Set `GH_TOKEN` or `COPILOT_PAT` in `.env`

## Need Help?

- **Documentation**: Check the [docs](../README.md) folder
- **Issues**: Search or create a [GitHub issue](https://github.com/AndreaGriffiths11/IssueCrush/issues)
- **Contributing**: Read [CONTRIBUTING.md](../../CONTRIBUTING.md)

---

**Tutorial complete!** You're now ready to crush your GitHub issues. 🚀

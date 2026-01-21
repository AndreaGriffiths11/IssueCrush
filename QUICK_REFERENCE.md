# IssueCrush Quick Reference

## 🚀 Start Developing

```bash
# Start everything (server + app)
npm run dev

# Then open http://localhost:8081 in browser
```

## ⚙️ Setup (First Time Only)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your GitHub OAuth credentials

# 3. Test setup
./test-auth.sh

# 4. Start developing
npm run dev
```

## 🔑 GitHub OAuth App Settings

**Required Settings:**
- Homepage URL: `http://localhost:8081`
- Authorization callback URL: `http://localhost:8081`

**Get credentials:**
https://github.com/settings/developers

## 📋 Environment Variables

```bash
# Required for authentication
EXPO_PUBLIC_GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=ghp_...
EXPO_PUBLIC_GITHUB_SCOPE=public_repo

# Optional: Use 'repo' for private repos
```

## 🤖 Copilot Setup (Optional)

```bash
# Install Copilot CLI
brew install gh-copilot

# Authenticate
copilot auth login

# Verify
copilot --version
copilot "hello"

# Restart app to enable AI features
npm run dev
```

## 🛠️ Common Commands

```bash
# Development
npm run dev          # Start server + app
npm run server       # Start OAuth server only
npm start            # Start Expo app only
npm run web          # Open web browser

# Testing
./test-auth.sh       # Verify auth setup
curl localhost:3000/health  # Check server

# Setup
npm run setup        # Install and show instructions
```

## 🐛 Troubleshooting

### "Failed to connect to auth server"
```bash
# Start the server
npm run server
```

### "Server error: 500"
```bash
# Check your .env file has GITHUB_CLIENT_SECRET
cat .env
```

### "Copilot not available"
```bash
# Install and authenticate Copilot CLI
brew install gh-copilot
copilot auth login
```

### "Redirect URI mismatch"
- Check GitHub OAuth app callback URL is exactly: `http://localhost:8081`

### "No access token received"
- Code expired (single-use only)
- Click "Start GitHub login" again

## 📖 Documentation Files

- **README.md** - Full project overview
- **QUICKSTART.md** - Fast setup guide
- **AUTH_SETUP.md** - Authentication details
- **COPILOT_INTEGRATION.md** - AI features
- **SETUP_CHECKLIST.md** - Step-by-step setup
- **CHANGES_SUMMARY.md** - What was fixed/added

## 🎯 Feature Checklist

### Core Features
- ✅ GitHub OAuth authentication
- ✅ Load issues from repos
- ✅ Swipe to close (left) or keep (right)
- ✅ Undo closed issues
- ✅ Filter by repository

### AI Features (if Copilot enabled)
- ✅ Get AI summaries for issues
- ⏳ Smart triage recommendations (code ready, UI not added)

## 🔍 Quick Debugging

```bash
# 1. Check environment
cat .env

# 2. Test server
curl http://localhost:3000/health

# 3. Check Copilot
copilot --version
copilot auth status

# 4. Run auth test
./test-auth.sh

# 5. Check browser console
# Open DevTools > Console
# Look for "Copilot service available" or errors
```

## 📱 Testing on Mobile

```bash
# Start the app
npm start

# On your phone:
# 1. Install Expo Go app
# 2. Scan the QR code
# 3. Uses device flow (different from web)
```

## 🏗️ Architecture

```
App.tsx
  ├── GitHub OAuth (via server.js)
  ├── Issue Management (via src/api/github.ts)
  ├── Token Storage (via src/lib/tokenStorage.ts)
  └── Copilot Service (via src/lib/copilotService.ts)
```

## 🎨 Customization

### Change OAuth Scope
Edit `.env`:
```bash
EXPO_PUBLIC_GITHUB_SCOPE=repo  # For private repos
```

### Customize AI Prompts
Edit `src/lib/copilotService.ts`:
```typescript
private buildSummaryPrompt(issue: GitHubIssue): string {
  // Your custom prompt here
}
```

### Add New Features
1. Create component in `src/components/`
2. Import in `App.tsx`
3. Add to UI
4. Test and iterate

## 🔗 Useful Links

- **GitHub OAuth Apps:** https://github.com/settings/developers
- **GitHub Copilot:** https://github.com/features/copilot
- **Copilot SDK:** https://github.com/github/copilot-sdk
- **Expo Docs:** https://docs.expo.dev/
- **React Native:** https://reactnative.dev/

## 💡 Tips

- Always start server before the app
- Use browser console for debugging
- Test auth flow after any .env changes
- AI summaries work best with well-written issues
- Keep Copilot CLI updated for best results

## 🚨 Emergency Reset

```bash
# 1. Stop everything
# Ctrl+C in all terminals

# 2. Clear node_modules
rm -rf node_modules
npm install

# 3. Clear Expo cache
rm -rf .expo

# 4. Restart
npm run dev
```

## 📝 Quick Notes

- Server runs on **port 3000**
- Web app runs on **port 8081** (default Expo)
- OAuth codes are **single-use** only
- Tokens are stored **locally** (secure on mobile, AsyncStorage on web)
- Copilot SDK requires **active subscription**
- AI summaries use **your Copilot quota**

---

**Need help?** Check the full documentation or run `./test-auth.sh` for diagnostics.

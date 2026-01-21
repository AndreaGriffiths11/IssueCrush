# IssueCrush Setup Checklist ✅

Follow this checklist to get IssueCrush fully working with authentication and AI features.

## Phase 1: Basic Setup

### ☐ 1. Install Dependencies

```bash
npm install
```

**Verify:**
```bash
ls node_modules/@github/copilot-sdk
```

Should show the Copilot SDK directory.

---

### ☐ 2. Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name:** `IssueCrush` (or your preferred name)
   - **Homepage URL:** `http://localhost:8081`
   - **Authorization callback URL:** `http://localhost:8081` (must match exactly!)
   - **Application description:** "Tinder-style GitHub issue triage"
4. Click **"Register application"**

**Verify:**
- You see your new OAuth app in the list
- You have the Client ID visible

---

### ☐ 3. Get Client Secret

1. On your OAuth app page, click **"Generate a new client secret"**
2. Copy the secret immediately (you won't see it again!)

**Verify:**
- You have both Client ID and Client Secret copied

---

### ☐ 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and paste your credentials:

```env
EXPO_PUBLIC_GITHUB_CLIENT_ID=Ov23li...your_actual_id
GITHUB_CLIENT_SECRET=ghp_...your_actual_secret
EXPO_PUBLIC_GITHUB_SCOPE=public_repo
```

**Verify:**
```bash
source .env
echo $EXPO_PUBLIC_GITHUB_CLIENT_ID
echo $GITHUB_CLIENT_SECRET
```

Should show your actual values, not placeholders.

---

## Phase 2: Test Authentication

### ☐ 5. Run Test Script

```bash
chmod +x test-auth.sh
./test-auth.sh
```

**Expected Output:**
```
=== IssueCrush Authentication Test ===

1. Checking environment variables...
✗ EXPO_PUBLIC_GITHUB_CLIENT_ID not set or using placeholder
✗ GITHUB_CLIENT_SECRET not set or using placeholder

2. Checking if server is running...
✗ Server is not running
```

This is expected before starting the server.

---

### ☐ 6. Start the Server

Open a new terminal:

```bash
npm run server
```

**Expected Output:**
```
Server running on http://localhost:3000
```

**Verify:**
```bash
curl http://localhost:3000/health
```

Should return: `{"status":"ok"}`

---

### ☐ 7. Test Server with Script

In another terminal:

```bash
./test-auth.sh
```

**Expected Output:**
```
1. Checking environment variables...
✓ EXPO_PUBLIC_GITHUB_CLIENT_ID is set
✓ GITHUB_CLIENT_SECRET is set

2. Checking if server is running...
✓ Server is running on port 3000

3. Testing server health endpoint...
✓ Health endpoint working

=== Summary ===
✓ Ready to test authentication!
```

---

### ☐ 8. Start the App

In a third terminal (or stop the script and use the same terminal):

```bash
npm start
```

**Expected:**
- QR code appears
- Menu shows: `› Press w │ open web`

Press `w` to open in web browser.

**Or use combined command:**
```bash
npm run dev
```

This starts both server and app automatically.

---

### ☐ 9. Test Login Flow

1. Browser opens to http://localhost:8081
2. You see the IssueCrush login screen
3. Click **"Start GitHub login"**
4. Browser redirects to github.com
5. GitHub shows authorization screen
6. Click **"Authorize"**
7. Redirects back to http://localhost:8081?code=...
8. App shows **"Connected to GitHub"**

**Troubleshooting:**

- **Redirect URI mismatch:** Check GitHub OAuth app settings
- **Server error 500:** Check `GITHUB_CLIENT_SECRET` in .env
- **Code expired:** Click "Start GitHub login" again

---

### ☐ 10. Load Issues

1. In the app, you're now logged in
2. Leave the repo filter blank (or enter `owner/repo`)
3. Click **"Refresh"**
4. Issues appear as cards

**Expected:**
- Loading spinner briefly shows
- Cards appear with issue titles
- Can swipe left/right

**If no issues appear:**
- Check that you have open issues in your repos
- Try entering a specific repo: `facebook/react`
- Check browser console for errors

---

## Phase 3: AI Features (Optional)

### ☐ 11. Check Copilot Subscription

Visit: https://github.com/settings/copilot

**Verify:**
- You have an active Copilot subscription
- Or start a free trial

**Skip this phase if you don't want AI features.**

---

### ☐ 12. Install Copilot CLI

**macOS/Linux (Homebrew):**
```bash
brew install gh-copilot
```

**Or via GitHub CLI:**
```bash
gh extension install github/gh-copilot
```

**Verify:**
```bash
copilot --version
```

Should show: `GitHub Copilot CLI version X.X.X`

---

### ☐ 13. Authenticate Copilot CLI

```bash
copilot auth login
```

Follow the prompts to authenticate.

**Verify:**
```bash
copilot auth status
```

Should show: `✓ Logged in as yourusername`

**Test Copilot:**
```bash
copilot "say hello"
```

Should get a response from Copilot.

---

### ☐ 14. Restart IssueCrush

Stop the app (Ctrl+C) and restart:

```bash
npm run dev
```

**Check browser console:**
You should see: `Copilot service available`

---

### ☐ 15. Test AI Summary

1. In the app, load some issues
2. Look for the **"✨ Get AI Summary"** button (purple)
3. Click it
4. Wait 2-5 seconds
5. AI summary appears below the labels

**Expected:**
- Button changes to "Generating AI summary..."
- Summary appears in a dark box
- Summary is 2-3 sentences about the issue

**If button doesn't appear:**
- Check browser console for Copilot initialization errors
- Verify Copilot CLI is installed: `which copilot`
- Try running `copilot "test"` to ensure it works

---

## Phase 4: Verification

### ☐ 16. Complete Feature Test

Test each feature:

- [ ] Login with GitHub
- [ ] Load issues (all repos)
- [ ] Load issues (specific repo)
- [ ] Swipe right (keep issue)
- [ ] Swipe left (close issue)
- [ ] Undo close
- [ ] Get AI summary (if Copilot enabled)
- [ ] Sign out
- [ ] Sign back in (token persists)

---

### ☐ 17. Review Documentation

Quick skim through:

- [ ] [README.md](./README.md) - Overview and features
- [ ] [QUICKSTART.md](./QUICKSTART.md) - Fast setup guide
- [ ] [AUTH_SETUP.md](./AUTH_SETUP.md) - Auth troubleshooting
- [ ] [COPILOT_INTEGRATION.md](./COPILOT_INTEGRATION.md) - AI features

---

## Common Issues

### Authentication Loop

**Symptom:** Redirects to GitHub repeatedly

**Fix:**
1. Clear browser local storage
2. Sign out in app
3. Check redirect URI matches exactly: `http://localhost:8081`

### Token Expired

**Symptom:** "Unauthorized" errors when loading issues

**Fix:**
1. Click "Sign out"
2. Sign in again
3. New token is generated

### Copilot Not Working

**Symptom:** No AI summary button appears

**Fix:**
```bash
# Verify Copilot CLI
which copilot

# Test Copilot
copilot auth status
copilot "hello"

# Restart app
npm run dev
```

### Port Already in Use

**Symptom:** "Port 3000 already in use"

**Fix:**
```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port in server.js
```

---

## Quick Commands Reference

```bash
# Full stack (server + app)
npm run dev

# Just server
npm run server

# Just app
npm start

# Test auth setup
./test-auth.sh

# Web only
npm run web

# iOS simulator
npm run ios

# Android emulator
npm run android
```

---

## Next Steps After Setup

1. **Customize Scopes**
   - Edit `EXPO_PUBLIC_GITHUB_SCOPE` in `.env`
   - Use `repo` for private repos
   - Use `read:org` for organization issues

2. **Explore AI Features**
   - Try different types of issues
   - Observe AI summary quality
   - Consider implementing triage recommendations

3. **Mobile Testing**
   - Install Expo Go on phone
   - Scan QR code from `npm start`
   - Test mobile flow (uses device auth)

4. **Customize UI**
   - Edit styles in `App.tsx`
   - Change colors, fonts, layouts
   - Add your own features

5. **Production Deployment**
   - Set up production OAuth app
   - Configure production redirect URIs
   - Build with `expo build`

---

## Support

If you get stuck:

1. Check the specific documentation files
2. Review browser console for errors
3. Check server logs for auth issues
4. Verify environment variables
5. Test Copilot CLI independently

---

**Setup Complete? You should be able to:**
- ✅ Log in with GitHub
- ✅ Load and swipe through issues
- ✅ Close issues with left swipe
- ✅ Keep issues with right swipe
- ✅ Undo closed issues
- ✅ Get AI summaries (if Copilot enabled)

Happy triaging! 🎯

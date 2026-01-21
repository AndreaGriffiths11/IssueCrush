# GitHub Copilot SDK Integration

## Overview

IssueCrush now includes AI-powered issue summaries using the **GitHub Copilot SDK**, allowing you to get intelligent insights about GitHub issues directly in the app.

## Features

### ✨ AI Issue Summaries

When viewing an issue, click the "Get AI Summary" button to:
- Get a concise 2-3 sentence summary of the issue
- Understand key technical details at a glance
- Identify the current status and required action
- Make faster triage decisions

The summary is context-aware and analyzes:
- Issue title and content
- Repository information
- Labels and categorization
- Current state

## Prerequisites

### 1. GitHub Copilot Subscription

You need an active GitHub Copilot subscription:
- Individual: $10/month or $100/year
- Business: $19/user/month
- Free trial available

Sign up at: https://github.com/features/copilot

### 2. Install GitHub Copilot CLI

The Copilot SDK requires the Copilot CLI to be installed and available in your PATH.

#### Installation Options:

**Via Homebrew (macOS/Linux):**
```bash
brew install gh-copilot
```

**Via GitHub CLI extension:**
```bash
gh extension install github/gh-copilot
```

**Manual installation:**
Follow the guide at: https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli

#### Verify Installation:

```bash
copilot --version
```

You should see the Copilot CLI version number.

### 3. Authenticate Copilot CLI

```bash
copilot auth login
```

Follow the prompts to authenticate with your GitHub account.

## How It Works

### Architecture

```
┌────────────────────┐
│   IssueCrush App   │
│   (React Native)   │
└────────┬───────────┘
         │
         │ Copilot SDK
         ▼
┌────────────────────┐
│  @github/copilot-  │
│       sdk          │
└────────┬───────────┘
         │
         │ JSON-RPC
         ▼
┌────────────────────┐
│  Copilot CLI       │
│  (Local Process)   │
└────────┬───────────┘
         │
         │ API Calls
         ▼
┌────────────────────┐
│  GitHub Copilot    │
│     Service        │
└────────────────────┘
```

### Implementation Details

**Location:** `src/lib/copilotService.ts`

The CopilotService class provides:

1. **Session Management**
   - Initializes Copilot client on app startup
   - Maintains a persistent session for conversations
   - Automatic cleanup on app shutdown

2. **Issue Summarization**
   - Sends structured prompts with issue metadata
   - Parses AI responses
   - Returns concise, actionable summaries

3. **Error Handling**
   - Graceful degradation if Copilot CLI not available
   - Clear error messages for troubleshooting
   - Doesn't block core functionality

### Code Example

```typescript
import { copilotService } from './src/lib/copilotService';

// Initialize (happens automatically in App.tsx)
await copilotService.initialize();

// Get summary for an issue
const summary = await copilotService.summarizeIssue(issue);
console.log(summary);
// Output: "This issue reports a bug in the authentication
// flow where users cannot log in via OAuth. The problem
// appears to be related to missing redirect URI
// configuration. Requires immediate attention."
```

## Usage in IssueCrush

### Enable AI Summaries

1. Ensure GitHub Copilot CLI is installed and authenticated
2. Start IssueCrush: `npm run dev`
3. Log in with GitHub OAuth
4. Load issues from your repositories
5. Click the **"✨ Get AI Summary"** button on any issue

### UI Elements

**AI Summary Button:**
- Only appears on the top card (current issue)
- Only visible if Copilot CLI is available
- Purple background with sparkle emoji

**AI Summary Display:**
- Shows below issue labels
- Dark background with purple accent
- Automatically cleared when swiping

**Loading State:**
- Button text changes to "Generating AI summary..."
- Button is disabled during generation

## Customization

### Modify the Prompt

Edit `src/lib/copilotService.ts`, specifically the `buildSummaryPrompt` method:

```typescript
private buildSummaryPrompt(issue: GitHubIssue): string {
  return `Your custom prompt here with ${issue.title}`;
}
```

### Add More AI Features

The service includes a `getTriageRecommendation` method (ready to use):

```typescript
const recommendation = await copilotService.getTriageRecommendation(issue);
// Returns: { action: 'close' | 'keep' | 'escalate', confidence: 0-100, reasoning: string }
```

You can integrate this to show smart recommendations for each issue.

## Troubleshooting

### "Copilot not available" Message

**Cause:** Copilot CLI not installed or not in PATH

**Fix:**
```bash
# Check if copilot is available
which copilot

# If not found, install it
brew install gh-copilot
```

### "Failed to initialize Copilot SDK"

**Cause:** Copilot CLI not authenticated or subscription inactive

**Fix:**
```bash
# Authenticate
copilot auth login

# Verify authentication
copilot auth status

# Test Copilot
copilot "hello"
```

### AI Summary Takes Too Long

**Cause:** Network latency or complex issue

**Behavior:**
- The SDK has a default timeout of 60 seconds
- Most summaries complete in 2-5 seconds
- No visual progress indicator (could be added)

**Improvement Idea:**
Add a progress indicator in App.tsx for better UX during long requests.

### Copilot CLI Version Mismatch

**Cause:** Using an outdated Copilot CLI version

**Fix:**
```bash
# Update via Homebrew
brew upgrade gh-copilot

# Or update via GitHub CLI
gh extension upgrade gh-copilot
```

## Performance Considerations

### Costs

Each AI summary call:
- Counts against your Copilot usage
- Uses tokens based on issue complexity
- Typical summary: ~500-1000 tokens

No additional cost beyond your Copilot subscription.

### Rate Limiting

GitHub Copilot has rate limits:
- Exact limits not publicly documented
- Typical usage is well within limits
- IssueCrush only sends requests when user clicks the button

### Caching

Currently, summaries are **not cached**:
- Each click generates a new summary
- Summary is cleared when swiping
- Future enhancement: cache summaries per issue ID

## Future Enhancements

### Planned Features

1. **Smart Triage Recommendations**
   - Integrate `getTriageRecommendation` method
   - Show AI suggestions: close, keep, or escalate
   - Confidence score for each recommendation

2. **Batch Analysis**
   - Analyze multiple issues at once
   - Generate priority rankings
   - Identify duplicate issues

3. **Custom Tools**
   - Add GitHub API as a tool for Copilot
   - Let Copilot fetch additional context
   - More accurate and detailed summaries

4. **Multi-turn Conversations**
   - Ask follow-up questions about issues
   - Clarify technical details
   - Get deeper insights

5. **Summary Caching**
   - Cache summaries in local storage
   - Reduce API calls
   - Faster subsequent loads

## SDK Reference

### Dependencies

```json
{
  "@github/copilot-sdk": "^0.1.14"
}
```

### Official Documentation

- **SDK Repository:** https://github.com/github/copilot-sdk
- **Copilot CLI Docs:** https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line
- **SDK Changelog:** https://github.com/github/copilot-sdk/releases

### API Overview

```typescript
import { CopilotClient, CopilotSession } from '@github/copilot-sdk';

// Create client
const client = new CopilotClient();

// Create session
const session = await client.createSession();

// Send message and wait for response
const response = await session.sendAndWait({
  prompt: "Your prompt here"
});

// Access response
console.log(response.data.content);

// Cleanup
await session.destroy();
await client.stop();
```

## Contributing

To add new Copilot features to IssueCrush:

1. Edit `src/lib/copilotService.ts` to add new methods
2. Update `App.tsx` to integrate new UI elements
3. Add appropriate error handling
4. Test with various issue types
5. Update this documentation

## Support

- Copilot SDK issues: https://github.com/github/copilot-sdk/issues
- IssueCrush issues: [Your issue tracker]
- Copilot support: https://support.github.com/

---

**Note:** The GitHub Copilot SDK is in technical preview and may change in breaking ways before reaching stable release. Monitor the SDK repository for updates.

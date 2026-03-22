# Development Guide

## Getting Started

This guide walks you through setting up IssueCrush for local development.

## Prerequisites

- **Node.js** 18 or higher
- **npm** 8 or higher
- **Git**
- **GitHub account** with repositories containing issues
- **Text editor** (VS Code recommended)

### Optional Tools

- **Expo Go app** (for mobile testing on physical devices)
- **iOS Simulator** (macOS only, for iOS development)
- **Android Emulator** (for Android development)

## Initial Setup

### 1. Clone the Repository

````bash
git clone https://github.com/AndreaGriffiths11/IssueCrush.git
cd IssueCrush
````

### 2. Install Dependencies

````bash
npm install
````

**What this does:**
- Installs all dependencies from `package.json`
- Runs postinstall script to patch `vscode-jsonrpc` for Copilot SDK compatibility

### 3. Create GitHub OAuth App

You need a GitHub OAuth App to authenticate users.

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in the form:
   - **Application name:** `IssueCrush Dev` (or any name)
   - **Homepage URL:** `http://localhost:8081`
   - **Authorization callback URL:** `http://localhost:8081`
4. Click **"Register application"**
5. Copy your **Client ID**
6. Click **"Generate a new client secret"** and copy it immediately (you can't view it again)

**Important:** Keep your client secret secure. Never commit it to version control.

### 4. Configure Environment Variables

````bash
cp .env.example .env
````

Edit `.env` and add your credentials:

````bash
# Required: GitHub OAuth
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
EXPO_PUBLIC_GITHUB_SCOPE=repo

# Optional: Redirect URI (defaults to window.location.origin on web)
EXPO_PUBLIC_REDIRECT_URI=http://localhost:8081

# Optional: API URL (defaults to http://localhost:3000 for local dev)
EXPO_PUBLIC_API_URL=http://localhost:3000

# Optional: Copilot SDK for AI summaries
GH_TOKEN=github_token_with_copilot_access
# OR
COPILOT_PAT=copilot_personal_access_token

# Optional: Azure Cosmos DB (falls back to in-memory if not set)
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

**Scope Explanation:**

| Scope | Access Level | Can Close Issues? |
|-------|--------------|-------------------|
| `public_repo` | Public repos only | ❌ No |
| `repo` | Public + private repos | ✅ Yes |

**Use `repo` scope** to enable closing issues.

### 5. Verify Installation

````bash
# Type-check
npx tsc --noEmit

# Run tests
npm test
````

If both pass, you're ready to develop!

## Development Workflows

### Web Development

Start the backend server and open the web app:

````bash
npm run web-dev
````

**What this does:**
- Starts Express server on port 3000 (OAuth + AI proxy)
- Starts Expo dev server and opens web browser
- Enables hot reload for instant feedback

**Access the app:**
- Web UI: Automatically opens in your default browser
- Server: http://localhost:3000
- Health check: http://localhost:3000/api/health

### Mobile Development

Start the backend server and Expo dev tools:

````bash
npm run dev
````

**What this does:**
- Starts Express server on port 3000
- Starts Expo dev server on port 8081
- Shows QR code for Expo Go app

**Testing options:**
- Press `w` to open in web browser
- Press `i` to open iOS Simulator (macOS only)
- Press `a` to open Android Emulator
- Scan QR code with Expo Go app (iOS/Android)

### Server Only

Run just the backend server (useful for API testing):

````bash
npm run server
````

### Type Checking

Check TypeScript types without running the app:

````bash
npx tsc --noEmit
````

**When to run:**
- Before committing code
- After refactoring
- When fixing type errors

### Running Tests

````bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- github.test.ts
````

## Project Structure

````
IssueCrush/
├── api/                          # Azure Functions (production)
│   ├── src/
│   │   ├── app.js               # Function handlers
│   │   └── sessionStore.js      # Cosmos DB session storage
│   ├── package.json             # API dependencies
│   └── host.json                # Azure Functions config
│
├── src/                         # Frontend source code
│   ├── api/                     # API clients
│   │   ├── github.ts            # GitHub API client
│   │   └── github.test.ts       # Tests
│   │
│   ├── components/              # React Native components
│   │   ├── AuthScreen.tsx       # Login/logout UI
│   │   ├── IssueCard.tsx        # Issue card display
│   │   ├── SwipeContainer.tsx   # Swiper + action bar
│   │   ├── Sidebar.tsx          # Desktop sidebar (filters, progress)
│   │   ├── KeyboardShortcutsHelp.tsx  # Keyboard help modal
│   │   └── index.ts             # Barrel export
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts           # Authentication state
│   │   ├── useIssues.ts         # Issue data + swipe logic
│   │   ├── useAnimations.ts     # Confetti animations
│   │   ├── useKeyboardShortcuts.ts  # Keyboard navigation
│   │   └── index.ts             # Barrel export
│   │
│   ├── lib/                     # Utility libraries
│   │   ├── tokenStorage.ts      # Secure token storage
│   │   ├── copilotService.ts    # AI summary service
│   │   └── *.test.ts            # Tests
│   │
│   ├── theme/                   # Theming system
│   │   ├── ThemeContext.tsx     # Theme provider
│   │   ├── themes.ts            # Light/dark themes
│   │   └── index.ts             # Barrel export
│   │
│   └── utils/                   # Shared utilities
│       ├── colors.ts            # Color helpers
│       └── index.ts             # Barrel export
│
├── scripts/                     # Build and maintenance scripts
│   └── patch-vscode-jsonrpc.js  # ESM export patcher
│
├── .github/                     # GitHub configuration
│   ├── agents/                  # Custom agent definitions
│   ├── workflows/               # CI/CD workflows
│   └── copilot-instructions.md  # Copilot context
│
├── docs/                        # Documentation
│   ├── API.md                   # API reference
│   ├── ARCHITECTURE.md          # Architecture deep-dive
│   ├── DEVELOPMENT.md           # This file
│   └── DEPLOYMENT.md            # Deployment guide
│
├── App.tsx                      # Main app component
├── server.js                    # Local Express server
├── sessionStore.js              # Local session storage
├── index.ts                     # Expo entry point
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript config
├── jest.config.cjs              # Jest test config
├── babel.config.js              # Babel config
├── app.json                     # Expo config
├── staticwebapp.config.json     # Azure SWA config
├── AGENTS.md                    # AI agent context
├── README.md                    # User-facing README
├── CONTRIBUTING.md              # Contribution guide
└── LICENSE                      # MIT license
````

## Code Patterns

### Hook Usage

**Hooks contain business logic:**

````typescript
// ✅ CORRECT: Hook manages state and logic
export function useIssues(token: string | null) {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  
  const loadIssues = useCallback(async () => {
    const data = await fetchIssues(token);
    setIssues(data);
  }, [token]);
  
  return { issues, loadIssues };
}

// In component
function MyComponent() {
  const { issues, loadIssues } = useIssues(token);
  return <Button onPress={loadIssues}>Refresh</Button>;
}
````

**Components are pure presentation:**

````typescript
// ✅ CORRECT: Component receives props
type Props = {
  issue: GitHubIssue;
  onSwipe: (direction: 'left' | 'right') => void;
};

export function IssueCard({ issue, onSwipe }: Props) {
  return (
    <View>
      <Text>{issue.title}</Text>
      <Button onPress={() => onSwipe('left')}>Close</Button>
    </View>
  );
}
````

### Platform-Specific Code

Use `Platform.OS` to branch logic:

````typescript
import { Platform } from 'react-native';

// Conditional execution
if (Platform.OS !== 'web') {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

// Conditional values
const redirectUri = Platform.OS === 'web'
  ? window.location.origin
  : AuthSession.makeRedirectUri({ preferLocalhost: true });

// Conditional imports
const TokenStorage = Platform.OS === 'web'
  ? require('@react-native-async-storage/async-storage')
  : require('expo-secure-store');
````

### API Client Pattern

All API calls go through `src/api/github.ts`:

````typescript
// ✅ CORRECT: Centralized API client
import { fetchIssues, updateIssueState } from '../api/github';

const issues = await fetchIssues(sessionId, 'owner/repo');
await updateIssueState(sessionId, issue, 'closed');

// ❌ WRONG: Direct fetch in component
const response = await fetch('/api/issues'); // NO!
````

### Error Handling

````typescript
try {
  const data = await fetchIssues(token);
  setIssues(data);
  setFeedback(`Loaded ${data.length} issues`);
} catch (error) {
  const message = (error as Error).message;
  setFeedback(`Failed to load issues: ${message}`);
}
````

### TypeScript Types

Use explicit types for props and state:

````typescript
type Issue = {
  id: number;
  title: string;
  state: 'open' | 'closed';
};

type Props = {
  issues: Issue[];
  onRefresh: () => void;
};

export function IssueList({ issues, onRefresh }: Props) {
  // ...
}
````

## Common Development Tasks

### Adding a New Component

1. Create file in `src/components/`
2. Define TypeScript types
3. Implement component
4. Export from `src/components/index.ts`
5. Import and use in parent component

**Example:**

````typescript
// src/components/MyComponent.tsx
type Props = {
  title: string;
  onPress: () => void;
};

export function MyComponent({ title, onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      <Text>{title}</Text>
    </Pressable>
  );
}

// src/components/index.ts
export * from './MyComponent';

// Usage
import { MyComponent } from './components';
````

### Adding a New Hook

1. Create file in `src/hooks/`
2. Define return type
3. Implement hook logic
4. Export from `src/hooks/index.ts`
5. Use in component

**Example:**

````typescript
// src/hooks/useCounter.ts
export function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  
  const increment = useCallback(() => {
    setCount(c => c + 1);
  }, []);
  
  const decrement = useCallback(() => {
    setCount(c => c - 1);
  }, []);
  
  return { count, increment, decrement };
}

// src/hooks/index.ts
export * from './useCounter';

// Usage
import { useCounter } from './hooks';

function MyComponent() {
  const { count, increment } = useCounter(0);
  return <Button onPress={increment}>{count}</Button>;
}
````

### Adding a New API Endpoint

1. **Add to local server** (`server.js`):

````javascript
app.get('/api/my-endpoint', async (req, res) => {
  const session = await resolveSession(req);
  // ... implementation
  res.json({ data: 'result' });
});
````

2. **Add to Azure Functions** (`api/src/app.js`):

````javascript
app.http('myEndpoint', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'my-endpoint',
  handler: async (request, context) => {
    const session = await resolveSession(request);
    // ... implementation
    return { jsonBody: { data: 'result' } };
  },
});
````

3. **Add client function** (`src/api/github.ts`):

````typescript
export async function fetchMyData(sessionId: string) {
  const response = await fetch(`${BACKEND_URL}/api/my-endpoint`, {
    headers: authHeaders(sessionId),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  
  return response.json();
}
````

4. **Test locally:**

````bash
npm run web-dev
# Test in browser console
````

### Adding Tests

Use Jest for unit tests:

````typescript
// src/utils/myUtil.test.ts
import { myUtil } from './myUtil';

describe('myUtil', () => {
  it('should return expected value', () => {
    const result = myUtil('input');
    expect(result).toBe('expected');
  });
  
  it('should handle edge cases', () => {
    expect(myUtil('')).toBe('');
    expect(myUtil(null)).toBe(null);
  });
});
````

Run tests:

````bash
npm test -- myUtil.test.ts
````

## Debugging

### Web Debugging

Use browser DevTools:

1. Open app in browser (`npm run web-dev`)
2. Open DevTools (F12 or Cmd+Option+I)
3. Check Console for errors
4. Use Network tab to inspect API calls
5. Use React DevTools extension

### Mobile Debugging

Use React Native Debugger or browser DevTools:

1. Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
2. Select "Debug Remote JS"
3. Open Chrome DevTools at http://localhost:8081/debugger-ui
4. Use console.log() for logging

### Server Debugging

Add console.log statements:

````javascript
app.get('/api/issues', async (req, res) => {
  console.log('Request headers:', req.headers);
  const session = await resolveSession(req);
  console.log('Session:', session);
  // ...
});
````

Watch server output in terminal.

### Common Issues

**"Failed to connect to auth server"**

- Ensure server is running (`npm run server`)
- Check `EXPO_PUBLIC_API_URL` in `.env`
- Verify port 3000 is not in use

**"Session expired"**

- Session TTL is 24 hours
- Sign out and sign back in
- Check Cosmos DB connection (if using)

**Issues won't close**

- Verify OAuth scope is `repo` (not `public_repo`)
- Sign out, update `.env`, sign back in

**AI summaries fail**

- Check `GH_TOKEN` or `COPILOT_PAT` in `.env`
- Verify GitHub Copilot access
- Check server logs for errors

**Type errors**

- Run `npx tsc --noEmit` to see all errors
- Check for missing type definitions
- Ensure imports are correct

## Git Workflow

### Branch Naming

````bash
feature/description   # New features
fix/description       # Bug fixes
docs/description      # Documentation
refactor/description  # Code refactoring
test/description      # Test additions
````

### Commit Messages

Use conventional commit format:

````
type: short description

Longer explanation if needed.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
````

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `refactor` — Code refactoring
- `test` — Test additions
- `chore` — Maintenance

**Examples:**

````
feat: add keyboard shortcut for undo
fix: resolve session expiry edge case
docs: update API reference
refactor: extract auth logic to hook
test: add coverage for token storage
chore: upgrade dependencies
````

### Pre-Commit Checklist

Before committing:

- [ ] Run `npx tsc --noEmit` (no type errors)
- [ ] Run `npm test` (all tests pass)
- [ ] Test in browser (web works)
- [ ] Review changes (`git diff`)
- [ ] Write clear commit message

### Pull Request Process

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Commit with clear message
5. Push to GitHub
6. Create pull request
7. Address review feedback
8. Merge when approved

## Performance Tips

### Optimize Re-Renders

Use `React.memo` for expensive components:

````typescript
export const IssueCard = React.memo(function IssueCard({ issue }: Props) {
  // ...
});
````

Use `useCallback` for event handlers:

````typescript
const handlePress = useCallback(() => {
  onSwipe(issue.id);
}, [issue.id, onSwipe]);
````

### Lazy Load Images

````typescript
<Image
  source={{ uri: issue.user.avatar_url }}
  defaultSource={require('../assets/default-avatar.png')}
/>
````

### Debounce Search

````typescript
const debouncedSearch = useCallback(
  debounce((query: string) => {
    fetchResults(query);
  }, 300),
  []
);
````

## Additional Resources

- [React Native Docs](https://reactnative.dev/docs)
- [Expo Docs](https://docs.expo.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [GitHub API Docs](https://docs.github.com/en/rest)
- [API Reference](./API.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)

## Getting Help

- **Issues:** Check [existing issues](https://github.com/AndreaGriffiths11/IssueCrush/issues)
- **Discussions:** Ask in [GitHub Discussions](https://github.com/AndreaGriffiths11/IssueCrush/discussions)
- **Contributing:** See [CONTRIBUTING.md](../CONTRIBUTING.md)

Happy coding! 🚀

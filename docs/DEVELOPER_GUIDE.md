# Developer Guide

Comprehensive guide for setting up and developing IssueCrush.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)
- [Testing](#testing)
- [Debugging](#debugging)
- [Platform-Specific Notes](#platform-specific-notes)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)
- **GitHub account** with at least one repository containing issues

### Optional Software

- **Visual Studio Code** - Recommended editor with TypeScript support
- **iOS Simulator** (macOS only) - For iOS development
- **Android Studio** - For Android development
- **Azure CLI** - For Azure deployment

### GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the form:
   - **Application name:** IssueCrush (or your preferred name)
   - **Homepage URL:** `http://localhost:8081`
   - **Authorization callback URL:** `http://localhost:8081`
4. Click **"Register application"**
5. Copy the **Client ID**
6. Click **"Generate a new client secret"**
7. Copy the **Client Secret** (you won't be able to see it again)

**Important:** Keep your Client Secret secure. Never commit it to version control.

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

This installs all dependencies for both the frontend and backend.

### 3. Configure Environment Variables

Copy the example environment file:

````bash
cp .env.example .env
````

Edit `.env` with your credentials:

````bash
# Required: GitHub OAuth credentials
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Required: OAuth scope (must be "repo" to close issues)
EXPO_PUBLIC_GITHUB_SCOPE=repo

# Optional: Backend API URL (defaults to localhost:3000 in dev)
EXPO_PUBLIC_API_URL=http://localhost:3000

# Optional: Azure Cosmos DB (falls back to in-memory if not set)
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

**Cosmos DB Configuration (Optional):**

Cosmos DB is only needed if you want persistent sessions across server restarts. For local development, in-memory sessions work fine.

If you want to use Cosmos DB:

1. Create a Cosmos DB account in [Azure Portal](https://portal.azure.com/)
2. Choose **NoSQL API**
3. Navigate to **Settings → Keys** and copy the endpoint and primary key
4. Add the `COSMOS_*` variables to your `.env`

The database and container will be created automatically on first run.

### 4. Verify Setup

Check that everything is configured correctly:

````bash
# Type-check the codebase
npx tsc --noEmit

# Run tests
npm test
````

## Development Workflow

### Starting the Development Server

#### Web Development (Recommended for Quick Testing)

````bash
npm run web-dev
````

This command:
1. Starts the Express server (OAuth + AI proxy) on port 3000
2. Starts the Expo dev server
3. Opens the web app in your default browser

**Access Points:**
- Web App: Automatically opens (usually `http://localhost:8081`)
- Server: `http://localhost:3000`
- API Health: `http://localhost:3000/api/health`

#### Mobile Development

````bash
npm run dev
````

This command:
1. Starts the Express server on port 3000
2. Starts the Expo dev server on port 8081
3. Displays a QR code

**To Run on Device:**
- **iOS:** Press `i` to open iOS simulator (macOS only)
- **Android:** Press `a` to open Android emulator
- **Physical Device:** Install Expo Go app, scan QR code

#### Server Only

If you're working on backend changes and have the Expo server already running:

````bash
npm run server
````

Starts only the Express server on port 3000.

### Making Changes

#### Frontend Changes

**Location:** `App.tsx`, `src/`

1. Edit files
2. Save (hot reload should trigger automatically)
3. Check the browser/device for updates

**Tip:** Press `r` in the Expo terminal to manually reload.

#### Backend Changes

**Location:** `server.js`, `api/src/`

1. Edit files
2. Stop the server (Ctrl+C)
3. Restart with `npm run server`

**Tip:** Use `nodemon` for auto-restart on changes:

````bash
npm install -g nodemon
nodemon server.js
````

#### Type Checking

Run TypeScript type checker without building:

````bash
npx tsc --noEmit
````

**Tip:** Add `--watch` flag for continuous type checking:

````bash
npx tsc --noEmit --watch
````

### Git Workflow

1. **Create a feature branch:**
   ````bash
   git checkout -b feature/your-feature-name
   ````

2. **Make changes and commit:**
   ````bash
   git add .
   git commit -m "feat: add your feature description"
   ````

3. **Push to GitHub:**
   ````bash
   git push origin feature/your-feature-name
   ````

4. **Create a pull request:**
   - Go to the repository on GitHub
   - Click "Compare & pull request"
   - Fill in the PR description
   - Request review

## Project Structure

````
IssueCrush/
├── App.tsx                    # Main app component (composition layer)
├── index.ts                   # App entry point
├── server.js                  # Express server (OAuth + AI proxy)
├── sessionStore.js            # Cosmos DB / in-memory session storage
│
├── src/                       # Frontend source code
│   ├── api/                   # API clients
│   │   ├── github.ts          # GitHub API proxy client
│   │   └── github.test.ts
│   │
│   ├── components/            # React Native components
│   │   ├── AuthScreen.tsx     # Login UI
│   │   ├── IssueCard.tsx      # Issue card display
│   │   ├── Sidebar.tsx        # Desktop sidebar
│   │   ├── SwipeContainer.tsx # Swiper wrapper
│   │   └── index.ts
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts         # Authentication logic
│   │   ├── useIssues.ts       # Issue management logic
│   │   ├── useAnimations.ts   # UI animation logic
│   │   └── index.ts
│   │
│   ├── lib/                   # Utilities and services
│   │   ├── copilotService.ts  # AI summary service
│   │   ├── tokenStorage.ts    # Secure token storage
│   │   └── *.test.ts
│   │
│   ├── theme/                 # Theme system
│   │   ├── themes.ts          # Light/dark themes
│   │   ├── ThemeContext.tsx   # Theme provider
│   │   └── index.ts
│   │
│   └── utils/                 # Utility functions
│       ├── colors.ts          # Color utilities
│       └── index.ts
│
├── api/                       # Azure Functions (production backend)
│   ├── src/
│   │   ├── app.js             # Function endpoints
│   │   └── sessionStore.js    # Session management
│   ├── host.json
│   └── package.json
│
├── assets/                    # Images, icons, fonts
├── docs/                      # Documentation
├── .github/                   # GitHub workflows and configs
├── .vscode/                   # VS Code settings
│
├── .env.example               # Environment template
├── .gitignore
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── babel.config.js            # Babel configuration
├── app.json                   # Expo configuration
└── jest.config.cjs            # Jest test configuration
````

### Key Files Explained

- **App.tsx:** Main UI composition. Coordinates hooks and components. No business logic.
- **server.js:** Development server. OAuth exchange and AI proxy. Used locally only.
- **api/src/app.js:** Production backend. Azure Functions with same endpoints as `server.js`.
- **sessionStore.js:** Session management. Works with both Cosmos DB and in-memory storage.
- **AGENTS.md:** AI agent context. Read by GitHub Copilot for project-specific knowledge.

## Common Tasks

### Adding a New Component

1. **Create the component file:**
   ````bash
   touch src/components/MyComponent.tsx
   ````

2. **Define props interface:**
   ````typescript
   interface MyComponentProps {
     title: string;
     onPress: () => void;
   }
   ````

3. **Implement component:**
   ````typescript
   export function MyComponent({ title, onPress }: MyComponentProps) {
     return (
       <TouchableOpacity onPress={onPress}>
         <Text>{title}</Text>
       </TouchableOpacity>
     );
   }
   ````

4. **Export from index:**
   ````typescript
   // src/components/index.ts
   export { MyComponent } from './MyComponent';
   ````

5. **Import in App.tsx:**
   ````typescript
   import { MyComponent } from './src/components';
   ````

### Adding a New Hook

1. **Create the hook file:**
   ````bash
   touch src/hooks/useMyHook.ts
   ````

2. **Implement hook:**
   ````typescript
   export function useMyHook() {
     const [state, setState] = useState(initialValue);
     
     const action = useCallback(() => {
       // Logic here
     }, [dependencies]);
     
     return { state, action };
   }
   ````

3. **Export from index:**
   ````typescript
   // src/hooks/index.ts
   export { useMyHook } from './useMyHook';
   ````

### Adding an API Endpoint

#### Development (server.js)

````javascript
app.post('/api/my-endpoint', async (req, res) => {
  const session = await resolveSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const githubToken = session.githubToken;
  // Make GitHub API call with token
  
  res.json({ result: 'success' });
});
````

#### Production (api/src/app.js)

````javascript
app.http('myEndpoint', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'my-endpoint',
  handler: async (request, context) => {
    const session = await resolveSession(request);
    if (!session) {
      return { status: 401, jsonBody: { error: 'Unauthorized' } };
    }
    
    const githubToken = session.githubToken;
    // Make GitHub API call with token
    
    return { jsonBody: { result: 'success' } };
  },
});
````

### Adding Environment Variables

1. **Add to `.env.example`:**
   ````bash
   MY_NEW_VARIABLE=example_value
   ````

2. **Add to your local `.env`:**
   ````bash
   MY_NEW_VARIABLE=actual_value
   ````

3. **Access in code:**
   ````typescript
   // Frontend (must start with EXPO_PUBLIC_)
   const myVar = process.env.EXPO_PUBLIC_MY_VARIABLE;
   
   // Backend (no prefix required)
   const myVar = process.env.MY_VARIABLE;
   ````

## Testing

### Running Tests

````bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test github.test.ts
````

### Writing Tests

**Example Unit Test:**

````typescript
// src/api/github.test.ts
import { extractRepoPath } from './github';

describe('extractRepoPath', () => {
  it('should extract owner/repo from URL', () => {
    const url = 'https://api.github.com/repos/octocat/Hello-World';
    expect(extractRepoPath(url)).toBe('octocat/Hello-World');
  });
});
````

**Example Integration Test:**

````javascript
// server.test.js
const fetch = require('node-fetch');

describe('Health endpoint', () => {
  it('should return ok status', async () => {
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();
    expect(data.status).toBe('ok');
  });
});
````

## Debugging

### VS Code Debugging

**Configuration:** `.vscode/launch.json`

**Debug Expo App:**
1. Set breakpoints in TypeScript files
2. Press F5 or click "Run and Debug"
3. Select "Debug Expo App"

**Debug Backend:**
1. Set breakpoints in `server.js` or `api/src/app.js`
2. Press F5
3. Select "Debug Server"

### Console Logging

**Frontend:**
````typescript
console.log('Debug info:', variable);
console.error('Error:', error);
````

**Backend:**
````javascript
// Development (server.js)
console.log('Debug info:', variable);

// Production (Azure Functions)
context.log('Debug info:', variable);
context.error('Error:', error);
````

### React Native Debugger

1. **Enable debug mode:**
   - Shake device or press Cmd+D (iOS) / Cmd+M (Android)
   - Select "Debug Remote JS"

2. **Open Chrome DevTools:**
   - Navigate to `chrome://inspect`
   - Click "inspect" under the Expo app

### Network Debugging

**Web:** Use browser DevTools Network tab

**Mobile:** Use React Native Debugger or Flipper

## Platform-Specific Notes

### iOS Development

**Requirements:**
- macOS only
- Xcode installed

**Running:**
````bash
npm run ios
````

**Common Issues:**
- CocoaPods errors: `cd ios && pod install`
- Build failures: Clean build folder in Xcode

### Android Development

**Requirements:**
- Android Studio installed
- Android SDK configured
- Emulator or physical device

**Running:**
````bash
npm run android
````

**Common Issues:**
- Gradle errors: `cd android && ./gradlew clean`
- Metro bundler port conflict: Kill process on port 8081

### Web Development

**Running:**
````bash
npm run web
````

**Browser Support:**
- Chrome/Edge (Chromium): ✅ Recommended
- Firefox: ✅ Supported
- Safari: ✅ Supported

**Platform Detection:**
````typescript
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Web-specific code
}
````

## Troubleshooting

### "Failed to connect to auth server"

**Cause:** Express server not running

**Solution:** Start the server with `npm run dev` or `npm run server`

### "GitHub OAuth failed: bad_verification_code"

**Cause:** Code expired or already used

**Solution:** Click "Start GitHub login" again to get a new code

### "Issues won't close"

**Cause:** OAuth scope is `public_repo` instead of `repo`

**Solution:**
1. Change `EXPO_PUBLIC_GITHUB_SCOPE=repo` in `.env`
2. Sign out and sign in again

### "Cannot find module 'babel-preset-expo'"

**Cause:** Dependencies not installed

**Solution:** Run `npm install`

### "Port 3000 already in use"

**Cause:** Another process using port 3000

**Solution:**
````bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
````

### "Session expired. Please sign in again."

**Cause:** Session TTL expired (24 hours) or server restarted (in-memory sessions)

**Solution:** Click "Sign Out" and sign in again

### Type Errors After Pulling Changes

**Solution:**
````bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Clear TypeScript cache
rm -rf .tsbuildinfo

# Type-check
npx tsc --noEmit
````

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/AndreaGriffiths11/IssueCrush/issues)
- **Discussions:** [GitHub Discussions](https://github.com/AndreaGriffiths11/IssueCrush/discussions)
- **Contributing:** See [CONTRIBUTING.md](../CONTRIBUTING.md)

## Related Documentation

- [API Reference](./API.md)
- [Architecture](./ARCHITECTURE.md)
- [README](../README.md)

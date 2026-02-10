---
name: testing
description: "Comprehensive testing strategy for IssueCrush: React Native + PWA application. Handles unit, integration, e2e, accessibility, and performance testing. Optimized for hybrid mobile/web deployment."
argument-hint: "A testing task, test suite to write, bug to verify, or question about test coverage (e.g., 'write tests for Auth flow', 'set up E2E testing', 'improve PWA test coverage')"
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'agent']
---

# IssueCrush Testing Agent

## Context
IssueCrush is a **hybrid React Native + PWA application** (Expo SDK 54, React 19.1) for GitHub issue triage with:
- **Mobile**: iOS/Android (React Native 0.81)
- **Web/PWA**: React DOM with offline support + service workers
- **Backend**: Express.js for OAuth + Copilot AI proxy
- **Design**: Brutalist UI with Reanimated animations
- **Infrastructure**: GitHub API + GitHub Copilot SDK

## Primary Responsibilities

### 1. **Unit Testing**
- Test individual components, hooks, utilities in **isolation**
- Coverage: Functions, utilities, API clients, state management
- Framework: **Jest** (primary) + **React Native Testing Library** (RNTL)
- Location: `__tests__` directories adjacent to source files
- Naming: `*.test.ts(x)` or `*.spec.ts(x)`

**Key Areas to Test:**
- Authentication flows (`src/lib/tokenStorage.ts`, OAuth logic)
- GitHub API client (`src/api/github.ts`) - all endpoints
- Copilot service (`src/lib/copilotService.ts`)
- Theme context and custom hooks
- Utility functions (repo extraction, label color calculation)
- Custom React hooks (swiper state, animations)

### 2. **Integration Testing**
- Test **component interactions** with services
- Verify data flows between layers (UI → API → Backend)
- Framework: **Jest** + **React Native Testing Library**
- Location: `__tests__/integration/`

**Key Scenarios:**
- OAuth flow: Device auth → Token exchange → Issue loading
- Issue card rendering with full data (user, labels, AI summary)
- Swipe actions: Left (close) + Right (keep) + Undo
- Filter & refresh: Update issues based on repo filter
- AI summary generation: Button → API call → Display
- Error handling: Network failures, 401/404/500 responses
- Theme switching with persistence
- Mobile haptics integration

### 3. **End-to-End (E2E) Testing**
- Test **complete user flows** in real environments
- Verify PWA capabilities (installation, offline, service workers)
- Framework: **Playwright** (cross-platform, best for PWA testing)
- Location: `e2e/`
- Run in: Desktop browser + mobile emulator

**Critical User Journeys:**
1. **Authentication**: GitHub OAuth → Token storage → Redirect
2. **Issue Triage**: Load issues → Swipe card → Update state → See feedback
3. **AI Assistance**: Click "Get AI Summary" → Loading state → Display summary
4. **PWA Installation**: Redirect to install prompt → Install → View offline
5. **Mobile Native**: Haptics feedback → Web Browser deep link → Return to app
6. **Filter & Pagination**: Enter filter → Refresh → Load new issues
7. **Error Recovery**: Network disconnect → Error message → Retry success

### 4. **Accessibility Testing (a11y)**
- Ensure **inclusive UX** for all users (WCAG 2.1 AA compliance)
- Tools: **axe-core**, **axe-playwright**, manual testing
- Location: `a11y/` directory

**Areas to Check:**
- Semantic HTML in web/PWA mode
- Color contrast (Brutalist design verification)
- Keyboard navigation (all buttons, inputs, modals)
- Screen reader announcements (ARIA labels on cards, buttons)
- Focus management (swiper cards, modals, animations)
- Touch target sizes (48x48px minimum for mobile, 44x44px secondary)
- Motion preferences (respect `prefers-reduced-motion`)

### 5. **Performance Testing**
- Measure & optimize **Largest Contentful Paint (LCP)**, **First Input Delay (FID)**, **Cumulative Layout Shift (CLS)**
- Monitor bundle size, API response times, animation frame drops
- Tools: **Lighthouse**, **Web Vitals**, **React Timeline Profiler**
- Location: `performance/` directory

**Metrics to Track:**
- LCP: < 2.5s (card render)
- FID: < 100ms (swipe interaction)
- CLS: < 0.1 (animations shouldn't shift layout)
- TTI (Time to Interactive): < 3.5s on mobile 3G
- Bundle size: Keep React Native + Web < 200KB gzip
- Memory usage: Peak < 100MB on mobile
- Animation frame rate: 60fps (0 jank on swipe)

### 6. **Mobile-Specific Testing**
- Test **device-specific features**: Haptics, WebBrowser, SecureStore
- Frameworks: **Detox** (e2e) or **Appium** (for native features)
- Location: `mobile/` directory

**Features:**
- `expo-haptics`: Verify vibration feedback on iOS/Android
- `expo-secure-store`: Token persistence across app restarts
- `expo-web-browser`: OAuth callback handling
- Device orientation: Portrait/landscape responsiveness
- Network conditions: WiFi, 4G, offline scenarios
- Status bar styling: Light/dark mode on both platforms

### 7. **API & Backend Testing**
- Test **Express server** endpoints
- Framework: **Supertest** + **Jest**
- Location: `api/` or `server/__tests__/`

**Endpoints:**
- `POST /api/github-token`: OAuth token exchange (invalid code, missing secret, GitHub errors)
- `POST /api/ai-summary`: Copilot integration (missing issue, service errors, fallback)
- `GET /health`: Health check

### 8. **PWA Testing (Critical for Hybrid App)**
- Test **service worker** registration, caching, offline mode
- Verify **manifest.json** (icons, display, start_url)
- Test **install prompt** on web
- Frameworks: **Playwright**, **Chrome DevTools Protocol**, **Workbox testing**
- Location: `pwa/` directory

**Checklist:**
- Service worker: Cache strategies, update flow, error handling
- Offline functionality: Can navigate/view cached issues without network
- Installation: Works on Chrome, Firefox, Edge; shows prompt
- Responsive design: Mobile viewport (320-768px), tablet (769-1024px), desktop (> 1024px)
- Web App Manifest validation
- HTTPs requirement verification

---

## Testing Stack & Configuration

### Dependencies to Add (in order of priority)
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@testing-library/react": "^15.0.0",
    "@testing-library/react-native": "^13.1.0",
    "@testing-library/jest-dom": "^6.1.5",
    "jest-environment-jsdom": "^29.7.0",
    "jest-environment-node": "^29.7.0",
    "babel-jest": "^29.7.0",
    "ts-node": "^10.9.2",
    "@types/jest": "^29.5.11",
    
    "playwright": "^1.41.1",
    "axe-playwright": "^1.2.3",
    "axe-core": "^4.8.2",
    
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2",
    
    "workbox-precache": "^7.0.0",
    "workbox-window": "^7.0.0",
    
    "react-native-test-utils": "^1.0.0",
    "@react-native/test-app": "^0.81.0",
    
    "lighthouse": "^11.4.0",
    "web-vitals": "^3.4.0"
  }
}
```

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }],
  },
  moduleNameMapper: {
    '\\.(css|less)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'App.tsx',
    '!src/**/*.stories.tsx',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    }
  },
};
```

### Playwright Configuration (`playwright.config.ts`)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'test-results.json' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run server',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
```

---

## Testing Scripts to Add (in `package.json`)

```json
{
  "scripts": {
    "test": "jest --watch",
    "test:ci": "jest --coverage --ci",
    "test:unit": "jest --testPathPattern='__tests__' --testPathIgnorePatterns='integration|e2e'",
    "test:integration": "jest --testPathPattern='integration'",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:a11y": "jest --testPathPattern='a11y'",
    "test:perf": "jest --testPathPattern='performance'",
    "test:all": "npm run test:ci && npm run test:e2e",
    "coverage": "jest --coverage",
    "coverage:report": "npx open-cli coverage/lcov-report/index.html"
  }
}
```

---

## Test Structure Template

### Unit Test Example
```typescript
// src/__tests__/api/github.test.ts
import { fetchIssues, updateIssueState, extractRepoPath } from '@/api/github';

describe('GitHub API Client', () => {
  const mockToken = 'mock-token-xyz';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('fetchIssues()', () => {
    it('should fetch issues for authenticated user', async () => {
      const mockResponse = [
        { id: 1, number: 123, title: 'Test Issue', state: 'open' },
      ];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchIssues(mockToken);
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/issues?state=open'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should filter by repository', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await fetchIssues(mockToken, 'owner/repo');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/owner/repo/issues'),
        expect.any(Object)
      );
    });

    it('should throw on 404 (repo not found)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 404,
        ok: false,
      });

      await expect(fetchIssues(mockToken, 'invalid/repo'))
        .rejects
        .toThrow('Repository not found');
    });

    it('should throw on 401 (unauthorized)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 401,
        ok: false,
      });

      await expect(fetchIssues(mockToken))
        .rejects
        .toThrow('Unauthorized');
    });

    it('should filter out pull requests', async () => {
      const mockData = [
        { id: 1, number: 1, title: 'Issue', state: 'open' },
        { id: 2, number: 2, title: 'PR', state: 'open', pull_request: {} },
      ];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchIssues(mockToken);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Issue');
    });
  });

  describe('extractRepoPath()', () => {
    it('should extract repo path from GitHub API URL', () => {
      const url = 'https://api.github.com/repos/owner/repo';
      expect(extractRepoPath(url)).toBe('owner/repo');
    });
  });
});
```

### Integration Test Example
```typescript
// src/__tests__/integration/auth.integration.test.ts
import { render, screen, waitFor } from '@testing-library/react-native';
import App from '@/App';

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'issuecrush://callback'),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('Authentication Integration', () => {
  it('should complete OAuth flow and load issues', async () => {
    const { getByText } = render(<App />);
    
    expect(getByText('Continue with GitHub')).toBeTruthy();
  });
});
```

### E2E Test Example
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login via GitHub OAuth and load issues', async ({ page }) => {
    await page.goto('/');
    
    const authButton = page.locator('button:has-text("Continue with GitHub")');
    await expect(authButton).toBeVisible();
  });

  test('should handle failed OAuth', async ({ page }) => {
    await page.goto('/?error=access_denied');
    const errorMsg = page.locator('.error');
    await expect(errorMsg).toBeVisible();
  });
});
```

### Accessibility Test Example
```typescript
// a11y/buttons.test.ts
import { injectAxe, checkA11y } from 'axe-playwright';
import { test, expect } from '@playwright/test';

test('buttons should meet WCAG AA standards', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page);
});
```

### Performance Test Example
```typescript
// performance/core-web-vitals.test.ts
import { test, expect } from '@playwright/test';

test('should meet Core Web Vitals thresholds', async ({ page }) => {
  const metrics: any = {};
  
  page.on('console', msg => {
    if (msg.type() === 'log' && msg.text().includes('lcp=')) {
      const match = msg.text().match(/lcp=(\d+)/);
      if (match) metrics.lcp = parseInt(match[1]);
    }
  });
  
  await page.goto('/');
  await page.waitForTimeout(3000);
  
  expect(metrics.lcp).toBeLessThan(2500);
});
```

---

## Best Practices & Patterns

### 1. **Testing Pyramid** (Recommended Distribution)
- 70% Unit Tests (fast, isolated)
- 20% Integration Tests (realistic scenarios)
- 10% E2E Tests (critical user journeys)

### 2. **Mocking Strategy**
- Mock external APIs (`fetch`, GitHub API)
- Mock device features (`expo-haptics`, `expo-secure-store`, `expo-web-browser`)
- Don't mock React Native core (`View`, `Text`)
- Use real Expo modules in integration tests

### 3. **Test Data**
- Create `__mocks__/fixtures/` with realistic test data
- Use factories (e.g., `issueFactory()`) for consistent test objects
- Keep fixtures in sync with actual API responses

### 4. **CI/CD Integration (GitHub Actions)**
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: npm
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

### 5. **Coverage Goals** (By Area)
- **Authentication**: 90%+ (critical)
- **API Client**: 85%+ (critical)
- **Copilot Service**: 80%+ (important)
- **Components**: 75%+ (UI interactive)
- **Utilities**: 90%+ (should be simple)

### 6. **Mobile-Specific Patterns**
- Test **Platform.OS conditionals** separately
- Mock `useWindowDimensions` for responsive tests
- Test Reanimated animations with `runOnJS` callbacks
- Verify haptics calls with network mocks

### 7. **PWA-Specific Patterns**
- Test service worker registration in Playwright
- Verify offline capabilities with DevTools offline mode
- Test responsive breakpoints (320px, 768px, 1024px, 1920px)
- Validate Web App Manifest

---

## Common Testing Scenarios

### Scenario 1: Issue Swipe & Close
**Test Type:** Integration
```
1. Render issue card
2. Mock updateIssueState API
3. Trigger swipeLeft action
4. Assert updateIssueState called with state='closed'
5. Assert toast feedback shown
6. Assert lastClosed state updated for undo
```

### Scenario 2: AI Summary Generation
**Test Type:** Integration
```
1. Render card with "GET AI SUMMARY" button
2. Mock copilotService.summarizeIssue
3. Click button
4. Assert loading state shown
5. Wait for mock API response
6. Assert summary displayed in card
```

### Scenario 3: OAuth Token Exchange
**Test Type:** Integration
```
1. Mock fetch for token exchange
2. Call exchangeCodeForToken('auth-code')
3. Assert saveToken called
4. Assert token state updated
5. Mock tokenStorage.getToken
6. Assert token persisted correctly
```

### Scenario 4: PWA Offline Functionality
**Test Type:** E2E
```
1. Load app online
2. Cache issues
3. Go offline (DevTools)
4. Verify issues still visible
5. Attempt refresh (should show error)
6. Go online
7. Verify refresh works
```

---

## Git Pre-Commit Hooks (Optional but Recommended)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit -- --changedFilesOnly",
      "pre-push": "npm run test:ci && npm run test:e2e"
    }
  }
}
```

---

## Code Review Checklist for Tests

- [ ] Unit tests for all exported functions/components
- [ ] Integration tests for critical user flows
- [ ] E2E tests for new features/authentication
- [ ] Accessibility tests for new UI components
- [ ] Coverage maintained above thresholds
- [ ] Error cases tested (network, 401, 404, 500)
- [ ] Mobile-specific features tested on real devices/emulators
- [ ] PWA features tested in Playwright
- [ ] Performance metrics within budgets
- [ ] Tests have meaningful descriptions
- [ ] No flaky tests (deterministic)
- [ ] Mocks/stubs properly cleaned in `afterEach`

---

## Useful References

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Playwright Documentation](https://playwright.dev/)
- [Axe-core Accessibility](https://www.deque.com/axe/core/)
- [Web.dev PWA Testing](https://web.dev/pwa/)
- [GitHub Actions Workflows](https://docs.github.com/en/actions)

---

## Agent Capabilities

This agent can:
✅ Write unit tests for components and utilities  
✅ Create integration test suites for features  
✅ Set up E2E test infrastructure (Playwright)  
✅ Configure Jest + TypeScript + React Native  
✅ Write accessibility tests  
✅ Create performance test baselines  
✅ Set up GitHub Actions CI/CD test workflows  
✅ Debug failing tests and flaky tests  
✅ Improve test coverage percentages  
✅ Refactor tests for maintainability  
✅ Recommend testing patterns and best practices  

---

**Last Updated:** February 2026 | **Framework Versions:** React 19.1, React Native 0.81, Expo SDK 54, Jest 29.7
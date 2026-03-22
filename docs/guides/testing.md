# Testing Guide

This guide explains how to write and run tests for IssueCrush.

## Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Testing Patterns](#testing-patterns)
- [Test Examples](#test-examples)
- [Mocking](#mocking)
- [Coverage](#coverage)

---

## Overview

IssueCrush uses **Jest** for testing with TypeScript support via `ts-jest`.

### Test Structure

````
src/
├── api/
│   ├── github.ts
│   └── github.test.ts         # API client tests
├── lib/
│   ├── copilotService.ts
│   ├── copilotService.test.ts # Service tests
│   ├── tokenStorage.ts
│   └── tokenStorage.test.ts   # Storage tests
server.test.js                 # Server endpoint tests
````

### Test Framework

- **Test Runner**: Jest 30.3.0
- **TypeScript**: ts-jest 29.4.6
- **Config**: `jest.config.cjs`

---

## Running Tests

### Commands

````bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test github.test.ts

# Type-check without building
npx tsc --noEmit
````

### Before Committing

✅ **Always run these before committing**:

````bash
npx tsc --noEmit   # Type-check
npm test           # Run test suite
````

---

## Testing Patterns

### 1. AAA Pattern

Use **Arrange, Act, Assert** pattern:

````typescript
test('should fetch issues successfully', async () => {
  // Arrange
  const sessionId = 'test-session';
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, title: 'Test Issue' }],
  });

  // Act
  const issues = await fetchIssues(sessionId);

  // Assert
  expect(issues).toHaveLength(1);
  expect(issues[0].title).toBe('Test Issue');
});
````

### 2. Descriptive Test Names

Use `should` or `it` style naming:

✅ **Good**:
````typescript
test('should throw error when session is expired', ...)
test('should save token to SecureStore on mobile', ...)
````

❌ **Bad**:
````typescript
test('fetchIssues', ...)
test('test saveToken', ...)
````

### 3. Test File Naming

Match source file names with `.test.ts` suffix:

````
github.ts        → github.test.ts
copilotService.ts → copilotService.test.ts
tokenStorage.ts   → tokenStorage.test.ts
````

### 4. Group Related Tests

Use `describe` blocks:

````typescript
describe('fetchIssues', () => {
  test('should fetch issues with repo filter', async () => {
    // ...
  });

  test('should throw error on 401 Unauthorized', async () => {
    // ...
  });

  test('should throw error on 404 Not Found', async () => {
    // ...
  });
});
````

---

## Test Examples

### Example 1: Testing API Client

````typescript
// src/api/github.test.ts
import { fetchIssues, updateIssueState } from './github';

describe('GitHub API Client', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchIssues', () => {
    test('should fetch issues successfully', async () => {
      // Arrange
      const mockIssues = [
        { id: 1, number: 123, title: 'Bug fix' },
        { id: 2, number: 124, title: 'Feature request' },
      ];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockIssues,
      });

      // Act
      const issues = await fetchIssues('session-123');

      // Assert
      expect(issues).toEqual(mockIssues);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/issues'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Session-Token': 'session-123',
          }),
        })
      );
    });

    test('should throw error when session expires', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      // Act & Assert
      await expect(fetchIssues('expired-session')).rejects.toThrow(
        'Session expired. Please sign in again.'
      );
    });

    test('should apply repo filter', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      // Act
      await fetchIssues('session-123', 'facebook/react');

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('repo=facebook%2Freact'),
        expect.any(Object)
      );
    });
  });

  describe('updateIssueState', () => {
    test('should close issue successfully', async () => {
      // Arrange
      const issue = {
        number: 123,
        repository_url: 'https://api.github.com/repos/owner/repo',
      };
      const updatedIssue = { ...issue, state: 'closed' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => updatedIssue,
      });

      // Act
      const result = await updateIssueState('session-123', issue, 'closed');

      // Assert
      expect(result.state).toBe('closed');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/issues/owner/repo/123'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ state: 'closed' }),
        })
      );
    });
  });
});
````

### Example 2: Testing Service

````typescript
// src/lib/copilotService.test.ts
import { copilotService } from './copilotService';
import { getToken } from './tokenStorage';

jest.mock('./tokenStorage');

describe('CopilotService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    (getToken as jest.Mock).mockResolvedValue('test-session');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('summarizeIssue', () => {
    test('should return AI summary', async () => {
      // Arrange
      const issue = {
        id: 1,
        number: 123,
        title: 'Memory leak in component',
        body: 'Component leaks memory on unmount',
      };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          summary: 'This issue reports a memory leak...',
          fallback: false,
        }),
      });

      // Act
      const result = await copilotService.summarizeIssue(issue);

      // Assert
      expect(result.summary).toBe('This issue reports a memory leak...');
      expect(result.fallback).toBe(false);
    });

    test('should handle Copilot subscription required error', async () => {
      // Arrange
      const issue = { id: 1, number: 123, title: 'Test' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          requiresCopilot: true,
          message: 'Copilot subscription required',
        }),
      });

      // Act
      const result = await copilotService.summarizeIssue(issue);

      // Assert
      expect(result.requiresCopilot).toBe(true);
      expect(result.summary).toContain('Copilot subscription');
    });

    test('should throw error when no session', async () => {
      // Arrange
      (getToken as jest.Mock).mockResolvedValue(null);
      const issue = { id: 1, number: 123, title: 'Test' };

      // Act & Assert
      await expect(copilotService.summarizeIssue(issue)).rejects.toThrow(
        'No session available'
      );
    });
  });
});
````

### Example 3: Testing with Platform.OS

````typescript
// src/lib/tokenStorage.test.ts
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { saveToken, getToken, deleteToken } from './tokenStorage';

jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');

describe('tokenStorage', () => {
  describe('on mobile', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    test('should save token to SecureStore', async () => {
      // Act
      await saveToken('session-123');

      // Assert
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'issuecrush-session-id',
        'session-123'
      );
    });

    test('should get token from SecureStore', async () => {
      // Arrange
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('session-123');

      // Act
      const token = await getToken();

      // Assert
      expect(token).toBe('session-123');
    });
  });

  describe('on web', () => {
    beforeEach(() => {
      Platform.OS = 'web';
    });

    test('should save token to AsyncStorage', async () => {
      // Act
      await saveToken('session-123');

      // Assert
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'issuecrush-session-id',
        'session-123'
      );
    });

    test('should get token from AsyncStorage', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('session-123');

      // Act
      const token = await getToken();

      // Assert
      expect(token).toBe('session-123');
    });
  });
});
````

---

## Mocking

### Mock fetch

````typescript
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({ data: 'value' }),
});
````

### Mock modules

````typescript
jest.mock('./tokenStorage', () => ({
  getToken: jest.fn().mockResolvedValue('test-token'),
  saveToken: jest.fn(),
  deleteToken: jest.fn(),
}));
````

### Mock Platform.OS

````typescript
import { Platform } from 'react-native';

beforeEach(() => {
  Platform.OS = 'web'; // or 'ios', 'android'
});
````

### Mock environment variables

````typescript
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    EXPO_PUBLIC_API_URL: 'http://localhost:3000',
  };
});

afterEach(() => {
  process.env = originalEnv;
});
````

---

## Coverage

### Run Coverage Report

````bash
npm test -- --coverage
````

### Coverage Thresholds

Configure in `jest.config.cjs`:

````javascript
module.exports = {
  // ...
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
````

### Ignore Files

Add to `jest.config.cjs`:

````javascript
coveragePathIgnorePatterns: [
  '/node_modules/',
  '/coverage/',
  '.test.ts',
  'index.ts',
],
````

---

## Testing Checklist

- [ ] Test file named `*.test.ts` or `*.test.tsx`
- [ ] Tests use AAA pattern (Arrange, Act, Assert)
- [ ] Descriptive test names (use `should`)
- [ ] Related tests grouped in `describe` blocks
- [ ] Mocks cleaned up in `afterEach`
- [ ] Edge cases tested (errors, empty data, null values)
- [ ] Platform-specific code tested for both web and mobile
- [ ] Environment variables mocked when needed
- [ ] Coverage > 70% for new code

---

## Common Testing Scenarios

### Test Async Functions

````typescript
test('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
````

### Test Error Handling

````typescript
test('should throw error on invalid input', async () => {
  await expect(functionThatThrows()).rejects.toThrow('Error message');
});
````

### Test Conditional Logic

````typescript
test('should return A when condition is true', () => {
  const result = conditionalFunction(true);
  expect(result).toBe('A');
});

test('should return B when condition is false', () => {
  const result = conditionalFunction(false);
  expect(result).toBe('B');
});
````

---

## See Also

- [Component Development Guide](./component-development.md)
- [Architecture Overview](../architecture/overview.md)
- [API Reference](../api/)

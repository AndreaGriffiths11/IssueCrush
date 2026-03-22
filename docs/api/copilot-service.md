# Copilot Service

The Copilot Service (`src/lib/copilotService.ts`) provides AI-powered issue summaries using the GitHub Copilot SDK running on the backend server.

## Overview

- **Location**: `src/lib/copilotService.ts`
- **Purpose**: Generate AI summaries of GitHub issues
- **Authentication**: Session-based via `X-Session-Token` header
- **Requirement**: User must have GitHub Copilot subscription
- **Backend URL**: Set via `EXPO_PUBLIC_API_URL` environment variable

## Types

### `SummaryResult`

````typescript
interface SummaryResult {
  summary: string;         // AI-generated summary text
  fallback?: boolean;      // True if fallback summary was used
  requiresCopilot?: boolean; // True if Copilot subscription is required
}
````

## Class: `CopilotService`

### `initialize()`

Checks backend health and Copilot availability.

````typescript
async initialize(): Promise<{ copilotMode: string }>
````

**Returns:** Object with `copilotMode` indicating backend status

**Errors:**
- Throws `"Backend server not available"` if server is unreachable

**Example:**

````typescript
import { copilotService } from './lib/copilotService';

try {
  const { copilotMode } = await copilotService.initialize();
  console.log('Copilot mode:', copilotMode);
} catch (error) {
  console.error('Backend not available');
}
````

---

### `summarizeIssue()`

Generates an AI summary for a GitHub issue.

````typescript
async summarizeIssue(issue: GitHubIssue): Promise<SummaryResult>
````

**Parameters:**
- `issue` - GitHub issue object to summarize

**Returns:** `SummaryResult` with generated summary

**Errors:**
- Throws if no session is available
- Throws if session expired (401)
- Returns special result with `requiresCopilot: true` if user lacks Copilot subscription (403)
- Throws on other errors

**Example:**

````typescript
import { copilotService } from './lib/copilotService';

try {
  const result = await copilotService.summarizeIssue(issue);
  
  if (result.requiresCopilot) {
    // User needs Copilot subscription
    console.log(result.summary); // Helpful message about requiring Copilot
  } else {
    // Success
    console.log('Summary:', result.summary);
    if (result.fallback) {
      console.log('(Fallback summary used)');
    }
  }
} catch (error) {
  console.error('Failed to generate summary:', error.message);
}
````

## Singleton Instance

The module exports a singleton instance:

````typescript
export const copilotService = new CopilotService();
````

Use this instance rather than creating new instances:

````typescript
import { copilotService } from './lib/copilotService';

// ✅ Good
const result = await copilotService.summarizeIssue(issue);

// ❌ Don't do this
const service = new CopilotService();
````

## Architecture

### Request Flow

````
Client                Server                  Copilot SDK
  │                     │                         │
  │ summarizeIssue()    │                         │
  ├────────────────────>│                         │
  │                     │ createSession()         │
  │                     ├────────────────────────>│
  │                     │                         │
  │                     │ sendRequest()           │
  │                     ├────────────────────────>│
  │                     │                         │
  │                     │<────────────────────────┤
  │<────────────────────┤                         │
  │  {summary: "..."}   │                         │
````

### Why Proxy Through Backend?

1. **API Key Security** - GitHub Copilot API keys (`GH_TOKEN` or `COPILOT_PAT`) stay server-side
2. **User Subscription Check** - Server validates user has Copilot access
3. **Rate Limiting** - Server can implement request throttling
4. **Consistent Experience** - Works identically on web and mobile

### Error Handling

The service handles several error scenarios:

#### No Session (Client-Side)
````typescript
if (!sessionId) {
  throw new Error('No session available — please sign in');
}
````

#### Session Expired (401)
````typescript
if (response.status === 401) {
  throw new Error('Session expired. Please sign in again.');
}
````

#### Missing Copilot Subscription (403)
````typescript
if (response.status === 403 && data.requiresCopilot) {
  return {
    summary: data.message || 'AI summaries require a GitHub Copilot subscription.',
    requiresCopilot: true,
  };
}
````

#### Other Errors
````typescript
throw new Error(data.error || 'Failed to generate summary');
````

## Usage in Components

The `useIssues` hook wraps this service for use in components:

````typescript
import { useIssues } from './hooks/useIssues';

function MyComponent() {
  const { handleGetAiSummary, loadingAiSummary } = useIssues(token);
  
  return (
    <Button 
      onPress={handleGetAiSummary}
      disabled={loadingAiSummary}
    >
      Get AI Summary
    </Button>
  );
}
````

The hook automatically:
- Checks if summary already exists
- Sets loading state
- Updates issue with summary
- Handles errors

## Configuration

### Environment Variables

- `EXPO_PUBLIC_API_URL` - Backend server URL (e.g., `http://localhost:3000`)

### Server Requirements

The backend must:
1. Have `GH_TOKEN` or `COPILOT_PAT` environment variable set
2. Implement `/api/ai-summary` endpoint
3. Use GitHub Copilot SDK 0.1.32+
4. Include `onPermissionRequest: approveAll` in session creation

See [Server Endpoints](./server-endpoints.md#post-apiai-summary) for backend implementation details.

## Testing

See `src/lib/copilotService.test.ts` for unit tests with mocked responses.

## Related

- [Server Endpoints](./server-endpoints.md) - Backend AI proxy implementation
- [useIssues Hook](../hooks/README.md#useissues) - Hook that uses this service
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk) - Underlying AI SDK

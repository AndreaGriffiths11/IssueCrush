# Copilot Service API Reference

Client-side service for generating AI summaries using GitHub Copilot SDK.

## Module: `src/lib/copilotService.ts`

## Class: CopilotService

### initialize()

Checks backend health and Copilot availability.

````typescript
async initialize(): Promise<{ copilotMode: string }>
````

**Returns:** Object with Copilot mode (`"copilot-sdk"`, `"fallback"`, or `"unknown"`)

**Throws:** `"Backend server not available"` if cannot connect

### summarizeIssue()

Generates AI summary for a GitHub issue.

````typescript
async summarizeIssue(issue: GitHubIssue): Promise<SummaryResult>
````

**Parameters:**
- `issue` - GitHub issue object

**Returns:**
````typescript
{
  summary: string;         // AI-generated summary or fallback
  fallback?: boolean;      // true if using description fallback
  requiresCopilot?: boolean; // true if Copilot access required
}
````

**Throws:**
- `"No session available — please sign in"`
- `"Session expired. Please sign in again."` (401)
- `"Failed to generate summary"` (other errors)

## Usage Example

````typescript
import { copilotService } from './lib/copilotService';

const result = await copilotService.summarizeIssue(issue);
if (result.requiresCopilot) {
  console.log('Copilot subscription required');
} else if (result.fallback) {
  console.log('Using issue description (no Copilot)');
} else {
  console.log('AI summary:', result.summary);
}
````

## Related Documentation

- [Hooks API Reference](./hooks.md)
- [Backend Endpoints Reference](./backend-endpoints.md)
- [Configure Copilot](../../how-to/configure-copilot.md)

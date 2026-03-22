import type { GitHubIssue } from '../api/github';
import { getToken } from './tokenStorage';

export interface SummaryResult {
  summary: string;
  fallback?: boolean;
  requiresCopilot?: boolean;
}

/**
 * Service for interacting with AI-powered features via GitHub Copilot SDK.
 * 
 * Handles health checks and issue summarization through the backend API.
 */
export class CopilotService {
  private backendUrl = process.env.EXPO_PUBLIC_API_URL || '';

  /**
   * Checks if the backend API is available and Copilot features are enabled.
   * 
   * @returns Promise resolving to object with copilotMode status
   * @throws Error if backend is not reachable
   * 
   * @example
   * const { copilotMode } = await copilotService.initialize();
   */
  async initialize(): Promise<{ copilotMode: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/api/health`);
      const data = await response.json();

      console.log('Backend health check:', data);
      return { copilotMode: data.copilotMode || 'unknown' };
    } catch (error) {
      console.error('Failed to connect to backend:', error);
      throw new Error('Backend server not available');
    }
  }

  /**
   * Generates an AI-powered summary of a GitHub issue.
   * 
   * Requires the user to have a GitHub Copilot subscription. The backend uses
   * the user's GitHub token to access the Copilot SDK and generate a 2-3
   * sentence summary for quick triage.
   * 
   * @param issue - GitHub issue object to summarize
   * @returns Promise resolving to SummaryResult with summary text and metadata
   * @throws Error if session is expired or summary generation fails
   * 
   * @example
   * const result = await copilotService.summarizeIssue(issue);
   * if (result.requiresCopilot) {
   *   console.log("User needs Copilot subscription");
   * } else {
   *   console.log(result.summary);
   * }
   */
  async summarizeIssue(issue: GitHubIssue): Promise<SummaryResult> {
    try {
      const sessionId = await getToken();

      if (!sessionId) {
        throw new Error('No session available — please sign in');
      }

      const response = await fetch(`${this.backendUrl}/api/ai-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionId,
        },
        body: JSON.stringify({ issue }),
      });

      const data = await response.json();
      const isUnauthorized = response.status === 401;
      const isForbiddenCopilot = response.status === 403 && data.requiresCopilot;

      if (!response.ok) {
        if (isUnauthorized) {
          throw new Error('Session expired. Please sign in again.');
        }
        if (isForbiddenCopilot) {
          const copilotMessage = data.message || 'AI summaries require a GitHub Copilot subscription.';
          return {
            summary: copilotMessage,
            requiresCopilot: true,
          };
        }
        throw new Error(data.error || 'Failed to generate summary');
      }

      return {
        summary: data.summary || 'Unable to generate summary',
        fallback: data.fallback || false,
      };
    } catch (error) {
      console.error('Copilot summarization error:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance of CopilotService for application-wide use.
 * 
 * @example
 * import { copilotService } from './lib/copilotService';
 * 
 * const result = await copilotService.summarizeIssue(issue);
 */
export const copilotService = new CopilotService();

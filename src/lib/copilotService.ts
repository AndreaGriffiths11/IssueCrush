import type { GitHubIssue } from '../api/github';
import { getToken } from './tokenStorage';

export interface SummaryResult {
  summary: string;
  fallback?: boolean;
  requiresCopilot?: boolean;
}

export class CopilotService {
  private backendUrl = process.env.EXPO_PUBLIC_API_URL || '';

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

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please sign in again.');
        }
        if (response.status === 403 && data.requiresCopilot) {
          return {
            summary: data.message || 'AI summaries require a GitHub Copilot subscription.',
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

export const copilotService = new CopilotService();

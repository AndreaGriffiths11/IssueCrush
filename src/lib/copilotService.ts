import type { GitHubIssue } from '../api/github';

export class CopilotService {
  private backendUrl = 'http://localhost:3000';

  async initialize() {
    try {
      const response = await fetch(`${this.backendUrl}/health`);
      const data = await response.json();

      if (!data.copilotAvailable) {
        throw new Error('Copilot CLI not available on server. Install it first: brew install gh-copilot');
      }

      console.log('Copilot available via backend');
    } catch (error) {
      console.error('Failed to connect to backend:', error);
      throw new Error('Backend server not available. Make sure to run: npm run server');
    }
  }

  async summarizeIssue(issue: GitHubIssue): Promise<string> {
    try {
      const response = await fetch(`${this.backendUrl}/api/ai-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ issue }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate summary');
      }

      const data = await response.json();
      return data.summary || 'Unable to generate summary';
    } catch (error) {
      console.error('Copilot summarization error:', error);
      throw error;
    }
  }

  async getTriageRecommendation(issue: GitHubIssue): Promise<{
    action: 'close' | 'keep' | 'escalate';
    confidence: number;
    reasoning: string;
  }> {
    throw new Error('Not implemented yet');
  }

  async cleanup() {
  }
}

export const copilotService = new CopilotService();

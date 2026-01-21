import { CopilotClient, CopilotSession } from '@github/copilot-sdk';
import type { GitHubIssue } from '../api/github';

export class CopilotService {
  private client: CopilotClient | null = null;
  private session: CopilotSession | null = null;

  async initialize() {
    if (this.client && this.session) return;

    try {
      this.client = new CopilotClient();
      this.session = await this.client.createSession();
      console.log('Copilot SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Copilot SDK:', error);
      throw new Error('Copilot CLI not available. Install it first: https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli');
    }
  }

  async summarizeIssue(issue: GitHubIssue): Promise<string> {
    if (!this.session) {
      throw new Error('Copilot session not initialized');
    }

    const prompt = this.buildSummaryPrompt(issue);

    try {
      const response = await this.session.sendAndWait({
        prompt,
      });

      return response.data.content || 'Unable to generate summary';
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
    if (!this.session) {
      throw new Error('Copilot session not initialized');
    }

    const prompt = this.buildTriagePrompt(issue);

    try {
      const response = await this.session.sendAndWait({
        prompt,
      });

      return this.parseTriageResponse(response.data.content || '');
    } catch (error) {
      console.error('Copilot triage error:', error);
      throw error;
    }
  }

  private buildSummaryPrompt(issue: GitHubIssue): string {
    const labels = issue.labels?.map(l => l.name).join(', ') || 'none';

    return `Analyze this GitHub issue and provide a concise 2-3 sentence summary:

Repository: ${issue.repository?.full_name || 'Unknown'}
Issue #${issue.number}: ${issue.title}
Labels: ${labels}
State: ${issue.state}
URL: ${issue.html_url}

Provide a brief, actionable summary focusing on:
1. What the issue is about
2. Key technical details
3. Current status or action needed

Keep it concise and developer-friendly.`;
  }

  private buildTriagePrompt(issue: GitHubIssue): string {
    const labels = issue.labels?.map(l => l.name).join(', ') || 'none';

    return `As a developer triaging GitHub issues, analyze this issue and recommend an action:

Repository: ${issue.repository?.full_name || 'Unknown'}
Issue #${issue.number}: ${issue.title}
Labels: ${labels}
State: ${issue.state}

Respond in this exact JSON format:
{
  "action": "close" | "keep" | "escalate",
  "confidence": 0-100,
  "reasoning": "brief explanation"
}

Criteria:
- "close": Issue is resolved, duplicate, invalid, or stale
- "keep": Issue is valid and needs attention
- "escalate": Critical bug or high-priority feature

Be concise.`;
  }

  private parseTriageResponse(response: string): {
    action: 'close' | 'keep' | 'escalate';
    confidence: number;
    reasoning: string;
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        action: parsed.action || 'keep',
        confidence: parsed.confidence || 50,
        reasoning: parsed.reasoning || 'Unable to determine',
      };
    } catch (error) {
      console.error('Failed to parse triage response:', error);
      return {
        action: 'keep',
        confidence: 0,
        reasoning: 'Failed to analyze issue',
      };
    }
  }

  async cleanup() {
    if (this.session) {
      try {
        await this.session.destroy();
        this.session = null;
      } catch (error) {
        console.error('Error cleaning up Copilot session:', error);
      }
    }
    if (this.client) {
      try {
        await this.client.stop();
        this.client = null;
      } catch (error) {
        console.error('Error stopping Copilot client:', error);
      }
    }
  }
}

export const copilotService = new CopilotService();

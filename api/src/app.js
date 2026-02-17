import { app } from '@azure/functions';
import { createSession, destroySession, resolveSession } from './sessionStore.js';

const GITHUB_API = 'https://api.github.com';

const githubHeaders = (token) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
});

// ─── Health ──────────────────────────────────────────────────
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async () => ({
    jsonBody: {
      status: 'ok',
      copilotAvailable: true,
      message: 'AI summaries powered by GitHub Copilot',
    },
  }),
});

// ─── OAuth token exchange → session ──────────────────────────
app.http('githubToken', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'github-token',
  handler: async (request, context) => {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return { status: 400, jsonBody: { error: 'No authorization code provided' } };
    }

    const clientId = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return { status: 500, jsonBody: { error: 'Missing GitHub credentials' } };
    }

    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
      });

      const data = await response.json();

      if (data.error) {
        return { status: 400, jsonBody: { error: data.error, error_description: data.error_description } };
      }

      if (data.access_token) {
        const sessionId = await createSession(data.access_token);
        return { jsonBody: { session_id: sessionId } };
      }

      return { status: 400, jsonBody: { error: 'No access token received' } };
    } catch (error) {
      context.error('OAuth exchange error:', error);
      return { status: 500, jsonBody: { error: error.message } };
    }
  },
});

// ─── Logout ──────────────────────────────────────────────────
app.http('logout', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'logout',
  handler: async (request) => {
    const session = await resolveSession(request);
    if (session) await destroySession(session.sessionId);
    return { jsonBody: { ok: true } };
  },
});

// ─── Fetch issues (proxied) ─────────────────────────────────
app.http('issues', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'issues',
  handler: async (request, context) => {
    const session = await resolveSession(request);

    if (!session) {
      return { status: 401, jsonBody: { error: 'Session expired or invalid. Please sign in again.' } };
    }

    const repo = request.query.get('repo');
    const labels = request.query.get('labels');
    const token = session.githubToken;

    try {
      let url;
      if (repo) {
        const params = new URLSearchParams({ state: 'open', per_page: '100' });
        if (labels) params.set('labels', labels);
        url = `${GITHUB_API}/repos/${repo}/issues?${params}`;
      } else {
        const queryParts = ['is:open', 'is:issue', 'assignee:@me'];
        if (labels) {
          labels.split(',').forEach((label) => {
            const trimmed = label.trim();
            if (trimmed) queryParts.push(`label:"${trimmed}"`);
          });
        }
        url = `${GITHUB_API}/search/issues?q=${encodeURIComponent(queryParts.join(' '))}&per_page=100&sort=updated&order=desc`;
      }

      const response = await fetch(url, { headers: githubHeaders(token) });

      if (response.status === 401) return { status: 401, jsonBody: { error: 'Unauthorized. Please sign in again.' } };
      if (response.status === 404) return { status: 404, jsonBody: { error: 'Repository not found or you lack access.' } };
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        return { status: response.status, jsonBody: { error: body.message || 'Failed to fetch issues.' } };
      }

      const data = await response.json();
      const issues = repo ? data : data.items;
      const filtered = issues.filter((i) => !i.pull_request);
      return { jsonBody: filtered };
    } catch (error) {
      context.error('Fetch issues error:', error);
      return { status: 500, jsonBody: { error: error.message } };
    }
  },
});

// ─── Update issue state (proxied) ───────────────────────────
app.http('issuesUpdate', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'issues/{owner}/{repo}/{number}',
  handler: async (request, context) => {
    const session = await resolveSession(request);
    if (!session) {
      return { status: 401, jsonBody: { error: 'Session expired or invalid. Please sign in again.' } };
    }

    const { owner, repo, number } = request.params;
    const { state } = await request.json();
    const token = session.githubToken;

    try {
      const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${number}`, {
        method: 'PATCH',
        headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        return { status: response.status, jsonBody: { error: body.message || `Unable to set issue to ${state}.` } };
      }

      return { jsonBody: await response.json() };
    } catch (error) {
      context.error('Update issue error:', error);
      return { status: 500, jsonBody: { error: error.message } };
    }
  },
});

// ─── AI Summary (Copilot SDK) ───────────────────────────────
app.http('aiSummary', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ai-summary',
  handler: async (request, context) => {
    const session = await resolveSession(request);
    if (!session) {
      return { status: 401, jsonBody: { error: 'Session expired or invalid. Please sign in again.' } };
    }

    const { issue } = await request.json();
    if (!issue) {
      return { status: 400, jsonBody: { error: 'No issue provided' } };
    }

    context.log(`Generating AI Summary for issue #${issue.number}: ${issue.title}`);

    let client = null;
    let copilotSession = null;

    try {
      const { CopilotClient } = await import('@github/copilot-sdk');
      client = new CopilotClient();
      await client.start();
      copilotSession = await client.createSession({ model: 'gpt-4.1' });

      const prompt = `You are analyzing a GitHub issue to help a developer quickly understand it and decide how to handle it.

Issue Details:
- Title: ${issue.title}
- Number: #${issue.number}
- Repository: ${issue.repository?.full_name || 'Unknown'}
- State: ${issue.state}
- Labels: ${issue.labels?.length ? issue.labels.map((l) => l.name).join(', ') : 'None'}
- Created: ${issue.created_at}
- Author: ${issue.user?.login || 'Unknown'}

Issue Body:
${issue.body || 'No description provided.'}

Provide a concise 2-3 sentence summary that:
1. Explains what the issue is about
2. Identifies the key problem or request
3. Suggests a recommended action (e.g., "needs investigation", "ready to implement", "assign to backend team", "close as duplicate")

Keep it clear, actionable, and helpful for quick triage. No markdown formatting.`;

      // Use send() + event listener instead of sendAndWait() which hangs
      const summary = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Copilot response timeout')), 30000);
        copilotSession.on('assistant.message', (event) => {
          clearTimeout(timeout);
          resolve(event.data.content);
        });
        copilotSession.on('error', (event) => {
          clearTimeout(timeout);
          reject(new Error(event.data?.message || 'Copilot session error'));
        });
        copilotSession.send({ prompt }).catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      if (summary) {
        if (copilotSession) await copilotSession.destroy().catch(() => {});
        if (client) await client.stop().catch(() => {});
        return { jsonBody: { summary } };
      }
      throw new Error('No content received from Copilot');
    } catch (error) {
      try {
        if (copilotSession) await copilotSession.destroy().catch(() => {});
        if (client) await client.stop().catch(() => {});
      } catch { /* ignore cleanup errors */ }

      const msg = error.message.toLowerCase();
      if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('forbidden') || msg.includes('403') || msg.includes('copilot') || msg.includes('subscription')) {
        return {
          status: 403,
          jsonBody: {
            error: 'Copilot access required',
            message: 'AI summaries require a GitHub Copilot subscription.',
            requiresCopilot: true,
          },
        };
      }

      // Fallback summary
      const parts = [issue.title];
      if (issue.labels?.length) parts.push('\nLabels: ' + issue.labels.map((l) => l.name).join(', '));
      if (issue.body) {
        const first = issue.body.split(/[.!?]\s/)[0];
        if (first && first.length < 200) parts.push('\n\n' + first + '.');
      }
      parts.push('\n\nReview the full issue details to determine next steps.');

      return { jsonBody: { summary: parts.join(''), fallback: true } };
    }
  },
});

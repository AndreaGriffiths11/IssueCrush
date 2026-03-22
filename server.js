require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initCosmos, createSession, destroySession, sessionMiddleware, requireSession } = require('./sessionStore');

// Prevent unhandled errors from crashing the server
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server continues):', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection (server continues):', err?.message || err);
});

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_API = 'https://api.github.com';

console.log('\ud83d\ude80 IssueCrush API Server starting...');
console.log('   AI summaries powered by GitHub Copilot SDK');
console.log('   Requires: User must have GitHub Copilot subscription');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(sessionMiddleware());

// OAuth callback relay — GitHub redirects here, server relays code to Expo frontend
// (GitHub App only knows about port 3000; Expo runs on 8081)
app.get('/callback', (req, res) => {
  const params = new URLSearchParams();
  const code = req.query.code;
  const state = req.query.state;
  const error = req.query.error;
  if (code) params.set('code', code);
  if (state) params.set('state', state);
  if (error) params.set('error', error || 'oauth_failed');
  const frontendUrl = process.env.EXPO_PUBLIC_FRONTEND_URL || 'http://localhost:8081';
  const redirectUrl = `${frontendUrl}?${params.toString()}`;
  res.redirect(redirectUrl);
});

// OAuth token exchange — stores token server-side, returns session ID
app.post('/api/github-token', async (req, res) => {
  console.log('📥 Token exchange request received');
  const { code } = req.body;
  const codePreview = code ? code.substring(0, 8) + '...' : 'missing';
  console.log('   Code:', codePreview);

  if (!code) {
    console.log('   ❌ No code provided');
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  const clientId = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const clientIdPreview = clientId ? clientId.substring(0, 8) + '...' : 'missing';
  const clientSecretStatus = clientSecret ? 'set' : 'missing';
  console.log('   Client ID:', clientIdPreview);
  console.log('   Client Secret:', clientSecretStatus);

  if (!clientId || !clientSecret) {
    console.log('   ❌ Missing credentials');
    return res.status(500).json({ error: 'Missing GitHub credentials' });
  }

  try {
    console.log('   Exchanging code with GitHub...');
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({
        error: data.error,
        error_description: data.error_description,
      });
    }

    if (data.access_token) {
      // Store token server-side, return opaque session ID
      const sessionId = await createSession(data.access_token);
      return res.json({ session_id: sessionId });
    }

    return res.status(400).json({ error: 'No access token received' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Logout — destroy server-side session
app.post('/api/logout', async (req, res) => {
  if (req.sessionId) {
    await destroySession(req.sessionId);
  }
  res.json({ ok: true });
});

// Health check endpoint (mirrors Azure Functions /api/health route)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    copilotAvailable: true,
    message: 'AI summaries powered by GitHub Copilot'
  });
});

// ─── GitHub API Proxy ───────────────────────────────────────
// Client never touches the GitHub token — server proxies all calls.

const githubHeaders = (token) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
});

// Fetch issues (search or by repo)
app.get('/api/issues', requireSession(), async (req, res) => {
  const { repo, labels } = req.query;
  const token = req.githubToken;

  try {
    let url;
    if (repo) {
      const params = new URLSearchParams({ state: 'open', per_page: '100' });
      if (labels) params.set('labels', labels);
      url = `${GITHUB_API}/repos/${repo}/issues?${params}`;
    } else {
      const queryParts = ['is:open', 'is:issue', 'assignee:@me'];
      if (labels) {
        const labelList = labels.split(',');
        labelList.forEach((label) => {
          const trimmedLabel = label.trim();
          if (trimmedLabel) queryParts.push(`label:"${trimmedLabel}"`);
        });
      }
      const searchQuery = queryParts.join(' ');
      const encodedQuery = encodeURIComponent(searchQuery);
      url = `${GITHUB_API}/search/issues?q=${encodedQuery}&per_page=100&sort=updated&order=desc`;
    }

    const response = await fetch(url, { headers: githubHeaders(token) });

    if (response.status === 401) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in again.' });
    }
    if (response.status === 404) {
      return res.status(404).json({ error: 'Repository not found or you lack access.' });
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: body.message || 'Failed to fetch issues.' });
    }

    const data = await response.json();
    // Search API wraps results in { items: [...] }
    const issues = repo ? data : data.items;
    // Filter out pull requests
    const issuesWithoutPRs = issues.filter((i) => !i.pull_request);
    res.json(issuesWithoutPRs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update issue state (close / reopen)
app.patch('/api/issues/:owner/:repo/:number', requireSession(), async (req, res) => {
  const { owner, repo, number } = req.params;
  const { state } = req.body;
  const token = req.githubToken;

  try {
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${number}`, {
      method: 'PATCH',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: body.message || `Unable to set issue to ${state}.` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// AI Summary endpoint - uses Copilot SDK with user's GitHub token
app.post('/api/ai-summary', requireSession(), async (req, res) => {
  const { issue } = req.body;

  if (!issue) {
    console.log('\u274c AI Summary request missing issue data');
    return res.status(400).json({ error: 'No issue provided' });
  }

  console.log(`\n\ud83e\udd16 Generating AI Summary for issue #${issue.number}: ${issue.title}`);

  let client = null;
  let session = null;

  try {
    const { CopilotClient, approveAll } = await import('@github/copilot-sdk');

    // Use the logged-in user's GitHub OAuth token
    client = new CopilotClient({ githubToken: req.githubToken });
    await client.start();

    session = await client.createSession({
      model: 'gpt-4.1',
      onPermissionRequest: approveAll,
    });

    const prompt = `You are analyzing a GitHub issue to help a developer quickly understand it and decide how to handle it.

Issue Details:
- Title: ${issue.title}
- Number: #${issue.number}
- Repository: ${issue.repository?.full_name || 'Unknown'}
- State: ${issue.state}
- Labels: ${issue.labels?.length ? issue.labels.map(l => l.name).join(', ') : 'None'}
- Created: ${issue.created_at}
- Author: ${issue.user?.login || 'Unknown'}

Issue Body:
${issue.body || 'No description provided.'}

Provide a concise 2-3 sentence summary that:
1. Explains what the issue is about
2. Identifies the key problem or request
3. Suggests a recommended action (e.g., "needs investigation", "ready to implement", "assign to backend team", "close as duplicate")

Keep it clear, actionable, and helpful for quick triage. No markdown formatting.`;

    console.log('   Sending prompt to Copilot...');
    const response = await session.sendAndWait({ prompt }, 30000);

    let summary;
    if (response && response.data && response.data.content) {
      summary = response.data.content;
      console.log('\u2705 AI Summary generated successfully');
    } else {
      throw new Error('No content received from Copilot');
    }

    if (session) await session.destroy().catch(() => {});
    if (client) await client.stop().catch(() => {});

    res.json({ summary });

  } catch (error) {
    console.error('\u274c AI Summary failed:', error.message);

    try {
      if (session) await session.destroy().catch(() => {});
      if (client) await client.stop().catch(() => {});
    } catch (_) {}

    const msg = error.message.toLowerCase();
    if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden')) {
      return res.status(403).json({
        error: 'Copilot access required',
        message: 'AI summaries require a GitHub Copilot subscription.',
        requiresCopilot: true
      });
    }

    const fallbackSummary = generateFallbackSummary(issue);
    res.json({
      summary: fallbackSummary,
      fallback: true,
      note: 'AI summary unavailable — showing basic analysis'
    });
  }
});

// Generate a basic summary without AI
function generateFallbackSummary(issue) {
  const parts = [];

  parts.push(`\ud83d\udccb ${issue.title}`);

  if (issue.labels?.length) {
    parts.push(`\nLabels: ${issue.labels.map(l => l.name).join(', ')}`);
  }

  if (issue.body) {
    // Extract first meaningful sentence
    const sentences = issue.body.split(/[.!?]\s/);
    const firstSentence = sentences[0];
    const isShortEnough = firstSentence && firstSentence.length < 200;
    if (isShortEnough) {
      parts.push(`\n\n${firstSentence}.`);
    }
  }

  parts.push('\n\n\ud83d\udca1 Review the full issue details to determine next steps.');

  return parts.join('');
}


app.listen(PORT, async () => {
  await initCosmos();
  console.log(`\n\u2705 Server running on http://localhost:${PORT}`);
  console.log(`   POST /api/github-token - OAuth → session ID`);
  console.log(`   POST /api/logout       - Destroy session`);
  console.log(`   GET  /api/issues       - Fetch issues (proxied)`);
  console.log(`   PATCH /api/issues/:o/:r/:n - Update issue state (proxied)`);
  console.log(`   POST /api/ai-summary   - Generate AI summary (requires Copilot)`);
  console.log(`   GET  /health           - Health check\n`);
});

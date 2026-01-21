import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { CopilotClient } from '@github/copilot-sdk';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Copilot client
let copilotClient = null;
let copilotSession = null;

async function initializeCopilot() {
  if (copilotClient && copilotSession) return true;
  
  try {
    console.log('Initializing Copilot SDK...');
    copilotClient = new CopilotClient();
    await copilotClient.start();
    console.log('Creating Copilot session...');
    copilotSession = await copilotClient.createSession();
    console.log('Copilot SDK initialized successfully');
    return true;
  } catch (error) {
    console.error('Copilot not available:', error.message);
    copilotClient = null;
    copilotSession = null;
    return false;
  }
}

// Initialize on startup
initializeCopilot();

app.post('/api/github-token', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  const clientId = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Missing GitHub credentials' });
  }

  try {
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
      return res.json({ access_token: data.access_token });
    }

    res.status(400).json({ error: 'No access token received' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    copilotAvailable: copilotClient !== null && copilotSession !== null
  });
});

app.post('/api/ai-summary', async (req, res) => {
  const { issue } = req.body;

  if (!issue) {
    return res.status(400).json({ error: 'No issue provided' });
  }

  // Check if Copilot is available
  const copilotReady = await initializeCopilot();
  
  if (!copilotReady || !copilotSession) {
    return res.status(503).json({ 
      error: 'Copilot not available. Install GitHub Copilot CLI first.',
      details: 'Run: npm install -g @github/copilot'
    });
  }

  try {
    const labels = issue.labels?.map(l => l.name).join(', ') || 'none';
    
    const prompt = `Analyze this GitHub issue and provide a concise 2-3 sentence summary:

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

    console.log('Sending prompt to Copilot...');
    const response = await copilotSession.sendAndWait({ prompt });

    const summary = response?.data?.content || 'Unable to generate summary';
    console.log('Received AI summary');

    res.json({ summary });
  } catch (error) {
    console.error('AI summary error:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI summary',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

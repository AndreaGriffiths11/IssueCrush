require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
  res.json({ status: 'ok', copilotAvailable: true });
});

app.post('/api/ai-summary', async (req, res) => {
  const { issue } = req.body;

  if (!issue) {
    console.log('❌ AI Summary request missing issue data');
    return res.status(400).json({ error: 'No issue provided' });
  }

  console.log(`\n🤖 Generating AI Summary for issue #${issue.number}: ${issue.title}`);
  console.log(`   Repository: ${issue.repository?.full_name || 'Unknown'}`);

  try {
    const { CopilotClient } = await import('@github/copilot-sdk');
    
    console.log('   Initializing Copilot SDK...');
    const client = new CopilotClient();
    await client.start();
    
    console.log('   Creating Copilot session...');
    const session = await client.createSession();
    
    // Build the prompt for Copilot
    const promptLines = [
      'You are analyzing a GitHub issue to help a developer quickly understand it and decide how to handle it.',
      '',
      'Issue Details:',
      `- Title: ${issue.title}`,
      `- Number: #${issue.number}`,
      `- Repository: ${issue.repository?.full_name || 'Unknown'}`,
      `- State: ${issue.state}`,
      `- Labels: ${issue.labels?.length ? issue.labels.map(l => l.name).join(', ') : 'None'}`,
      `- Created: ${issue.created_at}`,
      `- Author: ${issue.user?.login || 'Unknown'}`,
      '',
      'Issue Body:',
      issue.body || 'No description provided.',
      '',
      'Provide a concise 2-3 sentence summary that:',
      '1. Explains what the issue is about',
      '2. Identifies the key problem or request',
      '3. Suggests a recommended action (e.g., "needs investigation", "ready to implement", "assign to backend team", "close as duplicate")',
      '',
      'Keep it clear, actionable, and helpful for quick triage. No markdown formatting.'
    ];
    
    const prompt = promptLines.join('\n');
    
    console.log('   Sending prompt to Copilot...');
    const response = await session.sendAndWait({ prompt });
    
    let summary;
    if (response && response.data && response.data.content) {
      summary = response.data.content;
      console.log('✅ AI Summary generated successfully');
      console.log(`   Summary: ${summary.substring(0, 100)}...`);
    } else {
      throw new Error('No content received from Copilot');
    }
    
    await session.destroy();
    await client.stop();
    
    res.json({ summary });
  } catch (error) {
    console.error('❌ AI Summary generation failed:', error.message);
    console.error('   Stack:', error.stack);
    
    // Fallback to basic summary
    const fallbackSummary = `📋 ${issue.title}\n\n${issue.labels?.length ? `Labels: ${issue.labels.map(l => l.name).join(', ')}` : 'No labels'}\n\n💡 Recommended Action: Review the issue details${issue.body ? ' and description' : ''} to determine next steps.`;
    
    console.log('   Using fallback summary');
    res.json({ summary: fallbackSummary });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

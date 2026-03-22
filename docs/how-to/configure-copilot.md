# How to Configure GitHub Copilot SDK

This guide shows you how to enable AI-powered issue summaries using the GitHub Copilot SDK.

## Prerequisites

- GitHub Copilot subscription or access
- GitHub personal access token (PAT) with Copilot permissions

## Step 1: Generate GitHub Token

1. Go to https://github.com/settings/tokens
2. Click **Generate new token** → **Generate new token (classic)**
3. Set scopes: `copilot`
4. Click **Generate token**
5. Copy the token (starts with `ghp_` or `ghu_`)

## Step 2: Configure Environment

### Local Development

Edit `.env`:

````bash
GH_TOKEN=ghp_your_token_here
# or
COPILOT_PAT=ghp_your_token_here
````

Restart server: `npm run server`

### Azure Static Web Apps

1. Azure Portal → Static Web App → Configuration
2. Add variable:
   - Name: `GH_TOKEN`
   - Value: Your GitHub token
3. Click **Save**

## Step 3: Verify

1. Visit `/api/health`
2. Check response:
   ````json
   {
     "status": "healthy",
     "copilotMode": "copilot-sdk",
     "copilotAvailable": true
   }
   ````

## Usage

Click **"✨ Get AI Summary"** on any issue card to generate an AI summary.

## Related Documentation

- [Hooks API Reference](../reference/api/hooks.md)
- [Copilot Service API](../reference/api/copilot-service.md)

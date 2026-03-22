# Deployment Guide

This guide covers deploying IssueCrush to Azure Static Web Apps, Vercel, Netlify, or other cloud platforms.

## Table of Contents

- [Azure Static Web Apps (Recommended)](#azure-static-web-apps-recommended)
- [Vercel](#vercel)
- [Netlify](#netlify)
- [Docker](#docker)
- [Mobile App Deployment](#mobile-app-deployment)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)

---

## Azure Static Web Apps (Recommended)

IssueCrush is optimized for Azure Static Web Apps with built-in Azure Functions support.

### Prerequisites

- Azure account ([create free account](https://azure.microsoft.com/free/))
- GitHub repository (already set up)
- Azure CLI (optional, for manual setup)

### Automated Deployment (GitHub Actions)

The repository includes a pre-configured GitHub Actions workflow.

**1. Create Azure Static Web App**

````bash
# Using Azure Portal
1. Go to https://portal.azure.com
2. Create a resource → Static Web App
3. Select your GitHub repository and branch (main)
4. Build preset: React
5. App location: /
6. Api location: api
7. Output location: dist
````

**2. Configure Environment Variables**

In Azure Portal, go to your Static Web App → Configuration → Application settings:

````
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

**Note:** Frontend environment variables (`EXPO_PUBLIC_*`) must be set at **build time**. Add them to the GitHub Actions workflow file (`.github/workflows/azure-swa.yml`):

````yaml
env:
  EXPO_PUBLIC_GITHUB_CLIENT_ID: ${{ secrets.GITHUB_CLIENT_ID }}
  EXPO_PUBLIC_GITHUB_SCOPE: repo
  EXPO_PUBLIC_API_URL: ''  # Empty for same-origin (SWA routing)
````

**3. Update GitHub OAuth App**

In your GitHub OAuth App settings:
- **Homepage URL:** `https://your-app.azurestaticapps.net`
- **Authorization callback URL:** `https://your-app.azurestaticapps.net`

**4. Deploy**

Push to `main` branch — GitHub Actions will automatically build and deploy.

````bash
git push origin main
````

View deployment status in GitHub Actions tab.

---

### Azure Static Web Apps Configuration

The `staticwebapp.config.json` file configures routing and security headers:

````json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/*.{png,jpg,gif,css,js,ico,svg,woff,woff2,json,map}"]
  },
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  },
  "routes": [
    {
      "route": "/api/*",
      "methods": ["GET", "POST", "PATCH", "DELETE"],
      "allowedRoles": ["anonymous"]
    }
  ]
}
````

**Key Features:**
- SPA fallback to `/index.html` for client-side routing
- Security headers (XSS protection, clickjacking prevention)
- API routes proxied to Azure Functions

---

### Azure Cosmos DB Setup

**1. Create Cosmos DB Account**

````bash
# Using Azure CLI
az cosmosdb create \
  --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --kind GlobalDocumentDB \
  --locations regionName=eastus
````

**2. Get Connection Details**

````bash
# Get endpoint
az cosmosdb show --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --query documentEndpoint -o tsv

# Get primary key
az cosmosdb keys list --name issuecrush-cosmos \
  --resource-group issuecrush-rg \
  --query primaryMasterKey -o tsv
````

**3. Database and Container**

The application auto-creates the database and container on first run with these settings:

- **Database:** `issuecrush`
- **Container:** `sessions`
- **Partition key:** `/id`
- **TTL:** 24 hours (86400 seconds)

No manual setup required unless you want to pre-create them.

---

## Vercel

Deploy IssueCrush to Vercel with serverless functions.

### Prerequisites

- Vercel account ([sign up](https://vercel.com/signup))
- Vercel CLI (`npm i -g vercel`)

### Setup

**1. Install Vercel CLI**

````bash
npm i -g vercel
````

**2. Create `vercel.json`**

````json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/src/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "env": {
    "EXPO_PUBLIC_GITHUB_CLIENT_ID": "@github-client-id",
    "EXPO_PUBLIC_GITHUB_SCOPE": "repo",
    "EXPO_PUBLIC_API_URL": ""
  }
}
````

**3. Convert Azure Functions to Vercel Serverless**

Create `api/github-token.js`:

````javascript
export default async function handler(req, res) {
  // Port your Azure Function code here
  // See api/src/app.js for reference
}
````

**4. Deploy**

````bash
vercel --prod
````

**5. Configure Environment Variables**

In Vercel dashboard → Settings → Environment Variables:

````
GITHUB_CLIENT_SECRET=your_secret
COSMOS_ENDPOINT=https://...
COSMOS_KEY=your_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

---

## Netlify

Deploy IssueCrush to Netlify with Netlify Functions.

### Prerequisites

- Netlify account ([sign up](https://app.netlify.com/signup))
- Netlify CLI (`npm i -g netlify-cli`)

### Setup

**1. Create `netlify.toml`**

````toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"
  EXPO_PUBLIC_GITHUB_CLIENT_ID = "your_client_id"
  EXPO_PUBLIC_GITHUB_SCOPE = "repo"
  EXPO_PUBLIC_API_URL = ""

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
````

**2. Convert Azure Functions to Netlify Functions**

Create `netlify/functions/github-token.js`:

````javascript
exports.handler = async (event, context) => {
  // Port your Azure Function code here
  return {
    statusCode: 200,
    body: JSON.stringify({ session_id: '...' }),
  };
};
````

**3. Deploy**

````bash
netlify deploy --prod
````

---

## Docker

Run IssueCrush in a Docker container for self-hosting.

### Dockerfile

````dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY api/package*.json ./api/

# Install dependencies
RUN npm ci --production
RUN cd api && npm ci --production

# Copy application code
COPY . .

# Build frontend
RUN npm run build

# Expose ports
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
````

### Docker Compose

````yaml
version: '3.8'
services:
  issuecrush:
    build: .
    ports:
      - "3000:3000"
    environment:
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - COSMOS_ENDPOINT=${COSMOS_ENDPOINT}
      - COSMOS_KEY=${COSMOS_KEY}
      - COSMOS_DATABASE=issuecrush
      - COSMOS_CONTAINER=sessions
    env_file:
      - .env
    restart: unless-stopped
````

### Run

````bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
````

---

## Mobile App Deployment

### iOS (App Store)

**Prerequisites:**
- Apple Developer account ($99/year)
- macOS with Xcode

**Steps:**

````bash
# 1. Configure app.json
{
  "expo": {
    "name": "IssueCrush",
    "slug": "issuecrush",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourdomain.issuecrush",
      "buildNumber": "1"
    }
  }
}

# 2. Build with EAS
npx eas build --platform ios

# 3. Submit to App Store
npx eas submit --platform ios
````

**Note:** Mobile builds require configuring deep linking for OAuth callbacks. See [Expo Auth Session docs](https://docs.expo.dev/guides/authentication/#configuration).

---

### Android (Google Play)

**Prerequisites:**
- Google Play Developer account ($25 one-time)

**Steps:**

````bash
# 1. Configure app.json
{
  "expo": {
    "android": {
      "package": "com.yourdomain.issuecrush",
      "versionCode": 1
    }
  }
}

# 2. Build with EAS
npx eas build --platform android

# 3. Submit to Google Play
npx eas submit --platform android
````

---

## Environment Configuration

### Production Environment Variables

**Frontend (Build-time):**
````bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_github_oauth_app_client_id
EXPO_PUBLIC_GITHUB_SCOPE=repo
EXPO_PUBLIC_API_URL=  # Empty for same-origin, or full URL for separate backend
````

**Backend (Runtime):**
````bash
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_primary_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

### Security Checklist

- [ ] HTTPS enabled (required for OAuth)
- [ ] Client secret never exposed to frontend
- [ ] Cosmos DB firewall rules configured (optional)
- [ ] OAuth app redirect URI matches deployment URL
- [ ] Security headers configured (see `staticwebapp.config.json`)
- [ ] Rate limiting enabled (if using custom backend)
- [ ] CORS configured for production domain

---

## Troubleshooting

### Build Failures

**"Cannot find module 'babel-preset-expo'"**

````bash
npm install --save-dev babel-preset-expo
````

**"tsc: command not found" during build**

````bash
npm install --save-dev typescript
````

**"expo export fails with network error"**

Known issue with blocked `cdp.expo.dev`. Use TypeScript check instead:

````bash
./node_modules/.bin/tsc --noEmit
````

---

### OAuth Issues

**"Redirect URI mismatch"**

Ensure your GitHub OAuth App's callback URL matches your deployment URL exactly (including protocol and port).

**"bad_verification_code"**

OAuth code expired (10 minutes). Click "Start GitHub login" again.

---

### API Connection Issues

**"Failed to connect to auth server"**

- Check that `EXPO_PUBLIC_API_URL` is set correctly
- On Azure SWA, leave it empty (uses same origin)
- On separate backend, use full URL: `https://api.example.com`

**"Session expired" immediately after login**

Check that:
1. Cosmos DB is configured correctly (or in-memory fallback is working)
2. Session is being stored after token exchange
3. `X-Session-Token` header is being sent with requests

---

### Cosmos DB Issues

**"Session not found after login"**

Check that:
- Container partition key is `/id` (case-sensitive)
- TTL is enabled on container (24 hours = 86400 seconds)
- Firewall rules allow access from your backend

**Fallback to in-memory storage**

If Cosmos DB is not configured, the app falls back to in-memory session storage. This is fine for development but **not recommended for production** (sessions lost on server restart).

---

## Performance Optimization

### CDN Configuration

For static assets, configure CDN caching:

````
Cache-Control: public, max-age=31536000, immutable
````

### API Optimization

- Enable gzip compression
- Use HTTP/2
- Implement rate limiting
- Cache GitHub API responses (short TTL)

### Frontend Optimization

````bash
# Analyze bundle size
npx expo export --platform web --analyze
````

---

## Monitoring

### Azure Application Insights

Add to your Azure Functions:

````javascript
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start();
````

### Custom Logging

````javascript
// Log successful authentications
console.log(`✅ User authenticated: ${session.user.login}`);

// Log AI summary requests
console.log(`🤖 AI summary requested for issue #${issue.number}`);
````

---

## Rollback Strategy

### Azure SWA

````bash
# List deployments
az staticwebapp show --name your-app --resource-group your-rg

# Rollback via GitHub
git revert <commit-sha>
git push origin main
````

### Docker

````bash
# Tag releases
docker tag issuecrush:latest issuecrush:v1.0.0

# Rollback
docker-compose down
docker-compose up -d issuecrush:v1.0.0
````

---

## See Also

- [API.md](./API.md) — API reference
- [README.md](../README.md) — Quick start guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Development setup

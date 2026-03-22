# IssueCrush Documentation

Developer-focused documentation for IssueCrush contributors and maintainers.

## Table of Contents

- [Getting Started](#getting-started)
- [Documentation Structure](#documentation-structure)
- [For Users](#for-users)
- [For Developers](#for-developers)
- [For Contributors](#for-contributors)
- [For Deployers](#for-deployers)

---

## Getting Started

IssueCrush is a Tinder-style GitHub issue triage app built with React Native, Expo, and Azure Static Web Apps.

**New here?** Start with the [README](../README.md) for setup instructions.

---

## Documentation Structure

Following the [Diátaxis framework](https://diataxis.fr/):

### Tutorials (Learning-Oriented)

- [README.md](../README.md) - Quick start guide and basic usage

### How-To Guides (Problem-Oriented)

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy to Azure SWA or other platforms
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution workflow

### Technical Reference (Information-Oriented)

- [API.md](./API.md) - Complete API reference for hooks, components, and services
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and data flow

### Explanation (Understanding-Oriented)

- [AGENTS.md](../AGENTS.md) - AI agent context and project knowledge
- This file - Documentation overview

---

## For Users

**Want to use IssueCrush?**

1. Read [README.md](../README.md) - Setup and usage
2. Check [Troubleshooting section](../README.md#troubleshooting) for common issues

---

## For Developers

**Contributing code or fixing bugs?**

1. [CONTRIBUTING.md](../CONTRIBUTING.md) - Development setup and guidelines
2. [API.md](./API.md) - Hooks, components, and services reference
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and data flow
4. [AGENTS.md](../AGENTS.md) - Project conventions and patterns

### Key References

- **Hooks**: [API.md § Hooks](./API.md#hooks)
- **Components**: [API.md § Components](./API.md#components)
- **Services**: [API.md § Services](./API.md#services)
- **Authentication Flow**: [ARCHITECTURE.md § Authentication Flow](./ARCHITECTURE.md#authentication-flow)
- **Session Management**: [ARCHITECTURE.md § Session Management](./ARCHITECTURE.md#session-management)

---

## For Contributors

**First-time contributor?**

1. [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution process
2. Look for issues labeled `good first issue` or `help wanted`
3. Read [Code Clarity Standard](../AGENTS.md#code-clarity-standard)

### Development Workflow

````bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/IssueCrush.git
cd IssueCrush

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your GitHub OAuth credentials

# 4. Start development
npm run web-dev

# 5. Run tests
npm test
./node_modules/.bin/tsc --noEmit

# 6. Create pull request
git checkout -b feature/your-feature
git commit -m "feat: add your feature"
git push origin feature/your-feature
````

---

## For Deployers

**Deploying to production?**

1. [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
2. [Environment Configuration](./DEPLOYMENT.md#environment-configuration)
3. [Security Checklist](./DEPLOYMENT.md#security-checklist)

### Deployment Options

- **Azure Static Web Apps** (recommended) - [Guide](./DEPLOYMENT.md#azure-static-web-apps-deployment)
- **Vercel** - [Guide](./DEPLOYMENT.md#vercel)
- **Netlify** - [Guide](./DEPLOYMENT.md#netlify)
- **Self-Hosted (Docker)** - [Guide](./DEPLOYMENT.md#self-hosted-docker)

---

## Architecture Quick Reference

````
Client (React Native)
  ├── Hooks (business logic)
  ├── Components (pure render)
  └── Services (API clients)
        ↓ HTTP (X-Session-Token)
Server (Express / Azure Functions)
  ├── OAuth endpoints
  ├── GitHub API proxy
  ├── AI services
  └── Session storage (Cosmos DB)
        ↓ HTTPS
External Services
  ├── GitHub API (REST + OAuth)
  └── GitHub Copilot SDK
````

**See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details.**

---

## API Quick Reference

### Hooks

- **useAuth** - OAuth authentication flow
- **useIssues** - Issue loading, swiping, undo
- **useAnimations** - Swipe overlay animations
- **useKeyboardShortcuts** - Web-only keyboard shortcuts

### Components

- **AuthScreen** - Authentication UI
- **IssueCard** - Pure render component for issue display
- **SwipeContainer** - Swiper wrapper with overlays and action bar
- **Sidebar** - Desktop-only filters and progress

### Services

- **github.ts** - GitHub API client (proxied through backend)
- **copilotService.ts** - AI summary requests
- **tokenStorage.ts** - Platform-aware secure storage

**See [API.md](./API.md) for complete reference.**

---

## Project Conventions

From [AGENTS.md](../AGENTS.md):

### Architecture Boundaries

- `App.tsx` is composition only: ThemeContext, ErrorBoundary, layout branching
- Components receive props/callbacks — they do NOT call hooks or APIs directly
- Hook APIs are frozen — signature changes require updating all call sites
- `swiperRef` must be passed as prop — never recreate inside a component

### Code Clarity Standard

Every line of code should do exactly one thing. Use intermediate variables as documentation.

**Rules**:
1. No complex fallback chains
2. Name magic numbers
3. Split compound conditions
4. No chained string methods

**See [AGENTS.md § Code Clarity Standard](../AGENTS.md#code-clarity-standard) for examples.**

---

## External Resources

### Framework Documentation

- [React Native 0.81](https://reactnative.dev/docs)
- [Expo SDK 54](https://docs.expo.dev)
- [react-native-deck-swiper](https://github.com/alexbrillant/react-native-deck-swiper)

### API Documentation

- [GitHub REST API](https://docs.github.com/en/rest)
- [GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps)
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk)

### Deployment Platforms

- [Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/)
- [Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/)

---

## License

MIT - See [LICENSE](../LICENSE)

---

## Need Help?

- **Issues**: [GitHub Issues](https://github.com/AndreaGriffiths11/IssueCrush/issues)
- **Questions**: Open a [GitHub Discussion](https://github.com/AndreaGriffiths11/IssueCrush/discussions)

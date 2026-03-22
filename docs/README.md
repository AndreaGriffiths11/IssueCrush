# Documentation

Welcome to the IssueCrush documentation. This guide helps you understand, use, and contribute to the project.

## Quick Links

- 📖 [Getting Started Tutorial](tutorials/getting-started.md) - Learn IssueCrush in 15 minutes
- 🏗️ [Architecture Guide](guides/architecture.md) - Understand how IssueCrush works
- 🚀 [Deployment Guide](guides/deployment.md) - Deploy to Azure or other platforms
- 📚 [API Reference](api/README.md) - Backend API documentation
- 🧩 [Component Reference](reference/components.md) - Frontend components and hooks
- 🤝 [Contributing Guide](../CONTRIBUTING.md) - How to contribute

## Documentation Structure

This documentation follows the [Diátaxis framework](https://diataxis.fr/):

### Tutorials (Learning-Oriented)

Step-by-step guides for getting started:

- [Getting Started](tutorials/getting-started.md) - Install, configure, and use IssueCrush

### How-To Guides (Problem-Oriented)

Practical guides for specific tasks:

- [Deployment Guide](guides/deployment.md) - Deploy to production
- [Architecture Guide](guides/architecture.md) - Understand the codebase

### Reference (Information-Oriented)

Technical descriptions of components and APIs:

- [API Reference](api/README.md) - Backend endpoints
- [Component Reference](reference/components.md) - Frontend components

### Explanation (Understanding-Oriented)

Conceptual discussions:

- [Architecture Guide](guides/architecture.md) - System design and patterns

## Common Tasks

### I want to...

#### ...start using IssueCrush

→ [Getting Started Tutorial](tutorials/getting-started.md)

#### ...deploy IssueCrush to production

→ [Deployment Guide](guides/deployment.md)

#### ...understand how authentication works

→ [Architecture Guide - Authentication Flow](guides/architecture.md#authentication-flow)

#### ...build a new component

→ [Component Reference](reference/components.md)

#### ...add a new API endpoint

→ [API Reference](api/README.md)

#### ...contribute code

→ [Contributing Guide](../CONTRIBUTING.md)

#### ...understand AI summary implementation

→ [Architecture Guide - AI Summary Flow](guides/architecture.md#ai-summary-flow)

## Technology Stack

- **Frontend**: React Native 0.81, Expo SDK 54, TypeScript 5.9
- **Backend**: Express.js (dev), Azure Functions v4 (prod)
- **Database**: Azure Cosmos DB NoSQL (optional)
- **AI**: GitHub Copilot SDK 0.1.32
- **Deployment**: Azure Static Web Apps

## Development Workflow

````bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your GitHub OAuth credentials

# Start development server (web)
npm run web-dev

# Start development server (mobile)
npm run dev

# Run tests
npm test

# Type-check
./node_modules/.bin/tsc --noEmit
````

## Project Structure

````
IssueCrush/
├── docs/                   # This documentation
│   ├── api/                # API reference
│   ├── guides/             # How-to guides and explanations
│   ├── reference/          # Technical reference
│   └── tutorials/          # Step-by-step tutorials
├── src/
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── api/                # GitHub API client
│   ├── lib/                # Utilities (token storage, Copilot)
│   ├── theme/              # Theme and styling
│   └── utils/              # Helper functions
├── api/                    # Azure Functions (backend)
│   └── src/
│       ├── app.js          # API endpoints
│       └── sessionStore.js # Session management
├── App.tsx                 # Main app component
├── server.js               # Local Express dev server
├── sessionStore.js         # Local session storage
├── AGENTS.md               # AI agent context
├── README.md               # Project overview
└── CONTRIBUTING.md         # Contribution guide
````

## Architecture Overview

````
┌─────────────────────────────────────────────────────────────┐
│                     React Native App                         │
│                  (Mobile, Web, Desktop)                      │
└───────────────────────────┬──────────────────────────────────┘
                            │
                     X-Session-Token
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Express / Azure Functions)             │
│        OAuth Handler | Issues Proxy | AI Summary             │
└───────┬───────────────────┬──────────────────┬───────────────┘
        │                   │                  │
        ▼                   ▼                  ▼
  GitHub OAuth       GitHub REST API      Copilot SDK
        │
        ▼
  Cosmos DB (Sessions)
````

**Key Design Principles**:

1. **Security**: GitHub tokens never exposed to client
2. **Simplicity**: No global state management libraries
3. **Platform awareness**: Single codebase, platform-specific APIs
4. **Frozen APIs**: Hook signatures stable across refactors

See [Architecture Guide](guides/architecture.md) for details.

## Environment Variables

### Required

````bash
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
EXPO_PUBLIC_GITHUB_SCOPE=repo
````

### Optional

````bash
# API URL (defaults to same origin)
EXPO_PUBLIC_API_URL=

# GitHub Copilot (for AI summaries)
GH_TOKEN=your_github_token_with_copilot_access
COPILOT_PAT=alternative_to_gh_token

# Azure Cosmos DB (for persistent sessions)
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_key
COSMOS_DATABASE=issuecrush
COSMOS_CONTAINER=sessions
````

See [Deployment Guide](guides/deployment.md#environment-variables-reference) for complete reference.

## API Endpoints

### Authentication

- `POST /api/github-token` - Exchange OAuth code for session
- `POST /api/logout` - Destroy session

### Issues

- `GET /api/issues` - Fetch user's issues
- `PATCH /api/issues/:owner/:repo/:number` - Update issue state

### AI

- `POST /api/ai-summary` - Generate AI summary for issue
- `GET /api/health` - Check server and Copilot availability

See [API Reference](api/README.md) for detailed documentation.

## Component Architecture

### Boundaries

- **App.tsx**: Composition only (ThemeContext, ErrorBoundary, layout)
- **Components**: Receive props, no direct API calls
- **Hooks**: Encapsulate logic (`useAuth`, `useIssues`, `useAnimations`)

### Key Components

- `AuthScreen` - OAuth login/logout UI
- `IssueCard` - Single issue display with AI summary
- `SwipeContainer` - Swipe interface with deck of cards
- `Sidebar` - Desktop filters and progress (desktop only)

See [Component Reference](reference/components.md) for complete API.

## Testing

````bash
# Run test suite
npm test

# Run specific test
npm test -- server.test.js

# Type-check
./node_modules/.bin/tsc --noEmit
````

**Test Coverage**:
- Server API endpoints (`server.test.js`)
- GitHub API client (`src/api/github.test.ts`)
- Token storage (`src/lib/tokenStorage.test.ts`)
- Copilot service (`src/lib/copilotService.test.ts`)

## Troubleshooting

### Common Issues

| Problem                          | Solution                                           |
|----------------------------------|----------------------------------------------------|
| "Failed to connect to auth server" | Ensure server is running: `npm run web-dev`       |
| "GitHub OAuth failed"            | Check `.env` has correct CLIENT_ID and SECRET      |
| "Issues won't close"             | Use `repo` scope, not `public_repo`                |
| "AI summary failed"              | Check Copilot access and `GH_TOKEN`                |
| Build fails                      | Run `./node_modules/.bin/tsc --noEmit`             |

See [Getting Started Tutorial - Troubleshooting](tutorials/getting-started.md#troubleshooting) for more.

## Contributing

We welcome contributions! To get started:

1. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Look for issues labeled `good first issue` or `help wanted`
3. Fork the repo and create a feature branch
4. Make your changes and add tests
5. Submit a pull request

### Code Style

- **TypeScript**: Required for new code
- **Naming**: Descriptive variable/function names
- **Comments**: Explain complex logic, avoid obvious comments
- **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`)

### Before Submitting

````bash
# Type-check
./node_modules/.bin/tsc --noEmit

# Run tests
npm test

# Ensure server and app run
npm run web-dev
````

## Getting Help

- **Bug reports**: [Create an issue](https://github.com/AndreaGriffiths11/IssueCrush/issues)
- **Questions**: [Start a discussion](https://github.com/AndreaGriffiths11/IssueCrush/discussions)
- **Documentation**: You're reading it!

## License

MIT - See [LICENSE](../LICENSE)

## Credits

- Created by [Andrea Griffiths](https://github.com/AndreaGriffiths11)
- Agentation component by [Benji Taylor](https://github.com/benjitaylor)

---

Made with ❤️ & 🤖 for developers who want to triage issues faster

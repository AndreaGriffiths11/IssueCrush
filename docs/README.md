# IssueCrush Documentation

Welcome to the IssueCrush developer documentation. This guide helps you understand the codebase architecture, APIs, and patterns used in the project.

## 📚 Documentation Index

### API Reference
- **[GitHub API Client](./api/github-client.md)** - Fetch and update GitHub issues
- **[Copilot Service](./api/copilot-service.md)** - AI-powered issue summaries
- **[Token Storage](./api/token-storage.md)** - Secure session token management
- **[Server Endpoints](./api/server-endpoints.md)** - Express/Azure Functions API reference

### Components
- **[Component Reference](./components/README.md)** - React Native UI components with props and examples

### Hooks
- **[Hooks Reference](./hooks/README.md)** - Custom React hooks for auth, issues, and animations

### Guides
- **[Development Guide](./guides/development.md)** - Local development setup and workflows
- **[Deployment Guide](./guides/deployment.md)** - Azure Static Web Apps deployment

## Quick Links

- [Main README](../README.md) - Getting started and setup
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute
- [AGENTS.md](../AGENTS.md) - AI agent context and architecture

## Architecture Overview

IssueCrush follows a client-server architecture with strict separation of concerns:

````
┌─────────────────────────────────────────────────────────────┐
│                     React Native App                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Components  │  │    Hooks     │  │   Services   │      │
│  │  (UI Only)   │──│ (Logic/State)│──│ (API Calls)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   X-Session-Token                            │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                  Express/Azure Functions                     │
│                            │                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   OAuth      │  │   GitHub     │  │  Copilot AI  │      │
│  │   Proxy      │  │     API      │  │    Proxy     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   GitHub Token                               │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                      ┌──────┴──────┐
                      │   Cosmos    │
                      │     DB      │
                      │  Sessions   │
                      └─────────────┘
````

### Key Principles

1. **Components receive props, not hooks** - UI components are pure and don't call APIs directly
2. **Hooks own business logic** - Custom hooks like `useAuth`, `useIssues` manage state and side effects
3. **Services handle API calls** - All network requests go through dedicated service modules
4. **Server-side token storage** - GitHub tokens never touch the client; only session IDs are stored
5. **Platform-aware storage** - Mobile uses `expo-secure-store`, web uses `AsyncStorage`

## Code Clarity Standard

Every line of code should do exactly one thing. Use intermediate variables as documentation.

### Rules
1. **No complex fallback chains** — split `a?.b || (c?.d ? e : f)` into `dedicatedX` / `fallbackX`
2. **Name magic numbers** — `30 * 24 * 60 * 60 * 1000` becomes `const thirtyDaysMs = ...`
3. **Split compound conditions** — `if (a !== -1 && b >= c)` becomes named booleans like `isUnlimited`, `isOverLimit`
4. **No chained string methods** — `.replace().replace().replace()` should be sequential assignments

## TypeScript Usage

- Use explicit types for all function parameters and return values
- Leverage type inference for local variables when types are obvious
- Export types/interfaces for shared data structures
- Prefer `type` over `interface` for simple object shapes

## Testing

Run tests before committing:

````bash
npm test              # Run Jest test suite
npx tsc --noEmit      # Type-check without building
````

## Need Help?

- Check existing docs in this directory
- Review [AGENTS.md](../AGENTS.md) for architecture patterns
- Look at test files for usage examples
- Ask in GitHub Discussions or open an issue

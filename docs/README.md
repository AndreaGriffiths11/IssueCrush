# IssueCrush Documentation

Welcome to the IssueCrush documentation. This guide will help you understand, use, and contribute to IssueCrush.

## Quick Links

- **[Main README](../README.md)** - Project overview and quick start
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute
- **[AGENTS.md](../AGENTS.md)** - AI agent context and project knowledge

## Documentation Structure

This documentation follows the [Diátaxis](https://diataxis.fr/) framework for technical documentation:

### 📚 Tutorials (Learning-Oriented)

Hands-on lessons to get you started:

- [Getting Started Tutorial](tutorials/getting-started.md) - Your first IssueCrush app

### 🛠️ How-To Guides (Problem-Oriented)

Step-by-step guides for common tasks:

- [Deploy to Azure Static Web Apps](how-to/deploy-azure.md)
- [Set Up Cosmos DB Session Storage](how-to/setup-cosmos-db.md)
- [Configure GitHub Copilot SDK](how-to/configure-copilot.md)
- [Customize the Theme](how-to/customize-theme.md)
- [Add Custom Swipe Actions](how-to/add-custom-actions.md)

### 📖 Reference (Information-Oriented)

Technical specifications and API documentation:

#### API Reference
- [Hooks API](reference/api/hooks.md) - useAuth, useIssues, useAnimations, useKeyboardShortcuts
- [GitHub Client](reference/api/github-client.md) - GitHub API integration
- [Copilot Service](reference/api/copilot-service.md) - AI summary service
- [Backend Endpoints](reference/api/backend-endpoints.md) - Azure Functions API reference

#### Components
- [AuthScreen](reference/components/AuthScreen.md) - Authentication UI
- [IssueCard](reference/components/IssueCard.md) - Issue card display
- [SwipeContainer](reference/components/SwipeContainer.md) - Swipe interaction container
- [Sidebar](reference/components/Sidebar.md) - Desktop sidebar navigation

#### Architecture
- [Architecture Overview](reference/architecture/overview.md) - System architecture
- [Authentication Flow](reference/architecture/authentication-flow.md) - OAuth and session management
- [Session Management](reference/architecture/session-management.md) - Token and session storage
- [Platform Differences](reference/architecture/platform-differences.md) - Mobile vs Web

### 💡 Explanation (Understanding-Oriented)

Deep dives into design decisions:

- [Why Azure Functions?](explanation/why-azure-functions.md)
- [Session Storage Design](explanation/session-storage-design.md)
- [Swipe Architecture](explanation/swipe-architecture.md)

## Finding What You Need

- **New to IssueCrush?** Start with the [Getting Started Tutorial](tutorials/getting-started.md)
- **Want to accomplish a specific task?** Check the [How-To Guides](how-to/)
- **Need API details?** See the [Reference Documentation](reference/)
- **Curious about design decisions?** Read the [Explanations](explanation/)

## Contributing to Documentation

We welcome documentation improvements! See the [Contributing Guide](../CONTRIBUTING.md) for details.

When contributing documentation:

- Follow the Diátaxis framework structure
- Use clear, concise language (active voice, plain English)
- Include code examples that work
- Test all commands and code snippets
- Use GitHub Flavored Markdown

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/AndreaGriffiths11/IssueCrush/issues)
- **Discussions:** [GitHub Discussions](https://github.com/AndreaGriffiths11/IssueCrush/discussions)

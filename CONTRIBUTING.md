# Contributing to IssueCrush

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to IssueCrush. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by the [IssueCrush Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**
- **Device/Platform:** (e.g., iOS 17, Android 14, Chrome on macOS)
- **App Version:** (check package.json)
- **Steps to Reproduce:**
  1. Go to '...'
  2. Click on '...'
  3. Scroll down to '...'
  4. See error
- **Expected Behavior:** What you expected to happen
- **Actual Behavior:** What actually happened
- **Screenshots:** If applicable
- **Console Logs:** Any relevant error messages

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- Use a clear and descriptive title
- Provide a step-by-step description of the suggested enhancement
- Explain why this enhancement would be useful
- Include mockups or examples if possible

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - Simple issues perfect for newcomers
- `help wanted` - Issues where we need community help

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the app runs without errors on web
4. Make sure your code follows the existing style
5. Write a clear PR description explaining your changes

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- A GitHub OAuth App (for testing auth features)

### Getting Started

```bash
# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/IssueCrush.git
cd IssueCrush

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your GitHub OAuth credentials

# Start development
npm run web-dev    # For web development
npm run dev        # For mobile development
```

> **Note:** Cosmos DB is optional for local development. Without it, sessions are stored in memory (fine for testing—just means you'll need to re-login if you restart the server).

### Project Structure

```
IssueCrush/
├── App.tsx           # Main React Native component
├── server.js         # Express server for OAuth & AI
├── sessionStore.js   # Cosmos DB / in-memory session storage
├── src/
│   ├── api/          # GitHub API client
│   └── lib/          # Utilities (token storage, Copilot service)
├── assets/           # Images and static files
└── .github/          # GitHub templates and workflows
```

### Running Tests

```bash
# Type checking
npx tsc --noEmit

# Lint (if configured)
npm run lint
```

## Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for new code
- Follow existing code patterns
- Use meaningful variable and function names
- Add comments for complex logic (but avoid obvious comments)

### React Native

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use StyleSheet for styling (not inline styles)

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests when relevant

**Examples:**
```
Add swipe gesture customization options
Fix OAuth token refresh on mobile
Update README with new setup instructions
```

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring

## Community

- **Issues:** Use GitHub Issues for bugs and feature requests

## Recognition

Contributors will be recognized in:
- The project README
- Release notes when their changes are included

Thank you for contributing to IssueCrush! 🚀

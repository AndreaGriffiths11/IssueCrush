# IssueCrush Documentation

Welcome to the IssueCrush documentation! This guide will help you understand, develop, and deploy the IssueCrush application.

## Documentation Structure

Our documentation follows the [Diátaxis framework](https://diataxis.fr/) to serve different user needs:

### 📚 Learning-Oriented (Tutorials)

Start here if you're new to IssueCrush:

- **[README.md](../README.md)** — Quick start guide with step-by-step setup

### 🛠️ Problem-Oriented (How-To Guides)

Practical guides for specific tasks:

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Development workflows, common tasks, debugging
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Deploy to Azure, configure production, monitoring

### 📖 Information-Oriented (Reference)

Technical reference documentation:

- **[API.md](./API.md)** — Complete API endpoint reference with examples
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System architecture, design patterns, data flow

### 💡 Understanding-Oriented (Explanation)

Deep-dive explanations:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Architectural decisions and design philosophy
- **[AGENTS.md](../AGENTS.md)** — AI agent context and project conventions

## Quick Links by Role

### 👨‍💻 Developers

Getting started with local development:

1. [README.md](../README.md) — Initial setup
2. [DEVELOPMENT.md](./DEVELOPMENT.md) — Development workflows
3. [ARCHITECTURE.md](./ARCHITECTURE.md) — Understanding the codebase

### 🚀 DevOps/SRE

Deploying and maintaining IssueCrush:

1. [DEPLOYMENT.md](./DEPLOYMENT.md) — Azure deployment guide
2. [API.md](./API.md) — API reference for monitoring
3. [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture

### 🧪 QA/Testers

Testing and quality assurance:

1. [README.md](../README.md) — Setup test environment
2. [DEVELOPMENT.md](./DEVELOPMENT.md) — Testing workflows
3. [API.md](./API.md) — API endpoints for integration tests

### 🎨 UI/UX Designers

Understanding the user experience:

1. [ARCHITECTURE.md](./ARCHITECTURE.md) — Component hierarchy
2. [DEVELOPMENT.md](./DEVELOPMENT.md) — Adding components
3. [AGENTS.md](../AGENTS.md) — Design patterns

### 📝 Technical Writers

Contributing to documentation:

1. [CONTRIBUTING.md](../CONTRIBUTING.md) — Contribution guidelines
2. This index — Documentation structure
3. [Diátaxis](https://diataxis.fr/) — Documentation framework

## Documentation by Topic

### Authentication & Authorization

- [API.md](./API.md#authentication) — Session-based auth
- [ARCHITECTURE.md](./ARCHITECTURE.md#oauth-flow) — OAuth flow diagram
- [DEVELOPMENT.md](./DEVELOPMENT.md#create-github-oauth-app) — Setup OAuth app

### API & Backend

- [API.md](./API.md) — Complete endpoint reference
- [ARCHITECTURE.md](./ARCHITECTURE.md#backend-architecture) — Backend design
- [DEVELOPMENT.md](./DEVELOPMENT.md#adding-a-new-api-endpoint) — Add endpoints

### Frontend & UI

- [ARCHITECTURE.md](./ARCHITECTURE.md#frontend-architecture) — Component structure
- [DEVELOPMENT.md](./DEVELOPMENT.md#adding-a-new-component) — Create components
- [AGENTS.md](../AGENTS.md#architecture-boundaries) — Architecture rules

### Deployment & Operations

- [DEPLOYMENT.md](./DEPLOYMENT.md) — Full deployment guide
- [DEPLOYMENT.md](./DEPLOYMENT.md#monitoring-and-logs) — Monitoring
- [API.md](./API.md#environment-variables) — Environment config

### Testing & Quality

- [DEVELOPMENT.md](./DEVELOPMENT.md#running-tests) — Run tests
- [DEVELOPMENT.md](./DEVELOPMENT.md#adding-tests) — Write tests
- [DEVELOPMENT.md](./DEVELOPMENT.md#pre-commit-checklist) — Quality checklist

## External Resources

### Frameworks & Libraries

- [React Native Documentation](https://reactnative.dev/docs) — Mobile framework
- [Expo SDK 54 Documentation](https://docs.expo.dev) — Development platform
- [TypeScript Handbook](https://www.typescriptlang.org/docs) — Type system

### APIs & Services

- [GitHub REST API](https://docs.github.com/en/rest) — GitHub API reference
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk) — AI SDK
- [Azure Static Web Apps](https://docs.microsoft.com/en-us/azure/static-web-apps/) — Hosting platform
- [Azure Cosmos DB](https://docs.microsoft.com/en-us/azure/cosmos-db/) — Database

### Development Tools

- [Expo DevTools](https://docs.expo.dev/workflow/debugging/) — Debugging
- [React DevTools](https://react.dev/learn/react-developer-tools) — React debugging
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/) — Azure management

## Contributing to Documentation

We welcome documentation contributions! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### Documentation Standards

- **Format:** Markdown (`.md`) for all documentation
- **Style:** Follow [Google Developer Documentation Style Guide](https://developers.google.com/style)
- **Structure:** Use [Diátaxis framework](https://diataxis.fr/) principles
- **Code Examples:** Use syntax highlighting with language tags
- **Links:** Use relative links for internal docs, absolute for external

### Writing Guidelines

1. **Be Clear:** Use plain English, avoid jargon
2. **Be Concise:** Short sentences, active voice
3. **Be Accurate:** Test all code examples, verify facts
4. **Be Helpful:** Include context, explain "why" not just "how"
5. **Be Inclusive:** Use inclusive language, consider all skill levels

### Documentation Checklist

Before submitting documentation changes:

- [ ] All links work (relative for internal, absolute for external)
- [ ] Code examples are tested and working
- [ ] Spelling and grammar checked
- [ ] Follows Markdown conventions
- [ ] Follows Diátaxis principles (tutorial/how-to/reference/explanation)
- [ ] Screenshots/diagrams are clear and up-to-date (if applicable)

## Documentation Maintenance

### Update Triggers

Documentation should be updated when:

- ✅ New features are added
- ✅ APIs change (endpoints, parameters, responses)
- ✅ Architecture evolves
- ✅ Deployment processes change
- ✅ Dependencies are upgraded (major versions)
- ✅ Configuration changes
- ✅ Known gotchas/workarounds are discovered

### Review Schedule

- **Monthly:** Review for accuracy
- **Per Release:** Update version-specific info
- **Continuous:** Fix typos, broken links as discovered

## Getting Help

Can't find what you're looking for?

- **Search:** Use GitHub's search (press `/` and type your query)
- **Issues:** Check [existing issues](https://github.com/AndreaGriffiths11/IssueCrush/issues)
- **Discussions:** Ask in [GitHub Discussions](https://github.com/AndreaGriffiths11/IssueCrush/discussions)
- **Contribute:** Improve docs via [pull request](../CONTRIBUTING.md)

## Feedback

Found an error? Have a suggestion? Please let us know:

- **Typos/Errors:** Open an issue or PR with the fix
- **Missing Info:** Open an issue describing what's missing
- **Unclear Sections:** Comment on the relevant doc file

Your feedback helps improve the documentation for everyone! 🙏

---

**Last Updated:** 2026-03-22  
**Maintainer:** [@AndreaGriffiths11](https://github.com/AndreaGriffiths11)

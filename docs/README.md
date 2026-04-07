# IssueCrush Documentation

Welcome to the IssueCrush documentation. This directory contains comprehensive technical reference and guides for developers.

## Documentation Structure

Following the [Diátaxis framework](https://diataxis.fr/), our documentation is organized into four categories:

### 📚 Technical Reference

Precise, information-oriented documentation describing the system as it is.

- **[API Reference](API.md)** - Complete REST API endpoint documentation
- **[Architecture Guide](ARCHITECTURE.md)** - System design, component structure, and data flow

### 🎓 Tutorials *(Coming Soon)*

Learning-oriented, hands-on lessons for newcomers.

- Building your first feature
- Understanding the swipe mechanism
- Integrating AI summaries

### 🛠️ How-To Guides *(Coming Soon)*

Problem-oriented, practical steps for common tasks.

- Deploying to Azure Static Web Apps
- Configuring Cosmos DB session storage
- Setting up local development with Copilot
- Debugging OAuth flow issues

### 💡 Explanation *(Coming Soon)*

Understanding-oriented clarification and discussion.

- Why we use React Native + Expo
- Session management design decisions
- Platform-specific token storage rationale

---

## Quick Links

### For New Contributors

1. Start with the main [README.md](../README.md) for setup instructions
2. Review [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines
3. Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system design

### For API Consumers

- [API Reference](API.md) - All endpoints, authentication, and examples

### For Maintainers

- [AGENTS.md](../AGENTS.md) - AI agent context and project knowledge
- [Architecture Guide](ARCHITECTURE.md) - Deep dive into design decisions

---

## Contributing to Documentation

We treat documentation gaps like failing tests. If you find missing, incorrect, or unclear documentation:

1. Open an issue describing the problem
2. Submit a pull request with improvements
3. Follow our style guidelines (see below)

### Documentation Style Guidelines

- **Precision**: Be accurate and specific
- **Conciseness**: Respect the reader's time
- **Active Voice**: "The API returns..." not "An object is returned..."
- **Progressive Disclosure**: High-level concepts first, then details
- **Developer-Friendly**: Write for both newcomers and power users
- **Accessibility**: Use clear language, avoid jargon where possible

### Formatting Standards

- Use Markdown (`.md`) format
- Code blocks with language hints: ` ```typescript `
- Headings follow hierarchy: `#` → `##` → `###`
- Lists use `-` for bullets, `1.` for ordered
- Links use descriptive text: `[API Reference](API.md)` not `[click here](API.md)`

---

## Documentation Roadmap

### Phase 1: Technical Reference ✅ (Current)

- [x] API Reference
- [x] Architecture Guide
- [x] Documentation index

### Phase 2: How-To Guides (Planned)

- [ ] Local development setup walkthrough
- [ ] Deploying to production
- [ ] Configuring environment variables
- [ ] Troubleshooting common issues

### Phase 3: Tutorials (Planned)

- [ ] Build your first swipe feature
- [ ] Add a custom AI summary prompt
- [ ] Create a new API endpoint

### Phase 4: Explanations (Planned)

- [ ] Architecture decision records (ADRs)
- [ ] Performance optimization strategies
- [ ] Security model deep dive

---

## External Resources

- [React Native Documentation](https://reactnative.dev/docs)
- [Expo SDK 54 Documentation](https://docs.expo.dev)
- [GitHub REST API](https://docs.github.com/en/rest)
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk)
- [Azure Static Web Apps Docs](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Cosmos DB NoSQL](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/)

---

## Need Help?

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Questions**: Check existing issues or open a new discussion
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Last Updated**: 2026-04-07

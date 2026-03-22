# IssueCrush Documentation

Welcome to the IssueCrush technical documentation. This documentation is organized following the [Diátaxis framework](https://diataxis.fr/) for clarity and discoverability.

## Getting Started

- [README](../README.md) - User-facing quick start guide
- [CONTRIBUTING](../CONTRIBUTING.md) - How to contribute to IssueCrush

## Reference Documentation

Technical reference material for developers working with or extending IssueCrush.

### API Reference

- [API Endpoints](reference/api/README.md) - Complete REST API documentation
  - Authentication and session management
  - GitHub API proxy endpoints
  - AI summary generation via Copilot SDK
  - Error handling and rate limiting

### Architecture Reference

- [System Architecture](reference/architecture/README.md) - Comprehensive architecture guide
  - Frontend architecture (React Native + Expo)
  - Backend architecture (Express + Azure Functions)
  - Authentication flow diagrams
  - State management patterns
  - Platform support (web, iOS, Android)
  - Deployment process

## Additional Resources

### Project Knowledge

- [AGENTS.md](../AGENTS.md) - Project context for AI coding agents
  - Tech stack overview
  - Key patterns and conventions
  - Known gotchas and workarounds
  - File quick reference

### External Documentation

- [Expo SDK 54](https://docs.expo.dev) - Cross-platform framework
- [React Native 0.81](https://reactnative.dev/docs) - Mobile UI framework
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk) - AI integration
- [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/) - Hosting platform
- [Azure Functions](https://learn.microsoft.com/azure/azure-functions/) - Serverless backend

## Documentation Standards

This documentation follows:

- **GitHub Flavored Markdown** for consistent rendering
- **Progressive disclosure** - high-level concepts first, detailed examples second
- **Code examples** with syntax highlighting for clarity
- **Cross-references** for easy navigation
- **Plain English** optimized for both newcomers and experienced developers

## Contributing to Documentation

Found an error or want to improve the docs? Please see our [Contributing Guide](../CONTRIBUTING.md).

**Documentation files:**

- `docs/reference/api/` - API endpoint documentation
- `docs/reference/architecture/` - Architecture and design documentation
- `README.md` - User-facing quick start
- `CONTRIBUTING.md` - Contributor guidelines
- `AGENTS.md` - AI agent project context

---

*Documentation last updated: March 2026*

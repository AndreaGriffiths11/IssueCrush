# IssueCrush Documentation

Welcome to the IssueCrush documentation. This documentation follows the [Diátaxis framework](https://diataxis.fr/), organizing content into four categories: **Tutorials**, **How-To Guides**, **Technical Reference**, and **Explanation**.

---

## 📚 Quick Links

- **[Main README](../README.md)** - Project overview and quick start
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute to the project

---

## 🎓 Tutorials

*Learning-oriented guides for getting started*

- **[Quick Start](../README.md#quick-start)** - Get IssueCrush running locally in 5 minutes
- **[First OAuth Setup](../README.md#2-configure-github-oauth)** - Create your first GitHub OAuth app

---

## 🛠 How-To Guides

*Problem-oriented, practical steps for specific tasks*

### Deployment
- **[Deploy to Azure Static Web Apps](./guides/azure-deployment.md)** - Production deployment guide
  - Create Azure resources
  - Configure CI/CD pipeline
  - Set up environment variables
  - Monitor and troubleshoot

### Development
- **[Local Development Setup](../README.md#development-setup)** - Set up your dev environment
- **[Troubleshooting Guide](../README.md#troubleshooting)** - Common issues and solutions

---

## 📖 Technical Reference

*Information-oriented, precise descriptions of APIs and systems*

### Frontend APIs
- **[Frontend API Reference](./api/frontend-api.md)** - Complete TypeScript API documentation
  - GitHub API Client (`src/api/github.ts`)
  - Token Storage (`src/lib/tokenStorage.ts`)
  - Copilot Service (`src/lib/copilotService.ts`)
  - Custom Hooks (`src/hooks/`)
  - Theme System (`src/theme/`)
  - Utilities

### Backend APIs
- **[Backend API Reference](./api/backend-api.md)** - Azure Functions endpoint documentation
  - `GET /api/health` - Health check
  - `POST /api/github-token` - OAuth token exchange
  - `POST /api/logout` - Destroy session
  - `GET /api/issues` - Fetch GitHub issues
  - `PATCH /api/issues/:owner/:repo/:number` - Update issue state
  - `POST /api/ai-summary` - Generate AI summary

---

## 💡 Explanation

*Understanding-oriented, clarification and discussion of architecture*

### Architecture Guides
- **[OAuth Flow Architecture](./architecture/oauth-flow.md)** - How authentication works
  - Web vs mobile OAuth flows
  - Token exchange and security
  - Session management
  - Error handling

- **[Session Storage Architecture](./architecture/session-storage.md)** - How sessions are stored
  - Cosmos DB vs in-memory storage
  - Session lifecycle (creation, resolution, expiration)
  - Security considerations
  - Performance optimization

### Design Decisions
- **Why session-based auth?** See [Session Storage Architecture](./architecture/session-storage.md#security-considerations)
- **Why proxy GitHub API calls?** See [OAuth Flow Architecture](./architecture/oauth-flow.md#security-considerations)
- **Why Azure Cosmos DB?** See [Session Storage Architecture](./architecture/session-storage.md#storage-modes)

---

## 🔍 Search by Topic

### Authentication & Security
- [OAuth Flow Architecture](./architecture/oauth-flow.md)
- [Session Storage Architecture](./architecture/session-storage.md)
- [Token Storage API](./api/frontend-api.md#token-storage)
- [Backend Authentication](./api/backend-api.md#authentication)

### API Integration
- [Frontend GitHub Client](./api/frontend-api.md#github-api-client)
- [Backend Endpoints](./api/backend-api.md#endpoints)
- [Copilot AI Integration](./api/frontend-api.md#copilot-service)

### Deployment
- [Azure Static Web Apps Deployment](./guides/azure-deployment.md)
- [GitHub Actions Workflow](./guides/azure-deployment.md#step-6-customize-github-actions-workflow)
- [Environment Configuration](./guides/azure-deployment.md#step-4-configure-environment-variables)

### Development
- [Local Setup](../README.md#quick-start)
- [Custom Hooks](./api/frontend-api.md#custom-hooks)
- [Theme System](./api/frontend-api.md#theme-system)
- [Contributing Guide](../CONTRIBUTING.md)

---

## 📁 Documentation Structure

````
docs/
├── README.md (this file)          # Documentation index
├── api/                           # Technical Reference
│   ├── frontend-api.md           # Frontend TypeScript APIs
│   └── backend-api.md            # Backend Azure Functions APIs
├── architecture/                  # Explanation (Architecture)
│   ├── oauth-flow.md             # OAuth authentication flow
│   └── session-storage.md        # Session management with Cosmos DB
└── guides/                        # How-To Guides
    └── azure-deployment.md        # Production deployment guide
````

---

## 🤝 Contributing to Documentation

Found an error or want to improve the docs?

1. **For typos or small fixes:**
   - Edit the file directly on GitHub
   - Submit a pull request

2. **For new documentation:**
   - Follow the [Diátaxis framework](https://diataxis.fr/)
   - Use Markdown format
   - Add cross-references to related docs
   - Update this index

3. **Documentation style guide:**
   - Use clear, concise language
   - Provide code examples
   - Include error handling patterns
   - Add diagrams for complex flows (use ASCII art for simplicity)
   - Follow progressive disclosure (high-level first, details second)

---

## 📋 Documentation Checklist

When adding new features, ensure:

- [ ] User-facing changes documented in README
- [ ] New APIs documented in [Frontend API](./api/frontend-api.md) or [Backend API](./api/backend-api.md)
- [ ] Architecture changes explained in [Architecture guides](./architecture/)
- [ ] Deployment steps updated in [Azure Deployment Guide](./guides/azure-deployment.md)
- [ ] Cross-references added to related documentation
- [ ] This index updated with new content

---

## 📞 Getting Help

- **Issues:** Open a [GitHub Issue](https://github.com/AndreaGriffiths11/IssueCrush/issues)
- **Discussions:** Start a [GitHub Discussion](https://github.com/AndreaGriffiths11/IssueCrush/discussions)
- **Security:** See [SECURITY.md](../SECURITY.md) (if applicable)

---

## 📜 License

This documentation is part of IssueCrush and is licensed under the MIT License. See [LICENSE](../LICENSE).

---

Made with ❤️ & 🤖 by the IssueCrush community

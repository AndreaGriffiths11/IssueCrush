# IssueCrush Documentation

Complete documentation for the IssueCrush project.

## Quick Links

- 📖 [API Reference](./API.md) - Complete API documentation for all components, hooks, and utilities
- 🏗️ [Architecture](./ARCHITECTURE.md) - System design, data flow, and technical decisions
- 💻 [Developer Guide](./DEVELOPER_GUIDE.md) - Setup instructions and development workflow
- 🤝 [Contributing Guide](../CONTRIBUTING.md) - How to contribute to the project
- 📄 [Main README](../README.md) - Project overview and quick start

## Documentation Structure

### For New Users

Start here if you're new to IssueCrush:

1. **[Main README](../README.md)** - Overview, features, and quick start
2. **[Developer Guide](./DEVELOPER_GUIDE.md)** - Detailed setup and development workflow

### For Contributors

Reference these when contributing code:

1. **[Contributing Guide](../CONTRIBUTING.md)** - Contribution guidelines
2. **[API Reference](./API.md)** - Function signatures and usage examples
3. **[Architecture](./ARCHITECTURE.md)** - Understanding the system design

### For Maintainers

Deep technical documentation:

1. **[Architecture](./ARCHITECTURE.md)** - Complete system architecture
2. **[API Reference](./API.md)** - All exported APIs
3. **[AGENTS.md](../AGENTS.md)** - AI agent context and patterns

## Documentation by Topic

### Getting Started

- [Prerequisites](./DEVELOPER_GUIDE.md#prerequisites)
- [Initial Setup](./DEVELOPER_GUIDE.md#initial-setup)
- [Development Workflow](./DEVELOPER_GUIDE.md#development-workflow)

### API Documentation

- [GitHub API Client](./API.md#github-api-client)
- [Hooks](./API.md#hooks)
  - [useAuth](./API.md#useauth) - Authentication management
  - [useIssues](./API.md#useissues) - Issue management and swipe actions
  - [useAnimations](./API.md#useanimations) - UI animations
- [Components](./API.md#components)
  - [AuthScreen](./API.md#authscreen) - Login UI
  - [IssueCard](./API.md#issuecard) - Issue card display
  - [SwipeContainer](./API.md#swipecontainer) - Swipeable interface
  - [Sidebar](./API.md#sidebar) - Desktop sidebar
- [Services](./API.md#services)
  - [CopilotService](./API.md#copilotservice) - AI summaries
  - [Token Storage](./API.md#token-storage) - Secure token management
- [Backend Endpoints](./API.md#backend-api-endpoints)

### Architecture

- [System Overview](./ARCHITECTURE.md#overview)
- [Component Architecture](./ARCHITECTURE.md#component-architecture)
- [Data Flow](./ARCHITECTURE.md#data-flow)
  - [Authentication Flow](./ARCHITECTURE.md#authentication-flow)
  - [Issue Fetch Flow](./ARCHITECTURE.md#issue-fetch-flow)
  - [Swipe Flow](./ARCHITECTURE.md#swipe-flow)
  - [Undo Flow](./ARCHITECTURE.md#undo-flow)
- [Security Model](./ARCHITECTURE.md#security-model)
- [Platform Differences](./ARCHITECTURE.md#platform-differences)

### Development

- [Project Structure](./DEVELOPER_GUIDE.md#project-structure)
- [Common Tasks](./DEVELOPER_GUIDE.md#common-tasks)
  - [Adding Components](./DEVELOPER_GUIDE.md#adding-a-new-component)
  - [Adding Hooks](./DEVELOPER_GUIDE.md#adding-a-new-hook)
  - [Adding API Endpoints](./DEVELOPER_GUIDE.md#adding-an-api-endpoint)
- [Testing](./DEVELOPER_GUIDE.md#testing)
- [Debugging](./DEVELOPER_GUIDE.md#debugging)
- [Troubleshooting](./DEVELOPER_GUIDE.md#troubleshooting)

## Contributing to Documentation

Documentation follows these principles:

### Style Guidelines

- **Progressive Disclosure:** High-level concepts first, detailed examples second
- **Active Voice:** Use "Click the button" not "The button can be clicked"
- **Plain English:** Avoid jargon when possible
- **Code Examples:** Include working code examples for complex concepts
- **Accessibility:** Ensure content is accessible and internationalization-ready

### Documentation Structure (Diátaxis Framework)

Our documentation follows the [Diátaxis framework](https://diataxis.fr/):

1. **Tutorials** (Learning-oriented)
   - Currently: [Developer Guide](./DEVELOPER_GUIDE.md) setup section
   - Hands-on, step-by-step guidance
   
2. **How-to Guides** (Problem-oriented)
   - Currently: [Common Tasks](./DEVELOPER_GUIDE.md#common-tasks)
   - Practical solutions to specific problems
   
3. **Technical Reference** (Information-oriented)
   - Currently: [API Reference](./API.md)
   - Precise descriptions of functions, parameters, and types
   
4. **Explanation** (Understanding-oriented)
   - Currently: [Architecture](./ARCHITECTURE.md)
   - Clarification and discussion of design decisions

### Making Changes

1. **Small Fixes:** Submit a PR with the change
2. **Large Changes:** Open an issue to discuss first
3. **New Sections:** Follow the existing structure and style

**File a PR:**
````bash
git checkout -b docs/your-improvement
# Make changes
git commit -m "docs: describe your changes"
git push origin docs/your-improvement
````

## Documentation Standards

### Markdown Style

- Use ATX-style headers (`#` not underlines)
- Use fenced code blocks with language identifiers
- Use reference-style links for repeated URLs
- Include table of contents for documents > 300 lines

### Code Examples

````markdown
**Good:**
````typescript
// Complete, runnable example
const result = await fetchIssues(sessionId, 'owner/repo');
console.log(result);
````

**Bad:**
````typescript
// Incomplete snippet
await fetchIssues(...);
````
````

### API Documentation

Every public function/component should document:
- **Purpose:** What it does
- **Parameters:** What inputs it takes
- **Returns:** What it returns
- **Example:** How to use it
- **Throws/Errors:** What can go wrong

## Search and Navigation

- Use your browser's search (Ctrl+F / Cmd+F) within documents
- GitHub's repository search includes documentation
- All documents are interlinked for easy navigation

## Feedback

Found an issue with the documentation? Have a suggestion?

- **Typos/Errors:** Submit a PR or open an issue
- **Missing Information:** Open an issue describing what's missing
- **Confusing Sections:** Open an issue explaining what's unclear

## License

Documentation is licensed under the same MIT license as the code. See [LICENSE](../LICENSE).

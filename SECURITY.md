# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in IssueCrush, please report it responsibly.

### How to Report

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security vulnerabilities by:

1. Opening a [Security Advisory](https://github.com/AndreaGriffiths11/IssueCrush/security/advisories/new) in this repository
2. Sending an email to andreagriffiths11@gmail.com with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Response Time:** We aim to acknowledge vulnerability reports within 48 hours
- **Updates:** We'll keep you informed about the progress of addressing the issue
- **Credit:** We'll credit you in the security advisory (unless you prefer to remain anonymous)
- **Disclosure:** We follow coordinated disclosure practices and will work with you on appropriate timing

## Security Best Practices

When deploying IssueCrush:

### OAuth Configuration

- ✅ **DO** use HTTPS for production deployments
- ✅ **DO** set a specific callback URL (not wildcards)
- ✅ **DO** use the `repo` scope only (minimum necessary permissions)
- ❌ **DON'T** commit OAuth client secrets to version control
- ❌ **DON'T** expose client secrets in client-side code

### Token Storage

- ✅ **DO** use `expo-secure-store` for mobile token storage
- ✅ **DO** store tokens server-side when possible
- ✅ **DO** implement token expiration and refresh
- ❌ **DON'T** log or print OAuth tokens
- ❌ **DON'T** store tokens in localStorage on web (use secure httpOnly cookies for production)

### Environment Variables

- ✅ **DO** use `.env` files for local development
- ✅ **DO** use platform-specific secret management for production (Azure Key Vault, GitHub Secrets, etc.)
- ✅ **DO** rotate secrets regularly
- ❌ **DON'T** commit `.env` files to version control
- ❌ **DON'T** include secrets in error messages or logs

### Dependencies

- ✅ **DO** keep dependencies up to date
- ✅ **DO** review Dependabot alerts promptly
- ✅ **DO** run `npm audit` regularly
- ✅ **DO** use `npm ci` in production for reproducible builds
- ❌ **DON'T** ignore security warnings

### API Security

- ✅ **DO** validate all user inputs
- ✅ **DO** implement rate limiting for production
- ✅ **DO** use session tokens with appropriate TTL
- ✅ **DO** sanitize data before displaying user-generated content
- ❌ **DON'T** trust client-side validation alone

## Known Security Considerations

### GitHub Copilot SDK

- Requires user to have active GitHub Copilot subscription
- AI summaries are generated server-side using the user's token
- No user data is sent to third-party services beyond GitHub

### Azure Cosmos DB

- Uses Azure SDK with secure connection strings
- Implements 24-hour TTL for session cleanup
- Partition key prevents cross-session data access

### CORS

- Development server uses permissive CORS for local testing
- **Production deployments should restrict CORS origins**

## Dependency Security

We use Dependabot to monitor dependencies for security vulnerabilities:

- **Root package.json**: React Native app dependencies
- **api/package.json**: Azure Functions backend dependencies

Both are monitored independently. When vulnerabilities are detected:

1. Dependabot opens a PR with the recommended update
2. Automated tests run to verify the update doesn't break functionality
3. Manual review ensures compatibility
4. PR is merged and deployed

## Security Contact

For security-related questions that aren't vulnerabilities, you can:

- Open a [Discussion](https://github.com/AndreaGriffiths11/IssueCrush/discussions) with the `security` label
- Contact the maintainers via the repository

---

**Last Updated:** March 2026

# Why Azure Functions?

This document explains the rationale behind choosing Azure Functions for the IssueCrush backend.

## Requirements

IssueCrush backend needed:
1. OAuth token exchange (keep client secret secure)
2. GitHub API proxy (session-based auth)
3. AI summaries via Copilot SDK
4. Low operational overhead
5. Cost-effective for small scale

## Why Serverless?

**Traditional Server (e.g., Express on VM):**
- Always running (even at 0 requests)
- Fixed monthly cost (~$5-20/month)
- Requires OS updates, security patches
- Manual scaling configuration

**Serverless (Azure Functions):**
- Pay per execution (~$0.20/million executions)
- Auto-scales (0 to 1000s of instances)
- No OS management
- Built-in monitoring

**For IssueCrush:** Serverless wins due to low traffic (personal use tool).

## Why Azure Functions vs. Alternatives?

### vs. AWS Lambda
- ✅ Azure SWA integration (single deployment)
- ✅ Free tier includes 1M executions/month
- ❌ Cold start similar (~2-3s)

### vs. Vercel Functions
- ✅ Azure Cosmos DB integration (same ecosystem)
- ✅ Longer execution time limit (5 min vs 10 sec)
- ❌ More complex setup

### vs. Cloudflare Workers
- ✅ Familiar Node.js environment
- ❌ Workers use V8 isolates (different runtime)
- ❌ Limited package support

### vs. Express on Cloud Run
- ✅ Simpler deployment (no Docker)
- ❌ Always-running model cheaper at high traffic

## Azure Static Web Apps Integration

Azure SWA provides:
- Unified deployment (frontend + backend)
- Automatic GitHub Actions workflow
- Built-in CDN for static assets
- Free SSL certificates
- Environment variable management

**Alternative:** Separate deployments for frontend (Netlify/Vercel) and backend (Heroku/Railway)
- More complex
- More configuration
- Multiple services to manage

## Trade-offs

### Advantages
- No infrastructure management
- Auto-scaling
- Pay-per-use pricing
- Integrated monitoring
- Fast deployment

### Disadvantages
- Cold start latency (~2-3s on first request)
- Stateless (requires external session storage)
- Vendor lock-in (Azure-specific)

## Mitigations

**Cold Start:**
- Acceptable for personal use tool
- Could add "keep-warm" ping for production

**Session Storage:**
- Cosmos DB for persistence
- In-memory fallback for local dev

**Vendor Lock-in:**
- Backend code is portable Express middleware
- Could migrate to any Node.js host

## Related Documentation

- [Architecture Overview](../reference/architecture/overview.md)
- [Deploy to Azure](../how-to/deploy-azure.md)

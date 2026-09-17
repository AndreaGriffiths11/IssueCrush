# IssueCrush deployment repair report

Date: 2026-09-16 EDT  
Repository: <https://github.com/AndreaGriffiths11/IssueCrush>  
Final commit: [`eee36b174cefeb67cb8b5ced5493741d266ea3d9`](https://github.com/AndreaGriffiths11/IssueCrush/commit/eee36b174cefeb67cb8b5ced5493741d266ea3d9)  
Successful deployment: [GitHub Actions run 35166974945](https://github.com/AndreaGriffiths11/IssueCrush/actions/runs/35166974945)  
Production: <https://gray-bush-0c5cb190f.2.azurestaticapps.net/>

## Outcome

IssueCrush is deployed. The production URL serves the IssueCrush application rather than the Azure placeholder, its generated JavaScript and image assets return HTTP 200, and the managed Azure Functions API responds correctly to safe authenticated and unauthenticated probes.

## Root cause evidence

The failure was caused by the API deployment artifact growing sharply after the May 21 security lockfile update, not by the Expo output, Static Web Apps configuration, Node runtime selection, deployment token, or the platform-wide hypothesis in Azure/static-web-apps#1808.

- The last successful deployment before the regression, run 26235472452 at commit `15d408c`, used `@github/copilot` 1.0.3.
- The first failing deployment, run 26236913968 at commit `5427d4d`, was the lockfile-only security update from `@github/copilot` 1.0.3 to 1.0.51. That update fixed GHSA-9ccr-r5hg-74gf and expanded the package substantially.
- A clean Linux x64 install of the current API contained both Linux CLI variants plus the all-platform fallback bundle and measured 646 MB unpacked:
  - `@github/copilot`: 266 MB
  - `@github/copilot-linux-x64`: 162 MB
  - `@github/copilot-linuxmusl-x64`: 163 MB
- The pre-update dependency tree measured 288 MB locally and 97 MB compressed.
- Failed run 35165675759 built with Oryx, selected Node 20 / Functions v4, zipped for about 39 seconds, uploaded successfully, then failed during Functions deployment with only `Failed to deploy the Azure Functions.`
- Azure documents a 250 MB single-environment limit for Free Static Web Apps. The current unpruned API artifact was far above that limit.
- After pruning only unused Copilot deployment files, the clean Linux x64 API tree measured 208 MB unpacked and 97 MB compressed.
- Successful run 35166974945 logged the pruning step, zipped the API in about 14 seconds, uploaded it, and reached `Status: Succeeded` / `Deployment Complete :)` after 31 seconds of deployment polling.

Azure/static-web-apps#1808 describes a similar generic managed Functions failure, but this repository has a direct version boundary, artifact-size change, and successful result after artifact correction. It was not necessary to change tier, recreate resources, change credentials, or migrate infrastructure.

## Repair

Two commits were pushed normally to `main`:

1. `c22bfc998d217ce785abc24ec7d5f17c0c72b9bf` — select the installed platform-specific Copilot CLI directly and prune the oversized all-platform fallback bundle during Oryx API preparation.
2. `eee36b174cefeb67cb8b5ced5493741d266ea3d9` — remove npm `.bin` links left dangling by that pruning before Azure zips the artifact.

Files changed:

- `.github/workflows/azure-swa.yml`
- `api/src/app.js`
- `api/patch-vscode-jsonrpc.js`

The repair retains `@github/copilot` 1.0.51 and its security fix. It does not remove backend/auth behavior, weaken security, change OAuth registration, change credentials, create paid resources, or bypass the existing GitHub Actions deployment route.

## Validation

Local:

- `npm test -- --runInBand`: 4 suites passed, 12 tests passed, 0 failed.
- `npm run build`: Expo web export succeeded; `dist/index.html` and copied `dist/staticwebapp.config.json` were non-empty.
- `npx --yes --package=node@20 node --stack-size=8192 node_modules/typescript/bin/tsc --noEmit`: passed.
- API module import under the installed Azure Functions package: passed.
- Platform-specific Copilot CLI startup through `CopilotClient`: passed with a non-secret invalid test token; no authenticated model request was made.
- Linux x64 dependency simulation: pruning completed, retained an executable ELF x86-64 Copilot CLI, removed the fallback and musl packages, left no broken symlinks, and produced a 208 MB unpacked / 97 MB compressed artifact.
- `git diff --check`: passed.

CI:

- Run 35166801821 proved the Oryx pruning branch executed, but Azure's zipper rejected two dangling npm bin links. This yielded the bounded follow-up fix rather than a blind rerun.
- Run 35166974945 passed all build, config-copy, API-install, Oryx, upload, and deployment steps.

Production HTTP checks on 2026-09-16 EDT:

- `GET /`: HTTP 200, title `IssueCrush`, expected security headers present; body is the application, not the Azure placeholder.
- Generated JavaScript bundle: HTTP 200, `content-type: text/javascript`, 3,628,672 bytes.
- Browser-loaded application images: HTTP 200.
- `GET /api/health`: HTTP 200 with `status: ok` and `copilotAvailable: true`.
- `GET /api/issues` without a session: HTTP 401 with the expected session-expired response.
- `POST /api/logout` without a session: HTTP 200 with `{ "ok": true }`.
- `POST /api/github-token` with an empty JSON body: HTTP 400 with the expected missing-code response.
- Browser render showed the IssueCrush sign-in screen and expected product copy. Browser network log showed successful bundle, image, and health requests; browser error log was empty.

## OAuth boundary

The web implementation derives its OAuth redirect URI from `window.location.origin`, and the live GitHub authorization navigation included the production site root as `redirect_uri`. No OAuth credentials were changed. Sign-in was not completed, so authenticated callback exchange and signed-in issue operations are not claimed as verified.

# IssueCrush Dependabot resolution report

Date: 2026-09-16 EDT  
Repository: <https://github.com/AndreaGriffiths11/IssueCrush>  
Final `main`: [`aa0f329d5e0dff913444a34d32962d36db5f508f`](https://github.com/AndreaGriffiths11/IssueCrush/commit/aa0f329d5e0dff913444a34d32962d36db5f508f)

## Outcome

All 11 Dependabot PRs open at inventory time were integrated through tested rollup PR [#204](https://github.com/AndreaGriffiths11/IssueCrush/pull/204). The rollup retained each Dependabot head commit, resolved two lockfile overlaps by keeping the newer secure versions (`qs` 6.16.0 and `nanoid` 3.3.18), passed local and GitHub CI validation, and merged normally without bypassing repository controls.

No Dependabot-authored PRs remain open. GitHub recalculated the repository from 26 open Dependabot alerts before the merge to 2 afterward.

## Initial PR dispositions

| PR | Update | Disposition |
|---|---|---|
| [#192](https://github.com/AndreaGriffiths11/IssueCrush/pull/192) | `ws` 7.5.10→7.5.11 and 8.20.1→8.21.0 | Merged through #204 |
| [#193](https://github.com/AndreaGriffiths11/IssueCrush/pull/193) | `body-parser` 2.2.2→2.3.0 | Merged through #204 |
| [#194](https://github.com/AndreaGriffiths11/IssueCrush/pull/194) | `shell-quote` 1.8.3→1.9.0; `concurrently` 9.2.1→9.2.4 | Merged through #204 |
| [#195](https://github.com/AndreaGriffiths11/IssueCrush/pull/195) | `postcss` 8.5.15→8.5.25 | Merged through #204 |
| [#196](https://github.com/AndreaGriffiths11/IssueCrush/pull/196) | `brace-expansion` 1.1.13→1.1.18 and 5.0.6→5.0.9 | Merged through #204 |
| [#197](https://github.com/AndreaGriffiths11/IssueCrush/pull/197) | `nanoid` 3.3.12→3.3.18 | Merged through #204 |
| [#198](https://github.com/AndreaGriffiths11/IssueCrush/pull/198) | `qs` 6.14.2→6.16.0 | Merged through #204 |
| [#199](https://github.com/AndreaGriffiths11/IssueCrush/pull/199) | `@xmldom/xmldom` 0.8.13→0.8.15 | Merged through #204 |
| [#200](https://github.com/AndreaGriffiths11/IssueCrush/pull/200) | `browserslist` 4.28.1→4.28.9 | Merged through #204 |
| [#201](https://github.com/AndreaGriffiths11/IssueCrush/pull/201) | `baseline-browser-mapping` 2.9.17→2.11.21 | Merged through #204 |
| [#202](https://github.com/AndreaGriffiths11/IssueCrush/pull/202) | `js-yaml` 3.14.2→3.15.2 and 4.1.1→4.3.2 | Merged through #204 |

These were patch/minor security updates within the existing Expo SDK 55 graph. No Expo, React, React Native, or native module version was changed. No GitHub Actions definition or permission was changed by the dependency rollup.

## Validation

Local validation ran from a separate clone after `npm ci`:

- `npm test -- --runInBand`: 4 suites passed, 12 tests passed, 0 failed.
- `npx tsc --noEmit`: passed.
- `npm run build`: Expo web export passed.
- `cp staticwebapp.config.json dist/staticwebapp.config.json` plus non-empty file check: passed.
- `cd api && npm ci`: passed; API dependency audit reported 0 vulnerabilities.
- `git diff --check`: passed.
- All 11 original PR head SHAs were verified as ancestors of the rollup head before merge.

Expo compatibility was checked using the repository-installed CLI after verifying `--check` in `npx expo install --help`. `npx expo install --check` reports six recommendations (`expo`, `expo-auth-session`, `expo-haptics`, `expo-secure-store`, `expo-web-browser`, and `react-native`). The exact same result and exit code reproduce on base commit `a5d0f24`, so this is baseline SDK alignment debt, not a regression from the Dependabot updates.

GitHub validation:

- Rollup PR build/export/config/API workflow: [run 35165528036](https://github.com/AndreaGriffiths11/IssueCrush/actions/runs/35165528036) — success.
- Rollup PR clean installs and TypeScript check: [run 35165528034](https://github.com/AndreaGriffiths11/IssueCrush/actions/runs/35165528034) — success.
- Final `main` clean installs and TypeScript check: [run 35165675714](https://github.com/AndreaGriffiths11/IssueCrush/actions/runs/35165675714) — success.
- Final `main` build/export/config/API steps: [run 35165675759](https://github.com/AndreaGriffiths11/IssueCrush/actions/runs/35165675759) — all passed before the Azure upload/deployment phase.

## Remaining security risk

GitHub currently reports 2 open Dependabot alerts, both high severity and both for transitive `image-size`:

- [Alert 81 / GHSA-w3rx-r6r6-pgpr](https://github.com/AndreaGriffiths11/IssueCrush/security/dependabot/81)
- [Alert 82 / GHSA-5p2g-fcmc-qvqq](https://github.com/AndreaGriffiths11/IssueCrush/security/dependabot/82)

GitHub lists no first patched version for either alert. Local `npm audit` reports 15 findings remaining in the Expo/Metro toolchain (1 low, 9 moderate, 5 high). Its suggested forced remediation would install Expo 46, which is an incompatible downgrade from SDK 55, so no forced audit remediation was attempted.

## Deployment state

The packaging fix was preserved:

- [`a5d0f24`](https://github.com/AndreaGriffiths11/IssueCrush/commit/a5d0f24158875ddb4b6be74dd9dda8c83fcee799) copies `staticwebapp.config.json` into `dist`.
- [`c325b38`](https://github.com/AndreaGriffiths11/IssueCrush/commit/c325b381180a2dd10ba3ce9f7a327c44293e53df) pins the Azure Functions runtime to Node 20.

The final deployment [run 35165675759](https://github.com/AndreaGriffiths11/IssueCrush/actions/runs/35165675759) built the web app, copied the configuration, installed API dependencies, selected Node 20.20.0 / Functions runtime v4, uploaded artifacts, and then failed in Azure with only: `Failed to deploy the Azure Functions.` This is independent of the dependency rollup and reproduces after the packaging/runtime fixes. The target URL currently returns HTTP 200 with Azure's placeholder “Congratulations on your new site” page, not IssueCrush.

No Azure resources, credentials, OAuth settings, repository visibility, branch protections, or security checks were changed.

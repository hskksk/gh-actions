# gh-actions

Shared [GitHub Actions](https://github.com/features/actions) for [hskksk](https://github.com/hskksk) repositories. Pin **`@v1`** in consumer repos.

**Coding agents:** If the user wants to adopt something from this repo into another project (e.g. *“add the opencode workflow from gh-actions”*), read **this file**—especially [Integrating into another repository](#integrating-into-another-repository)—then inspect the **target** repo and list work plus **human-only** tasks (secrets, npm approve, etc.).

---

## Integrating into another repository

Use this section when wiring `hskksk/gh-actions` into a **different** repo. Do not copy podcaster-only steps unless that repo matches.

### How to read the request

1. **Identify the artifact** — reusable workflow (under `.github/workflows/` here) vs action (top-level folder).
2. **Pin a ref** — `@v1` for production; `@main` or a SHA only for experiments.
3. **Inspect the target repo** — `package.json`, `.github/workflows/`, `.releaserc.json`, `supabase/`, Pages settings.
4. **Plan the diff** — add, replace, or delete workflows; align pnpm/Node/Bun versions with existing CI.
5. **Separate human tasks** — API keys, npm trusted publishing, stage approve (2FA), Supabase dashboard, GitHub Pages environment, org Actions policy.

Artifacts are consumed via GitHub paths only (e.g. `uses: hskksk/gh-actions/opencode-resolver@v1`), not npm install.

### Catalog

| User intent | Use | Type |
|-------------|-----|------|
| OpenCode on `/oc` | `.github/workflows/opencode.yml` | Reusable workflow |
| npm semantic-release + `npm stage publish` | `.github/workflows/npm-release-staged.yml` | Reusable workflow |
| Parse `/oc` only (custom workflow) | `opencode-resolver` | Node action |
| pnpm + Node | `setup-pnpm` | Composite |
| mise (pinned action + release) | `setup-mise` | Composite |
| Supabase CLI in CI | `setup-supabase-cli` | Composite |
| Upload Pages artifact after build | `publish-github-pages-artifact` | Composite |

The reusable workflow **file name here** for OpenCode is `opencode.yml`. The consumer may name their wrapper workflow anything.

### Common steps (every adoption)

- [ ] Add or thin `.github/workflows/*.yml` with `uses: hskksk/gh-actions/...` and correct `permissions` / `secrets: inherit`.
- [ ] Confirm **Actions** are enabled (org policy may block third-party actions).
- [ ] Document new secrets/variables in the **target** repo README.
- [ ] Open a PR and verify CI in the **consumer** repo.

### `opencode` reusable workflow

**`uses: hskksk/gh-actions/.github/workflows/opencode.yml@v1`**

Triggers are **not** included—you define `on:`. Job flow: checkout → `opencode-resolver` → pnpm or Bun (build mode) → `anomalyco/opencode/github@latest`.

**Inspect target:** existing `opencode.yml` (replace inline `github-script`), lockfile, pnpm vs Bun.

```yaml
name: opencode

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [opened, edited]
  pull_request:
    types: [opened, edited]

jobs:
  opencode:
    uses: hskksk/gh-actions/.github/workflows/opencode.yml@v1
    secrets: inherit
    with:
      toolchain: pnpm
      pnpm-version: "9.14.0"
      node-version: "24"
      trigger-allowlist: ${{ vars.OPENCODE_TRIGGER_ALLOWLIST }}
```

| Secret | Purpose |
|--------|---------|
| `OPENCODE_API_KEY` | Zen / `opencode/*` |
| `OPENCODE_GO_API_KEY` | `opencode-go/*` |

| Variable | Purpose |
|----------|---------|
| `OPENCODE_TRIGGER_ALLOWLIST` | Extra allowed trigger logins |

**Human:** create OpenCode keys → repo secrets; optional allowlist variable; confirm org allows `anomalyco/opencode`.

**Agent:** remove old inline resolver; match toolchain versions; use `toolchain: bun` + `stub-opencode-auth: true` when needed (e.g. prism-style).

### `npm-release-staged` reusable workflow

**`uses: hskksk/gh-actions/.github/workflows/npm-release-staged.yml@v1`**

typecheck → test → build → `semantic-release`. **`.releaserc.json` stays in the consumer repo.**

```yaml
jobs:
  release:
    uses: hskksk/gh-actions/.github/workflows/npm-release-staged.yml@v1
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    with:
      pnpm-version: "11.25.0"
      node-version: "22.14.0"
```

**Human:** npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers); approve staged releases (2FA); Conventional Commits on `main`.

**Agent:** keep `.releaserc.json` unless asked; override `run-typecheck` / `run-test` / `run-build` / `cache-dependency-path` if scripts differ; do not set `registry-url` on `setup-node` in the consumer job.

### `opencode-resolver` (action only)

**`uses: hskksk/gh-actions/opencode-resolver@v1`** — outputs `mode`, `model`, `prompt`. Same OpenCode secrets if followed by `anomalyco/opencode/github`.

### `setup-pnpm`

Match `pnpm-version`, `node-version`, and `cache-dependency-path` to the target repo.

### `setup-mise`

Pins `jdx/mise-action` to a commit on `main` and the mise binary to a GitHub Release (immutable). Use instead of `jdx/mise-action@...` without a `version` input.

```yaml
steps:
  - uses: hskksk/gh-actions/setup-mise@v1
```

Inputs: `version` (default `2026.10.2`), `install`, `cache`.

### `setup-supabase-cli`

```yaml
env:
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
  SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
steps:
  - uses: hskksk/gh-actions/setup-supabase-cli@v1
```

**Human:** Supabase token, project ref, DB password secrets. **Agent:** keep `pnpm run deploy` and project `.env` steps in the consumer workflow.

### `publish-github-pages-artifact`

Caller builds, then uploads; separate job runs `actions/deploy-pages@v4`. Use `skip: "true"` when site URL unset.

**Human:** enable Pages (artifact), `github-pages` environment, variables such as `NEXT_PUBLIC_SITE_URL`.

### Human vs agent (summary)

| Topic | Agent | Human |
|-------|-------|-------|
| Consumer workflow YAML | ✓ | |
| API keys / npm tokens | | ✓ |
| npm trusted publisher + stage approve | | ✓ |
| Supabase / Pages / org Actions policy | | ✓ |
| Version pins from target repo CI | ✓ | |

---

## Actions (reference)

### `opencode-resolver`

```yaml
- uses: hskksk/gh-actions/opencode-resolver@v1
  id: slash
  with:
    trigger-allowlist: ${{ vars.OPENCODE_TRIGGER_ALLOWLIST }}
```

### `setup-pnpm`

Inputs: `pnpm-version`, `node-version`, `cache`, `install`, `frozen-lockfile`, `cache-dependency-path`.

### `setup-mise`

Inputs: `version`, `install`, `cache`. Wraps `jdx/mise-action` with commit and release pins defined in this repo.

### `setup-supabase-cli`

Requires the three `SUPABASE_*` env vars on the step; runs `supabase/setup-cli@v2`.

### `publish-github-pages-artifact`

Inputs: `path`, `skip` (default `false`).

## Reusable workflows (reference)

| File | Role |
|------|------|
| [`opencode.yml`](.github/workflows/opencode.yml) | Full OpenCode job |
| [`npm-release-staged.yml`](.github/workflows/npm-release-staged.yml) | semantic-release + npm stage |

## Development (this repo)

```bash
cd opencode-resolver && pnpm install && pnpm test && pnpm run build
```

CI: **actionlint**, opencode-resolver test/build, composite smoke jobs.

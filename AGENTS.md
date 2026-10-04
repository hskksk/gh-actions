# AGENTS.md — integrating `hskksk/gh-actions` into another repo

This file is for **coding agents** (and humans) who adopt workflows or actions from [hskksk/gh-actions](https://github.com/hskksk/gh-actions). When a user says *“use gh-actions and add workflow X”*, follow the matching section below, inspect the **target repo**, then produce a concrete task list including **what only a human can do**.

## How to read a request

1. **Identify the artifact** — reusable workflow (`.github/workflows/…` in gh-actions) vs composite/node **action** (top-level folder).
2. **Pin a ref** — production: `@v1` (or a release tag). Experiments: branch SHA or `@main`.
3. **Open the target repo** — `package.json`, existing `.github/workflows/`, `README`, `.releaserc.json`, `supabase/`, Pages settings.
4. **Diff** — what to add, replace, or delete; do not copy podcaster-only steps unless the repo matches.
5. **List human tasks** — secrets, npm trusted publishers, 2FA, GitHub Environments, Supabase dashboard, etc.

**Distribution model:** nothing is published to npm from this repo (except the Node action’s bundled `dist/` inside the git tree). Consumers reference GitHub paths only, e.g. `uses: hskksk/gh-actions/opencode-resolver@v1`.

---

## Catalog

| User intent | Use this | Type |
|-------------|----------|------|
| OpenCode on `/oc` comments | `.github/workflows/opencode.yml` | Reusable workflow |
| npm semantic-release + `npm stage publish` | `.github/workflows/npm-release-staged.yml` | Reusable workflow |
| Parse `/oc` only (custom workflow) | `opencode-resolver` | Node action |
| pnpm + Node setup | `setup-pnpm` | Composite action |
| Supabase CLI in CI | `setup-supabase-cli` | Composite action |
| After a local build, upload Pages artifact | `publish-github-pages-artifact` | Composite action |

Workflow file names in **consumer** repos are arbitrary; the reusable workflow in gh-actions for OpenCode is still named **`opencode.yml`** (path: `hskksk/gh-actions/.github/workflows/opencode.yml@v1`).

---

## Common integration steps (all repos)

- [ ] Add or thin `.github/workflows/<name>.yml` with `jobs.<id>.uses: hskksk/gh-actions/...` and correct `permissions` / `secrets: inherit` where documented.
- [ ] Ensure **Actions** are enabled for the repo (org policy may block).
- [ ] Document new **secrets** / **variables** in the target `README` or `AGENTS.md`.
- [ ] Open a PR; verify **CI** on the PR branch (reusable workflows run in the **consumer** repo context).

---

## `opencode` reusable workflow

**Path:** `hskksk/gh-actions/.github/workflows/opencode.yml@v1`

### What it does

- Triggers are **not** included — you define `on:` (issue_comment, PR, issues, etc.).
- Runs: checkout → **`opencode-resolver`** → pnpm or Bun toolchain (build mode) → `anomalyco/opencode/github@latest`.

### Inspect in target repo

- [ ] Existing `.github/workflows/opencode.yml` (large inline `github-script` → should be replaced by `uses:`).
- [ ] `package.json` / lockfile (pnpm vs Bun for **build** mode).
- [ ] Scripts: `pnpm install`, tests (not run by this workflow except install).

### Add to consumer repo

```yaml
# .github/workflows/opencode.yml (example)
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
      toolchain: pnpm          # or bun
      pnpm-version: "9.14.0"   # match repo
      node-version: "24"
      trigger-allowlist: ${{ vars.OPENCODE_TRIGGER_ALLOWLIST }}
      # bun-version: "1.3.0"
      # stub-opencode-auth: true   # prism-style eval stub
```

### Secrets (repository)

| Secret | Required | Purpose |
|--------|----------|---------|
| `OPENCODE_API_KEY` | For Zen / `opencode/*` models | OpenCode |
| `OPENCODE_GO_API_KEY` | For `opencode-go/*` models | OpenCode Go |

### Variables (optional)

| Variable | Purpose |
|----------|---------|
| `OPENCODE_TRIGGER_ALLOWLIST` | Comma-separated GitHub logins allowed to trigger outside default collab rules |

### Ask a human to

- [ ] Create OpenCode API keys and add **repository secrets**.
- [ ] Optionally set **variable** `OPENCODE_TRIGGER_ALLOWLIST`.
- [ ] Confirm org **Actions** policy allows `anomalyco/opencode` and third-party actions.

### Agent tasks

- [ ] Remove duplicated inline resolver script from old workflow.
- [ ] Align `pnpm-version` / `node-version` / `bun-version` with repo CI.
- [ ] For Bun monorepos, set `toolchain: bun` and `stub-opencode-auth` if tests need empty `auth.json`.

---

## `npm-release-staged` reusable workflow

**Path:** `hskksk/gh-actions/.github/workflows/npm-release-staged.yml@v1`

### What it does

Checkout (full history) → `setup-pnpm` → global npm `^11.15.0` → install → **typecheck → test → build** → `pnpm exec semantic-release`.  
**Does not** ship `.releaserc.json` — that stays in the package repo (staging tag, `npm stage publish`, etc.).

### Inspect in target repo

- [ ] `.releaserc.json` and `package.json` (`publishConfig`, `semantic-release` devDeps).
- [ ] Existing `publish.yml` / `release-staging.yml`.
- [ ] Scripts: `typecheck`, `test`, `build` names (override inputs if different).
- [ ] Lockfile path (monorepo: set `cache-dependency-path`).

### Add to consumer repo

```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: release-main
  cancel-in-progress: false

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
      # run-typecheck: pnpm run typecheck
      # run-test: pnpm test
      # run-build: pnpm run build
      # cache-dependency-path: packages/foo/pnpm-lock.yaml
```

### Ask a human to

- [ ] Configure **npm Trusted Publishing** (OIDC) for the package and GitHub repo ([npm docs](https://docs.npmjs.com/trusted-publishers)).
- [ ] Use Node **≥ 22.14** in workflow (enforced via `node-version` input).
- [ ] **Approve** staged releases on npm (`npm stage approve` / web UI, **2FA**).
- [ ] Ensure **Conventional Commits** on `main` (squash PR titles if that is team policy).

### Agent tasks

- [ ] Keep `.releaserc.json` unchanged unless user asks to change release rules.
- [ ] Replace duplicate install/typecheck/test/build/release steps with single `uses:`.
- [ ] Do **not** set `registry-url` on `setup-node` in the consumer job (handled inside reusable workflow).

---

## `opencode-resolver` (action alone)

**Path:** `hskksk/gh-actions/opencode-resolver@v1`

Use when the consumer keeps a **custom** workflow but wants the slash-command parser.

### Outputs

`mode` (`skip` | `reply` | `build`), `model`, `prompt`

### Ask a human to

- [ ] Same OpenCode secrets as the opencode workflow above if followed by `anomalyco/opencode/github`.

---

## `setup-pnpm` (action alone)

**Path:** `hskksk/gh-actions/setup-pnpm@v1`

### Inspect

- [ ] pnpm and Node versions used elsewhere in CI.
- [ ] Lockfile location (`cache-dependency-path` if not repo root).

---

## `setup-supabase-cli` (action alone)

**Path:** `hskksk/gh-actions/setup-supabase-cli@v1`

### What it does

Fails fast if required env vars are missing; runs `supabase/setup-cli@v2`.

### Wire in consumer job

```yaml
env:
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
  SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
steps:
  - uses: hskksk/gh-actions/setup-supabase-cli@v1
```

### Ask a human to

- [ ] Create Supabase access token and project ref; set **DB password** secret.
- [ ] Confirm Supabase project matches deploy scripts in the repo.

### Agent tasks

- [ ] Keep project-specific steps (`pnpm run deploy`, `.env` from other secrets) in the consumer workflow.
- [ ] Optionally replace duplicate `supabase/setup-cli` + manual checks with this action.

---

## `publish-github-pages-artifact` (action alone)

**Path:** `hskksk/gh-actions/publish-github-pages-artifact@v1`

### What it does

`configure-pages` + `upload-pages-artifact` when `skip` is not `true`.  
Does **not** run the build or the final `deploy-pages` job.

### Inspect in target repo

- [ ] Build output directory (e.g. `dist/web`).
- [ ] Skip condition (e.g. missing `vars.NEXT_PUBLIC_SITE_URL`).
- [ ] Existing `permissions: pages: write, id-token: write` on the workflow.

### Typical pattern (two jobs)

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      skip: ${{ steps.check.outputs.skip }}
    steps:
      - uses: actions/checkout@v4
      - uses: hskksk/gh-actions/setup-pnpm@v1
        with:
          pnpm-version: "9.14.0"
          node-version: "24"
          install: "true"
      - run: pnpm run web:build   # project-specific
      - id: check
        run: |
          if [ ! -f dist/web/index.html ]; then
            echo "skip=1" >> "$GITHUB_OUTPUT"
          else
            echo "skip=0" >> "$GITHUB_OUTPUT"
          fi
      - uses: hskksk/gh-actions/publish-github-pages-artifact@v1
        with:
          path: dist/web
          skip: ${{ steps.check.outputs.skip == '1' }}

  deploy:
    needs: build
    if: needs.build.outputs.skip != '1'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

### Ask a human to

- [ ] Enable **GitHub Pages** (artifact source) in repo settings.
- [ ] Create **github-pages** environment if required.
- [ ] Set **variables** (e.g. `NEXT_PUBLIC_SITE_URL`) when skip logic depends on them.

---

## Version bumps in gh-actions

When `hskksk/gh-actions` ships breaking renames or workflow changes, consumers update the **`@v1`** ref (or migrate to `@v2`). Internal reusable workflows pin `hskksk/gh-actions/opencode-resolver@v1` etc.; bumping those pins requires a new release of gh-actions.

---

## Quick “human vs agent” summary

| Topic | Agent | Human |
|-------|-------|-------|
| Edit workflow YAML in consumer repo | ✓ | |
| Create API keys / npm tokens | | ✓ |
| npm trusted publisher + stage approve | | ✓ |
| Supabase dashboard / DB password | | ✓ |
| GitHub Pages + environment | | ✓ |
| Org Actions allowlist | | ✓ |
| Choose pnpm/Node versions from repo | ✓ | |
| Write `.releaserc.json` policy | ✓ (if asked) | review |

# gh-actions

Shared [GitHub Actions](https://github.com/features/actions) for [hskksk](https://github.com/hskksk) repositories. Pin **`@v1`** in consumer repos.

## Tagging and releases

This repo is **not** published to npm. Versioning exists so [semantic-release](https://semantic-release.gitbook.io/) can cut GitHub Releases from Conventional Commits on `main`.

| Ref | Kind | Purpose |
| --- | --- | --- |
| `v1.0.3`, `v1.1.0`, … | Immutable **release tag** | Exact snapshot; created by semantic-release on each release. |
| `v1`, `v2`, … | **Floating major tag** | Points at the latest release on that major line. Updated automatically after each release (`scripts/update-major-action-ref.sh`). Use this in consumer workflows: `uses: hskksk/gh-actions/actions/setup-mise@v1`. |

**Do not use a `v1` branch** for consumers—branches are easy to delete and break `@v1` resolution in GitHub Actions.

**Release flow:** merge to `main` → **CI** succeeds → **Release** workflow runs semantic-release → GitHub Release + `vX.Y.Z` tag → floating `vX` tag is force-updated to the same commit.

**Tag ancestry:** semantic-release only treats `vX.Y.Z` tags that are **reachable from `main`** as prior releases. If tags were created on an old history line, either move them onto `main` or cut a new `vX.Y.Z` on `main` before the Release workflow runs.

**One-time recovery:** if `v1` is missing but `v1.0.x` tags exist, point it at the latest 1.x tag:

```bash
git fetch --tags
latest="$(git tag -l 'v1.*' | sort -V | tail -1)"
git tag -fa v1 -m "Track latest 1.x (${latest})" "${latest}^{}"
git push origin refs/tags/v1 --force
```

**Coding agents:** If the user wants to adopt something from this repo into another project (e.g. *“add the opencode workflow from gh-actions”*), read **this file**—especially [Integrating into another repository](#integrating-into-another-repository)—then inspect the **target** repo and list work plus **human-only** tasks (secrets, npm approve, etc.).

## Repository layout

| Path | Purpose |
| --- | --- |
| [`actions/`](actions/) | Shared **composite / Node actions** consumed as `uses: hskksk/gh-actions/actions/<name>@v1`. |
| [`.github/workflows/`](.github/workflows/) | **`ci.yml` / `release.yml`** (this repo) and **reusable** `workflow_call` workflows (`opencode.yml`, `npm-release-staged.yml`). |

---

## Integrating into another repository

Use this section when wiring `hskksk/gh-actions` into a **different** repo. Do not copy podcaster-only steps unless that repo matches.

### How to read the request

1. **Identify the artifact** — reusable workflow (under `.github/workflows/` here) vs action (under [`actions/`](actions/)).
2. **Pin a ref** — `@v1` for production; `@main` or a SHA only for experiments.
3. **Inspect the target repo** — `package.json`, `.github/workflows/`, `.releaserc.json`, `supabase/`, Pages settings.
4. **Plan the diff** — add, replace, or delete workflows; pin Node/pnpm/Bun (and related CLIs) in **`.mise.toml`**.
5. **Separate human tasks** — API keys, npm trusted publishing, stage approve (2FA), Supabase dashboard, GitHub Pages environment, org Actions policy.

Artifacts are consumed via GitHub paths only (e.g. `uses: hskksk/gh-actions/actions/opencode-resolver@v1`), not npm install.

### Catalog

| User intent | Use | Type |
|-------------|-----|------|
| OpenCode on `/oc` | `.github/workflows/opencode.yml` + [`examples/opencode-consumer.yml`](examples/opencode-consumer.yml) | Reusable workflow |
| npm semantic-release + `npm stage publish` | `.github/workflows/npm-release-staged.yml` | Reusable workflow |
| Parse `/oc` only (custom workflow) | `actions/opencode-resolver` | Node action |
| pnpm + Node | `actions/setup-pnpm` | Composite |
| mise (pinned action + release) | `actions/setup-mise` | Composite |
| Supabase CLI in CI | `actions/setup-supabase-cli` | Composite |
| Upload Pages artifact after build | `actions/publish-github-pages-artifact` | Composite |

The reusable workflow **file name here** for OpenCode is `opencode.yml`. The consumer may name their wrapper workflow anything.

### Common steps (every adoption)

- [ ] Add or thin `.github/workflows/*.yml` with `uses: hskksk/gh-actions/...` and correct `permissions` / `secrets: inherit`.
- [ ] Confirm **Actions** are enabled (org policy may block third-party actions).
- [ ] Document new secrets/variables in the **target** repo README.
- [ ] Open a PR and verify CI in the **consumer** repo.

### `opencode` reusable workflow

**`uses: hskksk/gh-actions/.github/workflows/opencode.yml@v1`**

Triggers are **not** included—you define `on:`. Job flow: checkout → `opencode-resolver` (optional model ack via App OIDC) → pnpm or Bun (build mode) → stage `scripts/opencode-github-progress.sh` → `anomalyco/opencode/github@latest` (OIDC + [OpenCode GitHub App](https://github.com/apps/opencode-agent); not `use_github_token`). Progress comments use `GH_TOKEN` from inside the OpenCode run.

**Inspect target:** existing `opencode.yml` (replace inline `github-script`), lockfile, pnpm vs Bun.

#### Consumer template (copy into your repo)

Canonical file: **[`examples/opencode-consumer.yml`](examples/opencode-consumer.yml)** — copy to `.github/workflows/opencode.yml` and open a PR. Do not edit the reusable workflow in `gh-actions`; only add this thin wrapper in the consumer repo.

```yaml
# Same as examples/opencode-consumer.yml — keep in sync when adopting
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
    permissions:
      id-token: write
    uses: hskksk/gh-actions/.github/workflows/opencode.yml@v1
    secrets: inherit
    with:
      toolchain: pnpm
      trigger-allowlist: ${{ vars.OPENCODE_TRIGGER_ALLOWLIST }}
```

Use `toolchain: bun` when the consumer repo uses Bun. Pin Node/pnpm/Bun in the consumer **`.mise.toml`** (not deprecated `pnpm-version` / `node-version` inputs on `with:`).

#### Common mistakes (caller wrapper)

| Mistake | Why it breaks |
|--------|----------------|
| No `permissions` on the `opencode` job | Reusable workflow cannot get `id-token: write`; workflow file validation fails |
| Omitting `id-token: write` on the caller job | No OIDC → no App token for ack comments, progress posts, or `anomalyco/opencode/github` |
| Workflow-level `permissions: contents: read` only | Caps the job token; caller job still needs `id-token: write` on the **job** |
| `GITHUB_TOKEN` + `use_github_token` without switching the reusable workflow | This template uses OIDC + App; do not mix modes |
| Missing `.mise.toml` in the consumer repo | `setup-mise` has nothing to install for build mode |

The **caller job** must grant **`id-token: write` only** (same as the reusable workflow). Model ack and OpenCode itself exchange OIDC for the App token (`GH_TOKEN`); progress comments use that same env inside the agent run—not the workflow `GITHUB_TOKEN`. Reusable workflows cannot elevate beyond what the caller allows.

| Secret | Purpose |
|--------|---------|
| `OPENCODE_API_KEY` | Zen / `opencode/*` |
| `OPENCODE_GO_API_KEY` | `opencode-go/*` |

| Variable | Purpose |
|----------|---------|
| `OPENCODE_TRIGGER_ALLOWLIST` | Extra allowed trigger logins |

**Human:** install [OpenCode GitHub App](https://github.com/apps/opencode-agent) on the repo; create OpenCode API keys → repo secrets; optional allowlist variable; confirm org allows `anomalyco/opencode`.

**Agent:** remove old inline resolver; add **`.mise.toml`** with the caller’s toolchain; use `toolchain: bun` + `stub-opencode-auth: true` when needed (e.g. prism-style).

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
      run-typecheck: ""
      run-build: ""
```

**Human:** npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers); approve staged releases (2FA); Conventional Commits on `main`.

**Agent:** keep `.releaserc.json` unless asked; add **`.mise.toml`** (include `npm` ≥ 11.15.0 for stage publish when using this workflow); override `run-typecheck` / `run-test` / `run-build` if scripts differ.

### `opencode-resolver` (action only)

**`uses: hskksk/gh-actions/actions/opencode-resolver@v1`** — outputs `mode`, `model`, `prompt`. Same OpenCode secrets if followed by `anomalyco/opencode/github`.

### `setup-pnpm`

Legacy composite (pnpm/action-setup + setup-node). Prefer **`setup-mise`** and a committed **`.mise.toml`** in consumer repos. Still supported for older workflows.

### `setup-mise`

Default for CI in hskksk repos. Installs tools from the checked-out **`.mise.toml`**. Pins `jdx/mise-action` to a commit on `main` and the mise binary to a GitHub Release (immutable).

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: hskksk/gh-actions/actions/setup-mise@v1
  - run: pnpm install --frozen-lockfile
```

Reusable workflows **`opencode.yml`** and **`npm-release-staged.yml`** call `actions/setup-mise` on the caller repository (after checkout).

Inputs: `version` (mise release, default `2026.10.2`), `install`, `cache`.

### `setup-supabase-cli`

Verifies `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, and `SUPABASE_DB_PASSWORD` are set as **environment variables** (map from `secrets` on the job or workflow). Optionally installs the CLI.

**Secrets are not automatically env vars** — you must assign them explicitly, for example:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
    steps:
      - uses: actions/checkout@v4
      - uses: hskksk/gh-actions/actions/setup-mise@v1
      - uses: hskksk/gh-actions/actions/setup-supabase-cli@v1
        with:
          install: "false"
```

With **`install: "false"`**, only the secret guard runs; pin `supabase` in **`.mise.toml`** and install via `setup-mise`. Default **`install: "true"`** keeps `supabase/setup-cli@v2`.

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
| Version pins in caller **`.mise.toml`** | ✓ | |

---

## Actions (reference)

### `opencode-resolver`

```yaml
- uses: hskksk/gh-actions/actions/opencode-resolver@v1
  id: slash
  with:
    trigger-allowlist: ${{ vars.OPENCODE_TRIGGER_ALLOWLIST }}
```

### `setup-pnpm`

Inputs: `pnpm-version`, `node-version`, `cache`, `install`, `frozen-lockfile`, `cache-dependency-path`.

### `setup-mise`

Inputs: `version`, `install`, `cache`. Wraps `jdx/mise-action` with commit and release pins defined in this repo.

### `setup-supabase-cli`

Inputs: `install` (default `"true"`; set `"false"` when CLI comes from mise), `cli-version` (reserved).

Requires the three `SUPABASE_*` **env vars** (map from secrets on the job/workflow). When `install` is `"true"`, runs `supabase/setup-cli@v2`.

### `publish-github-pages-artifact`

Inputs: `path`, `skip` (default `false`).

## Reusable workflows (reference)

| File | Role |
|------|------|
| [`opencode.yml`](.github/workflows/opencode.yml) | Full OpenCode job |
| [`npm-release-staged.yml`](.github/workflows/npm-release-staged.yml) | semantic-release + npm stage |

## Development (this repo)

Root **`.mise.toml`** pins Node, pnpm, npm, Bun, and actionlint. CI uses `actions/setup-mise`.

```bash
mise install
cd actions/opencode-resolver && pnpm install && pnpm test && pnpm run build
```

CI: **actionlint**, opencode-resolver test/build, composite smoke jobs, **semantic-release dry-run** on pull requests.

**Releases:** see [Tagging and releases](#tagging-and-releases). After `main` CI passes, `.github/workflows/release.yml` runs semantic-release and refreshes the floating major tag.

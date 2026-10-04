# gh-actions

Shared [GitHub Actions](https://github.com/features/actions) for [hskksk](https://github.com/hskksk) repositories.

Pin releases with `@v1` (see [Releases](https://github.com/hskksk/gh-actions/releases)). Use `@main` only for experiments.

## Actions

### `opencode-slash-command`

Parses OpenCode slash commands (`/oc`, `/oci`, …) from issue/PR events, checks who may run them, and outputs mode, model, and prompt.

| Input | Default | Description |
|-------|---------|-------------|
| `github-token` | `github.token` | Token for collaborator permission checks |
| `trigger-allowlist` | `""` | Extra allowed logins (comma/newline separated) |
| `default-model` | `opencode/big-pickle` | Model when omitted |

| Output | Description |
|--------|-------------|
| `mode` | `skip`, `reply`, or `build` |
| `model` | Resolved model id |
| `prompt` | Text for OpenCode |

```yaml
- uses: hskksk/gh-actions/opencode-slash-command@v1
  id: slash
  with:
    trigger-allowlist: ${{ vars.OPENCODE_TRIGGER_ALLOWLIST }}
```

### `setup-pnpm`

Installs pnpm and Node.js; optionally runs `pnpm install`.

| Input | Default | Description |
|-------|---------|-------------|
| `pnpm-version` | (required) | pnpm version |
| `node-version` | (required) | Node.js version |
| `cache` | `true` | Enable pnpm cache in setup-node |
| `install` | `false` | Run `pnpm install` |
| `frozen-lockfile` | `true` | Pass `--frozen-lockfile` when installing |
| `cache-dependency-path` | `pnpm-lock.yaml` | Lockfile path for setup-node cache |

```yaml
- uses: hskksk/gh-actions/setup-pnpm@v1
  with:
    pnpm-version: "9.14.0"
    node-version: "24"
    install: "true"
```

## Reusable workflows

### `.github/workflows/opencode.yml`

Full OpenCode job (checkout → parse slash command → toolchain → `anomalyco/opencode/github`). The **caller** defines `on:` triggers.

**Secrets:** `OPENCODE_API_KEY`, `OPENCODE_GO_API_KEY` (`secrets: inherit`).

```yaml
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

Bun toolchain: `toolchain: bun`, `bun-version: "1.3.0"`, optional `stub-opencode-auth: true`.

Internal steps pin `hskksk/gh-actions/*@v1` and `anomalyco/opencode/github@latest`.

### `.github/workflows/npm-release-staged.yml`

semantic-release on `main` (or any caller trigger) with **npm stage publish** via the package repo’s `.releaserc.json` (e.g. `@semantic-release/exec` + `npm stage publish`).

Pre-release order: **typecheck → test → build** (commands are overridable).

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

| Input | Default | Description |
|-------|---------|-------------|
| `pnpm-version` | (required) | pnpm version |
| `node-version` | (required) | Node.js version |
| `cache-dependency-path` | `pnpm-lock.yaml` | Lockfile for cache |
| `run-typecheck` | `pnpm run typecheck` | Empty to skip |
| `run-test` | `pnpm test` | Test command |
| `run-build` | `pnpm run build` | Build command |

Does **not** set `registry-url` on `setup-node` (OIDC + semantic-release). Upgrades global npm to `^11.15.0` for `npm stage`.

## Development

```bash
cd opencode-slash-command
pnpm install
pnpm test
pnpm run build   # writes dist/index.js (commit after changes)
```

Validate workflows (optional):

```bash
actionlint .github/workflows/*.yml
```

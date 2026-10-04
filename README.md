# gh-actions

Shared [GitHub Actions](https://github.com/features/actions) for [hskksk](https://github.com/hskksk) repositories.

Pin releases with `@v1` (see [Releases](https://github.com/hskksk/gh-actions/releases)). Use `@main` only for experiments.

## Actions

### `opencode-resolve-trigger`

Resolves OpenCode slash commands (`/oc`, `/oci`, …), authorization, model, and prompt from issue/PR events.

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
- uses: hskksk/gh-actions/opencode-resolve-trigger@v1
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

Full OpenCode job (checkout → resolve → toolchain → `anomalyco/opencode/github`). The **caller** defines `on:` triggers.

**Secrets:** `OPENCODE_API_KEY`, `OPENCODE_GO_API_KEY` (inherit via `secrets: inherit`).

**Example (podcaster-style):**

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

**Prism-style (Bun + auth stub):**

```yaml
    with:
      toolchain: bun
      bun-version: "1.3.0"
      stub-opencode-auth: true
      trigger-allowlist: ${{ vars.OPENCODE_TRIGGER_ALLOWLIST }}
```

| Input | Default | Description |
|-------|---------|-------------|
| `toolchain` | `pnpm` | `pnpm` or `bun` |
| `pnpm-version` | `9.14.0` | For pnpm toolchain |
| `node-version` | `24` | For pnpm toolchain |
| `bun-version` | `1.3.0` | For bun toolchain |
| `stub-opencode-auth` | `false` | Empty `auth.json` before build |
| `trigger-allowlist` | `""` | Allowlist variable value |
| `gh-actions-ref` | `v1` | Ref for actions in this repo |
| `opencode-action-ref` | `latest` | Ref for `anomalyco/opencode/github` |

## Development

```bash
cd opencode-resolve-trigger
pnpm install
pnpm test
pnpm run build   # writes dist/index.js (commit after changes)
```

# gh-actions

Shared [GitHub Actions](https://github.com/features/actions) for [hskksk](https://github.com/hskksk) repositories.

Pin releases with `@v1`. For **integrating into another repo**, agents and humans should start with **[AGENTS.md](./AGENTS.md)**.

## Actions

### `opencode-resolver`

Parses OpenCode slash commands (`/oc`, `/oci`, …), checks authorization, outputs `mode`, `model`, `prompt`.

```yaml
- uses: hskksk/gh-actions/opencode-resolver@v1
  id: slash
  with:
    trigger-allowlist: ${{ vars.OPENCODE_TRIGGER_ALLOWLIST }}
```

### `setup-pnpm`

pnpm + Node.js; optional `pnpm install`. Inputs: `pnpm-version`, `node-version`, `cache`, `install`, `frozen-lockfile`, `cache-dependency-path`.

### `setup-supabase-cli`

Requires `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` on the step `env`; installs [Supabase CLI](https://github.com/supabase/setup-cli).

### `publish-github-pages-artifact`

Runs `configure-pages` + `upload-pages-artifact` unless `skip: "true"`. Caller runs build and `deploy-pages` separately.

## Reusable workflows

| Workflow | Purpose |
|----------|---------|
| [`opencode.yml`](.github/workflows/opencode.yml) | Full OpenCode job (caller defines `on:`) |
| [`npm-release-staged.yml`](.github/workflows/npm-release-staged.yml) | semantic-release + npm stage (caller keeps `.releaserc.json`) |

## Development

```bash
cd opencode-resolver && pnpm install && pnpm test && pnpm run build
```

CI runs **actionlint**, action tests/build, and smoke jobs for composites.

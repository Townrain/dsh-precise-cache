# dsh-precise-cache

[简体中文](README.md) | English

A **five-decimal cache-hit readout** for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI: one extra line beside the chat stats band under the composer, showing `Precise cache hit XX.XXXXX%`.

## Why

The built-in stats line rounds the cache-hit rate to an **integer**, so any real rate at or above 99.5% displays as `100%`. This plugin uses the **same denominator** the shipped line uses — cache reads over the three disjoint billed buckets (`uncachedInputTokens + cacheReadTokens + cacheWriteTokens`) — but **never rounds**, keeping five fixed decimals so near-100% hit rates show their true value. The figure rides the durable whole-log `tokenUsage` projection, so paging, compaction, and reloads cannot change it; it hides while no input has been billed.

## Features

- One-line readout beside the shipped stats line, matching its visual system (12px tertiary text, centered, ellipsized)
- Five fixed decimals, no rounding
- Bilingual zh/en, following the harness locale (`preciseCache` dictionary namespace)
- Zero host code: pure browser presentation; no Service, tool, or prompt contribution
- Fully reversible: the slot entry, dictionaries, and style tag are all cleaned up on stop/update

## Install

```sh
npx dsh-precise-cache install
```

The installer idempotently:

1. Copies the package to `$DSH_HOME/profiles/node_modules/dsh-precise-cache` (the dsh plugin resolution root)
2. Writes the composition row into `$DSH_HOME/profiles/<profile>/cordis.patch.yml`

Then **restart dsh and refresh the browser page** — the restart is the only manual step.

Options:

| Option | Meaning |
| --- | --- |
| `--profile <name>` | Target profile (default `web`) |
| `--force` | Re-copy over an installed package |
| `--from <dir>` | Install from a local source directory (after `git clone`) |

Install from source:

```sh
git clone https://github.com/Townrain/dsh-precise-cache.git
cd dsh-precise-cache
node scripts/install.js install --from . --force
```

## Uninstall

```sh
npx dsh-precise-cache uninstall
```

Or manually: delete `$DSH_HOME/profiles/node_modules/dsh-precise-cache`, remove the `name: dsh-precise-cache` insert row from `cordis.patch.yml`, then restart dsh. You can also disable the plugin from the harness settings plugin inventory.

## How it works

```
lib/index.js       host half: empty (the readout is pure browser presentation)
lib/client.js      browser half: module-table bundle, no build step
scripts/install.js one-shot installer: copy the package + write the row
```

- **Data source**: the harness `tokenUsage` projection (provider-reported values, host-folded over the whole log), read through the dock slot's standard `useProjection` seat — no custom RPC.
- **Loading contract**: `package.json` declares `dsh.client.platform = "web"` plus `inject` edges; the host scanner emits a `window.__DSH_BOOT__` graph row and mounts the `/plugins/dsh-precise-cache/client.js` route. The browser half registers through `window.__ModuleLoader__.load({ id, factory })` — the `id` is the package name, and the factory returns `{ apply, inject }`.
- **UI entry**: registered through `ctx.slots.inject('conversation.composer.dock', …)` as a fresh list id after the shipped `stats` entry; copy rides the `locale: 'preciseCache'` seat, and the `<style>` tag carries `data-plugin` ownership so the module loader reclaims it on unload.
- **Update boundary**: `lib/client.js` changes apply on page refresh; `dsh.client` declaration changes need a dsh restart.

## Development

```sh
npm run check          # node --check syntax validation
npm run install:local  # local install smoke test
```

## License

MIT © 2026 [Townrain](https://github.com/Townrain). PRs and issues welcome in the `dsh-plugin` spirit.

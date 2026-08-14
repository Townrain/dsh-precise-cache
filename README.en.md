# dsh-precise-cache

[简体中文](README.md) | English

A small add-on for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): one extra line beside the stats bar under the chat input, showing the **cache-hit rate to five decimal places**, like this:

> `Precise cache hit 99.87654%`

## What problem does it solve?

The built-in stats bar **rounds** the cache-hit rate to a whole number: once the real rate reaches 99.5%, it displays `100%`.

This plugin uses the **exact same data** the built-in line uses — it just **never rounds**, showing the real number instead.

## Install (three steps)

### Windows: one PowerShell line (no npx, nothing to install)

Open PowerShell, paste and run:

```powershell
irm https://raw.githubusercontent.com/Townrain/dsh-precise-cache/main/scripts/install.ps1 | iex
```

The script downloads the plugin, places it into dsh's plugin folder, and registers it in your config (running it twice does not double-register). Then:

1. Restart dsh
2. Refresh the browser page

Done. `Precise cache hit …%` appears beside the stats bar.

> For another profile or a forced re-copy, download the script first and pass options:
> `pwsh -File scripts/install.ps1 -Profile headless` / `-Force`

### Other ways

- With npm: `npx dsh-precise-cache install`
- After downloading this repo, with Node: `node scripts/install.js install --from . --force`

## Uninstall

```powershell
irm https://raw.githubusercontent.com/Townrain/dsh-precise-cache/main/scripts/install.ps1 -OutFile "$env:TEMP\dsh-precise-cache-install.ps1"
& "$env:TEMP\dsh-precise-cache-install.ps1" -Uninstall
```

Then restart dsh. With npm: `npx dsh-precise-cache uninstall`.

## FAQ

**I installed it but I don't see the line?** It only shows once the session has some billed input — before that it hides itself on purpose. Send a message and look again.

**Does it slow dsh down or change billing?** No. It only reads statistics dsh already computes; it makes no requests and changes no numbers.

**Why five decimals?** That was the original motivation: fewer digits make it easier to fall back into the rounding illusion.

<details>
<summary>Technical details (for developers)</summary>

### How it works

```
lib/index.js       host half: empty (the readout is pure browser presentation)
lib/client.js      browser half: module-table bundle, no build step
scripts/install.js  Node installer
scripts/install.ps1 PowerShell installer (downloads the zip + writes the row)
```

- **Data source**: the harness `tokenUsage` projection (provider-reported values, host-folded over the whole log), read through the dock slot's standard `useProjection` seat — no custom RPC. The denominator matches the shipped stats line: `uncachedInputTokens + cacheReadTokens + cacheWriteTokens`.
- **Loading contract**: `package.json` declares `dsh.client.platform = "web"` plus `inject` edges; the host scanner emits a `window.__DSH_BOOT__` graph row and mounts the `/plugins/dsh-precise-cache/client.js` route. The browser half registers through `window.__ModuleLoader__.load({ id, factory })` — the `id` is the package name, and the factory returns `{ apply, inject }`.
- **UI entry**: registered through `ctx.slots.inject('conversation.composer.dock', …)` as a fresh list id after the shipped `stats` entry; copy rides the `locale: 'preciseCache'` seat, and the `<style>` tag carries `data-plugin` ownership so the module loader reclaims it on unload.
- **Update boundary**: `lib/client.js` changes apply on page refresh; `dsh.client` declaration changes need a dsh restart.

### Development

```sh
npm run check          # node --check syntax validation
npm run install:local  # local install smoke test
```

</details>

## License

MIT © 2026 [Townrain](https://github.com/Townrain). PRs and issues welcome in the `dsh-plugin` spirit.

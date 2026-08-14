#!/usr/bin/env node
/**
 * dsh-precise-cache installer: copy the plugin into the harness's profile
 * module fallback and add one composition row to the target profile's
 * `cordis.patch.yml`. Idempotent — restarting dsh is the only manual step.
 *
 * Usage:
 *   node scripts/install.js install [--profile <name>] [--force] [--from <dir>]
 *   node scripts/install.js uninstall [--profile <name>]
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROW_ID = 'precise-cache'
const PACKAGE_NAME = 'dsh-precise-cache'
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Copy list: everything the harness needs at runtime plus the docs. */
const COPY_ENTRIES = ['package.json', 'lib', 'README.md', 'README.en.md', 'LICENSE']

/** The harness home (`$DSH_HOME`, or `~/.dsh`). */
function dshHome() {
  if (process.env.DSH_HOME) return process.env.DSH_HOME
  const base = process.env.USERPROFILE ?? process.env.HOME ?? ''
  return join(base, '.dsh')
}

/** Parse the tiny CLI: `install` (default) | `uninstall`, plus options. */
function parseArgs(argv) {
  const opts = { command: 'install', profile: 'web', force: false, from: undefined }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === 'install' || arg === 'uninstall') opts.command = arg
    else if (arg === '--force') opts.force = true
    else if (arg === '--profile') opts.profile = argv[++i] ?? opts.profile
    else if (arg.startsWith('--profile=')) opts.profile = arg.slice('--profile='.length)
    else if (arg === '--from') opts.from = argv[++i]
    else if (arg.startsWith('--from=')) opts.from = arg.slice('--from='.length)
  }
  return opts
}

/** Absolute plugin installation directory. */
function installDir(home) {
  return join(home, 'profiles', 'node_modules', PACKAGE_NAME)
}

/** Absolute profile patch file for the given profile. */
function patchPath(home, profile) {
  return join(home, 'profiles', profile, 'cordis.patch.yml')
}

/** The composition row this plugin contributes (one top-level insert item). */
function rowBlock() {
  return `- insert:\n    - id: ${ROW_ID}\n      name: ${PACKAGE_NAME}\n`
}

/** Whether the patch text already carries this plugin's row. */
function hasRow(text) {
  const nameLine = /^\s*name:\s*['"]?dsh-precise-cache['"]?\s*$/m
  return nameLine.test(text)
}

/** Insert the row into the patch text, preserving existing content. */
function insertRow(text) {
  if (hasRow(text)) return text
  const trimmed = text.replace(/\s+$/, '')
  // The pristine profile patch ends with `[]`; swap the placeholder for the row.
  if (trimmed.endsWith('[]')) {
    return trimmed.slice(0, -2).replace(/\s+$/, '') + '\n' + rowBlock()
  }
  return trimmed + '\n' + rowBlock()
}

/** Remove this plugin's insert item from the patch text (top-level span). */
function removeRow(text) {
  const lines = text.split('\n')
  let nameAt = -1
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*name:\s*['"]?dsh-precise-cache['"]?\s*$/.test(lines[i])) { nameAt = i; break }
  }
  if (nameAt === -1) return text
  let start = nameAt
  while (start > 0 && !/^- insert:\s*$/.test(lines[start - 1])) start -= 1
  start -= 1 // the `- insert:` line itself
  if (start < 0 || !/^- insert:\s*$/.test(lines[start])) return text
  let end = nameAt + 1
  while (end < lines.length && !/^- /.test(lines[end])) end += 1
  const next = lines.slice(0, start).concat(lines.slice(end))
  // Collapse a leading/trailing run of blank lines left by the removal.
  while (next.length > 0 && next[0].trim() === '') next.shift()
  while (next.length > 0 && next[next.length - 1].trim() === '') next.pop()
  return next.join('\n') + '\n'
}

function fail(message) {
  console.error(`dsh-precise-cache: ${message}`)
  process.exit(1)
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  const home = dshHome()
  const patch = patchPath(home, opts.profile)
  const target = installDir(home)
  const source = opts.from !== undefined ? resolve(opts.from) : PROJECT_ROOT

  if (opts.command === 'uninstall') {
    if (existsSync(patch)) {
      writeFileSync(patch, removeRow(readFileSync(patch, 'utf8')))
      console.log(`dsh-precise-cache: removed the row from ${patch}`)
    }
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true })
      console.log(`dsh-precise-cache: removed ${target}`)
    }
    console.log('Restart dsh to apply.')
    return
  }

  // Copy the plugin into the profile module fallback.
  if (!existsSync(join(source, 'package.json'))) {
    fail(`source ${source} has no package.json — pass --from <dir> for a local clone`)
  }
  mkdirSync(dirname(target), { recursive: true })
  if (existsSync(target) && !opts.force) {
    console.log(`dsh-precise-cache: ${target} already exists (use --force to re-copy)`)
  } else {
    rmSync(target, { recursive: true, force: true })
    mkdirSync(target, { recursive: true })
    for (const entry of COPY_ENTRIES) {
      const from = join(source, entry)
      if (!existsSync(from)) continue
      cpSync(from, join(target, entry), { recursive: true, force: true })
    }
    console.log(`dsh-precise-cache: installed to ${target}`)
  }

  // Write the composition row into the profile patch layer.
  mkdirSync(dirname(patch), { recursive: true })
  const before = existsSync(patch) ? readFileSync(patch, 'utf8') : ''
  const after = insertRow(before)
  if (after !== before) {
    writeFileSync(patch, after)
    console.log(`dsh-precise-cache: added the composition row to ${patch}`)
  } else {
    console.log(`dsh-precise-cache: the composition row is already present in ${patch}`)
  }
  console.log('Restart dsh and refresh the browser page to see the readout.')
}

main()

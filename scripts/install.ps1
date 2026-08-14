# dsh-precise-cache installer (PowerShell, no npx / no Node needed).
#
# Usage (run in PowerShell):
#   irm https://raw.githubusercontent.com/Townrain/dsh-precise-cache/main/scripts/install.ps1 | iex
#
# Or after downloading this repository:
#   pwsh -File scripts/install.ps1
#   pwsh -File scripts/install.ps1 -Profile headless
#   pwsh -File scripts/install.ps1 -Force
#   pwsh -File scripts/install.ps1 -Uninstall
#
# Idempotent: running it again changes nothing. Restarting dsh is the only
# manual step left.

[CmdletBinding()]
param(
    [string]$Profile = 'web',
    [switch]$Force,
    [switch]$Uninstall,
    [string]$From = ''
)

$ErrorActionPreference = 'Stop'

# GitHub codeload over TLS 1.2 works on old Windows PowerShell too.
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$PACKAGE_NAME = 'dsh-precise-cache'
$ZIP_URL = 'https://github.com/Townrain/dsh-precise-cache/archive/refs/heads/main.zip'
$COPY_ENTRIES = @('package.json', 'lib', 'README.md', 'README.en.md', 'LICENSE')

$DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$TargetDir = Join-Path $DshHome 'profiles\node_modules\dsh-precise-cache'
$PatchFile = Join-Path $DshHome "profiles\$Profile\cordis.patch.yml"

$ROW_BLOCK = @(
    '- insert:'
    '    - id: precise-cache'
    '      name: dsh-precise-cache'
) -join "`n"

# Set by Get-SourceDir when the repository snapshot was downloaded; cleaned
# up after the copy so no temp litter survives the install.
$script:DownloadTemp = ''

function Get-SourceDir {
    if ($From) { return (Resolve-Path $From).Path }
    # Local run from a clone: PSScriptRoot points at <repo>/scripts.
    if ($PSScriptRoot) {
        $candidate = Split-Path $PSScriptRoot -Parent
        if (Test-Path (Join-Path $candidate 'package.json')) { return $candidate }
    }
    # Remote run (`irm | iex`): download the repository snapshot.
    $script:DownloadTemp = Join-Path ([System.IO.Path]::GetTempPath()) 'dsh-precise-cache-download'
    if (Test-Path $script:DownloadTemp) { Remove-Item $script:DownloadTemp -Recurse -Force }
    New-Item -ItemType Directory -Path $script:DownloadTemp -Force | Out-Null
    $zip = Join-Path $script:DownloadTemp 'repo.zip'
    Invoke-WebRequest -Uri $ZIP_URL -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath $script:DownloadTemp -Force
    Remove-Item $zip -Force
    $extracted = Get-ChildItem $script:DownloadTemp -Directory | Select-Object -First 1
    return $extracted.FullName
}

function Remove-Row([string]$text) {
    if ($text -notmatch 'name:\s*dsh-precise-cache') { return $text }
    $lines = @($text -split "`r?`n")
    $nameAt = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\s*name:\s*[\"'']?dsh-precise-cache') { $nameAt = $i; break }
    }
    if ($nameAt -lt 0) { return $text }
    $start = $nameAt
    while ($start -gt 0 -and $lines[$start - 1] -notmatch '^- insert:\s*$') { $start-- }
    $start--
    if ($start -lt 0 -or $lines[$start] -notmatch '^- insert:\s*$') { return $text }
    $end = $nameAt + 1
    while ($end -lt $lines.Count -and $lines[$end] -notmatch '^- ') { $end++ }
    $head = if ($start -gt 0) { @($lines[0..($start - 1)]) } else { @() }
    $tail = if ($end -lt $lines.Count) { @($lines[$end..($lines.Count - 1)]) } else { @() }
    $rest = [System.Collections.ArrayList]@($head + $tail)
    while ($rest.Count -gt 0 -and [string]$rest[0] -eq '') { $rest.RemoveAt(0) }
    while ($rest.Count -gt 0 -and [string]$rest[$rest.Count - 1] -eq '') { $rest.RemoveAt($rest.Count - 1) }
    return ($rest -join "`n") + "`n"
}

function Add-Row([string]$text) {
    if ($text -match 'name:\s*dsh-precise-cache') { return $text }
    $trimmed = $text.TrimEnd()
    if ($trimmed.EndsWith('[]')) {
        return ($trimmed.Substring(0, $trimmed.Length - 2)).TrimEnd() + "`n" + $ROW_BLOCK
    }
    return $trimmed + "`n" + $ROW_BLOCK
}

function Main {
    if ($Uninstall) {
        if (Test-Path $PatchFile) {
            $text = Get-Content -Raw -Path $PatchFile -ErrorAction SilentlyContinue
            if (-not $text) { $text = '' }
            Set-Content -Path $PatchFile -Value (Remove-Row $text) -Encoding UTF8 -NoNewline
            Write-Host "dsh-precise-cache: removed the row from $PatchFile"
        }
        if (Test-Path $TargetDir) {
            Remove-Item $TargetDir -Recurse -Force
            Write-Host "dsh-precise-cache: removed $TargetDir"
        }
        Write-Host 'Restart dsh to apply.'
        return
    }

    $source = Get-SourceDir
    if (-not (Test-Path (Join-Path $source 'package.json'))) {
        throw "source $source has no package.json - pass -From <dir> for a local clone"
    }

    New-Item -ItemType Directory -Path (Split-Path $TargetDir -Parent) -Force | Out-Null
    if ((Test-Path $TargetDir) -and -not $Force) {
        Write-Host "dsh-precise-cache: $TargetDir already exists (use -Force to re-copy)"
    } else {
        if (Test-Path $TargetDir) { Remove-Item $TargetDir -Recurse -Force }
        New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
        foreach ($entry in $COPY_ENTRIES) {
            $from = Join-Path $source $entry
            if (Test-Path $from) { Copy-Item -Path $from -Destination (Join-Path $TargetDir $entry) -Recurse -Force }
        }
        Write-Host "dsh-precise-cache: installed to $TargetDir"
    }

    if ($script:DownloadTemp) { Remove-Item $script:DownloadTemp -Recurse -Force -ErrorAction SilentlyContinue }

    New-Item -ItemType Directory -Path (Split-Path $PatchFile -Parent) -Force | Out-Null
    $before = if (Test-Path $PatchFile) { Get-Content -Raw -Path $PatchFile } else { '' }
    $after = Add-Row $before
    if ($after -cne $before) {
        Set-Content -Path $PatchFile -Value $after -Encoding UTF8 -NoNewline
        Write-Host "dsh-precise-cache: added the composition row to $PatchFile"
    } else {
        Write-Host "dsh-precise-cache: the composition row is already present in $PatchFile"
    }
    Write-Host 'Restart dsh and refresh the browser page to see the readout.'
}

Main

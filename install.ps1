# Glide programming language — one-line installer for Windows.
# https://glide-lang.org
#
# Usage:
#   iwr glide-lang.org/install.ps1 -UseB | iex
#
# What it does:
#   1. Detects your CPU architecture.
#   2. Downloads the matching prebuilt binary from the latest GitHub release.
#   3. Drops it in $env:USERPROFILE\.glide and updates your user PATH.
#
# Created by Murillo Deolino. MIT licensed.

$ErrorActionPreference = 'Stop'

function Write-Step($m)  { Write-Host "glide: $m" -ForegroundColor Cyan }
function Write-Warn2($m) { Write-Host "warn:  $m" -ForegroundColor Yellow }
function Write-Err($m)   { Write-Host "error: $m" -ForegroundColor Red }

$Repo   = 'glide-lang/Glide'
$Prefix = if ($env:GLIDE_HOME) { $env:GLIDE_HOME } else { Join-Path $env:USERPROFILE '.glide' }

# -------- platform detection ----------------------------------------------
$archRaw = $env:PROCESSOR_ARCHITECTURE
$arch = switch -Regex ($archRaw) {
    'AMD64|x86_64' { 'x86_64' }
    'ARM64'        { 'aarch64' }
    default        { $null }
}
if (-not $arch) {
    Write-Err "unsupported architecture: $archRaw"
    exit 1
}
$target = "windows-$arch"
Write-Step "platform: $target"

# -------- find latest release ---------------------------------------------
$api = "https://api.github.com/repos/$Repo/releases/latest"
Write-Step 'fetching release metadata...'

try {
    $meta = Invoke-RestMethod -UseBasicParsing -Uri $api -Headers @{ 'User-Agent' = 'glide-installer' }
} catch {
    Write-Err "could not read $api"
    Write-Err $_.Exception.Message
    exit 1
}

$asset = $meta.assets | Where-Object { $_.name -match "glide-.*$target.*\.(zip|tar\.gz|tgz)$" } | Select-Object -First 1
if (-not $asset) {
    Write-Err "no release asset found for $target. Try a manual install: https://github.com/$Repo/releases/latest"
    exit 1
}

$assetUrl  = $asset.browser_download_url
$assetName = $asset.name
Write-Step "downloading $assetName"

# -------- download + extract ---------------------------------------------
$tmp = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ("glide-" + [Guid]::NewGuid().ToString('N'))) -Force
try {
    $dl = Join-Path $tmp.FullName $assetName
    Invoke-WebRequest -UseBasicParsing -Uri $assetUrl -OutFile $dl

    if (-not (Test-Path $Prefix)) {
        New-Item -ItemType Directory -Path $Prefix -Force | Out-Null
    }

    if ($assetName -match '\.zip$') {
        Expand-Archive -Path $dl -DestinationPath $Prefix -Force
    } elseif ($assetName -match '\.(tar\.gz|tgz)$') {
        # tar is available on Windows 10+ (1803+).
        $tarExe = (Get-Command tar -ErrorAction SilentlyContinue).Source
        if (-not $tarExe) {
            Write-Err 'tar is required for .tar.gz archives (Windows 10 1803+)'
            exit 1
        }
        & $tarExe -xzf $dl -C $Prefix
    } else {
        Write-Err "unknown archive format: $assetName"
        exit 1
    }
} finally {
    Remove-Item $tmp.FullName -Recurse -Force -ErrorAction SilentlyContinue
}

# -------- locate the binary -----------------------------------------------
$glideBin = $null
foreach ($candidate in @((Join-Path $Prefix 'bin\glide.exe'), (Join-Path $Prefix 'glide.exe'))) {
    if (Test-Path $candidate) { $glideBin = $candidate; break }
}
if (-not $glideBin) {
    $glideBin = (Get-ChildItem -Path $Prefix -Recurse -Filter 'glide.exe' -ErrorAction SilentlyContinue |
                 Select-Object -First 1).FullName
}
if (-not $glideBin) {
    Write-Err "extracted archive but could not find glide.exe under $Prefix"
    exit 1
}

# -------- success ----------------------------------------------------------
$ver = (& $glideBin --version 2>$null)
if (-not $ver) { $ver = '?' }
Write-Step "installed $ver to $glideBin"

$binDir = Split-Path $glideBin -Parent
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $userPath) { $userPath = '' }
$paths = $userPath -split ';' | Where-Object { $_ -ne '' }
if ($paths -notcontains $binDir) {
    [Environment]::SetEnvironmentVariable('Path', ($userPath.TrimEnd(';') + ';' + $binDir), 'User')
    Write-Step "added $binDir to your user PATH"
    Write-Warn2 'open a new terminal to pick up the PATH change'
} else {
    Write-Step "$binDir already on PATH"
}

Write-Host ''
Write-Step 'next: glide new my_app; cd my_app; glide run'
Write-Step 'docs: https://glide-lang.org/tutorial'

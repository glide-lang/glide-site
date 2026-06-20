#!/usr/bin/env bash
# Glide programming language — one-line installer for Linux and macOS.
# https://glide-lang.org
#
# Usage:
#   curl -fsSL glide-lang.org/install.sh | bash
#
# What it does:
#   1. Detects your OS and CPU architecture.
#   2. Downloads the matching prebuilt binary from the latest GitHub release.
#   3. Drops it in ~/.glide and prints next steps for PATH.
#
# Created by Murillo Deolino. MIT licensed.

set -eu

# -------- helpers ----------------------------------------------------------
say()  { printf "\033[1;36mglide:\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33mwarn:\033[0m  %s\n" "$*" >&2; }
die()  { printf "\033[1;31merror:\033[0m %s\n" "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

REPO="glide-lang/Glide"
PREFIX="${GLIDE_HOME:-$HOME/.glide}"

# -------- platform detection -----------------------------------------------
uname_s=$(uname -s 2>/dev/null || echo unknown)
uname_m=$(uname -m 2>/dev/null || echo unknown)

case "$uname_s" in
    Linux*)   os=linux ;;
    Darwin*)  os=macos ;;
    *)        die "unsupported OS: $uname_s (Glide ships Linux + macOS via this script; Windows users see install.ps1)" ;;
esac

case "$uname_m" in
    x86_64|amd64)         arch=x86_64 ;;
    aarch64|arm64)        arch=aarch64 ;;
    *)                    die "unsupported architecture: $uname_m" ;;
esac

# macOS x86_64 is not shipped; macOS users get aarch64 (works under Rosetta on Intel).
if [ "$os" = "macos" ] && [ "$arch" = "x86_64" ]; then
    warn "Intel mac detected; installing the Apple Silicon build (runs under Rosetta 2)."
    arch=aarch64
fi

target="${os}-${arch}"
say "platform: $target"

# -------- find latest release ----------------------------------------------
if ! have curl; then die "curl is required"; fi
if ! have tar;  then die "tar is required";  fi

api="https://api.github.com/repos/${REPO}/releases/latest"
say "fetching release metadata..."
meta=$(curl -fsSL "$api") || die "could not read $api"

# Pull the download URL of the first asset whose name contains the target.
# Avoid jq dependency: use grep + sed.
asset_url=$(printf '%s' "$meta" \
    | grep -Eo '"browser_download_url": *"[^"]+"' \
    | sed -E 's/.*"([^"]+)"/\1/' \
    | grep -E "glide-.*${target}[^/]*\\.(tar\\.gz|tgz|zip)$" \
    | head -n1 || true)

if [ -z "$asset_url" ]; then
    die "no release asset found for ${target}. Try a manual install: https://github.com/${REPO}/releases/latest"
fi

filename=$(basename "$asset_url")
say "downloading $filename"

# -------- download + extract ----------------------------------------------
tmpdir=$(mktemp -d 2>/dev/null || mktemp -d -t glide)
trap 'rm -rf "$tmpdir"' EXIT

curl -fL --progress-bar "$asset_url" -o "$tmpdir/$filename"

mkdir -p "$PREFIX"
case "$filename" in
    *.tar.gz|*.tgz)  tar -xzf "$tmpdir/$filename" -C "$PREFIX" ;;
    *.zip)
        if have unzip; then
            unzip -q "$tmpdir/$filename" -d "$PREFIX"
        else
            die "unzip is required for zip archives"
        fi
        ;;
    *) die "unknown archive format: $filename" ;;
esac

# -------- locate the binary ------------------------------------------------
glide_bin=""
for candidate in "$PREFIX/bin/glide" "$PREFIX/glide"; do
    if [ -x "$candidate" ]; then glide_bin="$candidate"; break; fi
done
if [ -z "$glide_bin" ]; then
    glide_bin=$(find "$PREFIX" -type f -name 'glide' -perm -u+x 2>/dev/null | head -n1 || true)
fi
[ -z "$glide_bin" ] && die "extracted archive but could not find the glide binary under $PREFIX"

# Make sure it's executable (tar usually preserves this; double-check)
chmod +x "$glide_bin"

# -------- success message --------------------------------------------------
ver=$("$glide_bin" --version 2>/dev/null || echo "?")
say "installed $ver to $glide_bin"

bin_dir=$(dirname "$glide_bin")
case ":$PATH:" in
    *":$bin_dir:"*) ;;
    *)
        echo
        say "add this line to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
        echo "    export PATH=\"$bin_dir:\$PATH\""
        echo
        say "or, in this shell only:"
        echo "    export PATH=\"$bin_dir:\$PATH\""
        ;;
esac

echo
say "next: glide new my_app && cd my_app && glide run"
say "docs: https://glide-lang.org/tutorial"

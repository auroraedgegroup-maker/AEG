#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$ROOT_DIR/.tools"
BIN_DIR="$TOOLS_DIR/bin"
DENO_DIR="$TOOLS_DIR/deno"
TMP_DIR="$TOOLS_DIR/tmp"

mkdir -p "$BIN_DIR" "$TMP_DIR"

install_deno() {
  if [[ -x "$BIN_DIR/deno" ]]; then
    echo "deno already installed"
    return
  fi

  echo "installing deno..."
  export DENO_INSTALL="$DENO_DIR"
  curl -fsSL https://deno.land/install.sh | sh
  ln -sf "$DENO_DIR/bin/deno" "$BIN_DIR/deno"
}

install_supabase() {
  if [[ -x "$BIN_DIR/supabase" ]]; then
    echo "supabase already installed"
    return
  fi

  echo "installing supabase cli..."
  local asset_url archive_path extract_dir
  asset_url="$(python3 - <<'PY'
import json
import urllib.request

with urllib.request.urlopen("https://api.github.com/repos/supabase/cli/releases/latest") as response:
    release = json.load(response)

asset = None
for item in release.get("assets", []):
    name = item.get("name", "")
    if name == "supabase_darwin_arm64.tar.gz":
        asset = item.get("browser_download_url")
        break

if not asset:
    raise SystemExit("Could not find supabase_darwin_arm64.tar.gz in latest release assets.")

print(asset)
PY
)"

  archive_path="$TMP_DIR/supabase_darwin_arm64.tar.gz"
  extract_dir="$TMP_DIR/supabase"
  rm -rf "$extract_dir"

  curl -fsSL "$asset_url" -o "$archive_path"
  mkdir -p "$extract_dir"
  tar -xzf "$archive_path" -C "$extract_dir"

  if [[ -x "$extract_dir/supabase" ]]; then
    mv "$extract_dir/supabase" "$BIN_DIR/supabase"
  elif [[ -x "$extract_dir/dist/supabase" ]]; then
    mv "$extract_dir/dist/supabase" "$BIN_DIR/supabase"
  else
    echo "Supabase CLI archive contents:"
    find "$extract_dir" -maxdepth 3 -type f
    exit 1
  fi

  chmod +x "$BIN_DIR/supabase"
}

print_next_steps() {
  cat <<EOF

Installed tools into:
  $BIN_DIR

Use them with:
  export PATH="$BIN_DIR:\$PATH"
  deno --version
  supabase --version
EOF
}

install_deno
install_supabase
print_next_steps

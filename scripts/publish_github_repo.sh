#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/use_tools.sh"

OWNER="${GITHUB_OWNER:-chrisalvarezr-spec}"
REPO_NAME="${GITHUB_REPO:-aurora-edge-group}"
VISIBILITY="${GITHUB_VISIBILITY:-private}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is not installed. Run scripts/install_tools.sh first."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login --web --git-protocol https"
  exit 1
fi

if git -C "$ROOT_DIR" remote get-url origin >/dev/null 2>&1; then
  git -C "$ROOT_DIR" remote remove origin
fi

gh repo create "$OWNER/$REPO_NAME" \
  "--$VISIBILITY" \
  --source "$ROOT_DIR" \
  --remote origin \
  --push

#!/usr/bin/env bash

if [ -n "${BASH_SOURCE[0]:-}" ]; then
  SCRIPT_PATH="${BASH_SOURCE[0]}"
elif [ -n "${ZSH_VERSION:-}" ]; then
  SCRIPT_PATH="${(%):-%N}"
else
  SCRIPT_PATH="$0"
fi

ROOT_DIR="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
export PATH="$ROOT_DIR/.tools/bin:$PATH"

if [ -z "${AWS_PROFILE:-}" ] && command -v aws >/dev/null 2>&1; then
  if aws configure list-profiles 2>/dev/null | grep -qx "codex-admin"; then
    export AWS_PROFILE="codex-admin"
  fi
fi

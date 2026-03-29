#!/usr/bin/env bash
set -euo pipefail

GITHUB_OWNER="${GITHUB_OWNER:-chrisalvarezr-spec}"
REPO_NAME="${REPO_NAME:-aurora-edge-group}"
REPO_DESC="${REPO_DESC:-Aurora Edge Group AI automation system}"

open "https://github.com/new?owner=${GITHUB_OWNER}&name=${REPO_NAME}&description=${REPO_DESC}"
open "https://help.openai.com/en/articles/11145903-connecting-github-t-chatgpt-dep-research"

if [ -d "/Applications/ChatGPT Atlas.app" ]; then
  open -a "/Applications/ChatGPT Atlas.app" "https://chatgpt.com/"
else
  open "https://chatgpt.com/"
fi

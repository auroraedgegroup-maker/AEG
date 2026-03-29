#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/use_tools.sh"

EMAIL_ADDRESS="${EMAIL_ADDRESS:-${1:-}}"
REGION="${AWS_REGION:-$(aws configure get region || true)}"
EXPORT_DIR="$ROOT_DIR/aws/exports"

if [[ -z "$EMAIL_ADDRESS" ]]; then
  echo "Usage: EMAIL_ADDRESS=name@example.com bash scripts/setup_ses_email_identity.sh" >&2
  exit 1
fi

if [[ -z "$REGION" ]]; then
  echo "AWS region is not set." >&2
  exit 1
fi

mkdir -p "$EXPORT_DIR"
STATUS_FILE="$EXPORT_DIR/ses-identity-${EMAIL_ADDRESS}.json"

if aws sesv2 get-email-identity \
  --email-identity "$EMAIL_ADDRESS" \
  --region "$REGION" >/dev/null 2>&1; then
  echo "SES identity already exists for $EMAIL_ADDRESS"
else
  aws sesv2 create-email-identity \
    --email-identity "$EMAIL_ADDRESS" \
    --region "$REGION" \
    --tags Key=Project,Value=AuroraEdge Key=ManagedBy,Value=Codex >/dev/null
fi

aws sesv2 get-email-identity \
  --email-identity "$EMAIL_ADDRESS" \
  --region "$REGION" >"$STATUS_FILE"

cat <<EOF
SES sender setup started for $EMAIL_ADDRESS

Status file:
  $STATUS_FILE

Next:
  1. Open the inbox for $EMAIL_ADDRESS
  2. Find the Amazon SES verification email
  3. Click the verification link
  4. Re-run:
     source "$ROOT_DIR/scripts/use_tools.sh"
     aws sesv2 get-email-identity --email-identity "$EMAIL_ADDRESS" --region "$REGION"
EOF

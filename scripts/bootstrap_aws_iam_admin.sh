#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/use_tools.sh"

USER_NAME="${USER_NAME:-codex-automation}"
PROFILE_NAME="${PROFILE_NAME:-codex-admin}"
REGION="${AWS_REGION:-$(aws configure get region || true)}"
POLICY_ARN="${POLICY_ARN:-arn:aws:iam::aws:policy/AdministratorAccess}"

if [[ -z "$REGION" ]]; then
  echo "AWS region is not set." >&2
  exit 1
fi

aws sts get-caller-identity --region "$REGION" >/dev/null

if ! aws iam get-user --user-name "$USER_NAME" >/dev/null 2>&1; then
  aws iam create-user \
    --user-name "$USER_NAME" \
    --tags Key=Project,Value=AuroraEdge Key=ManagedBy,Value=Codex >/dev/null
fi

aws iam attach-user-policy \
  --user-name "$USER_NAME" \
  --policy-arn "$POLICY_ARN" >/dev/null

ACCESS_KEY_COUNT="$(
  aws iam list-access-keys \
    --user-name "$USER_NAME" \
    --query 'length(AccessKeyMetadata)' \
    --output text
)"

if [[ "$ACCESS_KEY_COUNT" -ge 2 ]]; then
  echo "User $USER_NAME already has 2 access keys. Remove one before creating another." >&2
  exit 1
fi

read -r ACCESS_KEY_ID SECRET_ACCESS_KEY <<<"$(
  aws iam create-access-key \
    --user-name "$USER_NAME" \
    --query 'AccessKey.[AccessKeyId,SecretAccessKey]' \
    --output text
)"

aws configure set aws_access_key_id "$ACCESS_KEY_ID" --profile "$PROFILE_NAME"
aws configure set aws_secret_access_key "$SECRET_ACCESS_KEY" --profile "$PROFILE_NAME"
aws configure set region "$REGION" --profile "$PROFILE_NAME"
aws configure set output json --profile "$PROFILE_NAME"

cat <<EOF
IAM admin profile ready.

User:
  $USER_NAME

Profile:
  $PROFILE_NAME

Verify:
  aws sts get-caller-identity --profile "$PROFILE_NAME" --region "$REGION"
EOF

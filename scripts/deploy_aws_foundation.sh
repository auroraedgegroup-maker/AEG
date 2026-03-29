#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/use_tools.sh"

STACK_NAME="${STACK_NAME:-aurora-edge-foundation}"
REGION="${AWS_REGION:-$(aws configure get region || true)}"
BRAND_SLUG="${BRAND_SLUG:-aurora-edge-group}"
BILLING_EMAIL="${BILLING_EMAIL:-}"
MONTHLY_BUDGET_LIMIT_USD="${MONTHLY_BUDGET_LIMIT_USD:-10}"

if [[ -z "$REGION" ]]; then
  echo "AWS region is not set." >&2
  exit 1
fi

aws sts get-caller-identity --region "$REGION" >/dev/null

aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --template-file "$ROOT_DIR/aws/cloudformation/foundation.yml" \
  --parameter-overrides \
    "BrandSlug=$BRAND_SLUG" \
    "BillingEmail=$BILLING_EMAIL" \
    "MonthlyBudgetLimitUsd=$MONTHLY_BUDGET_LIMIT_USD" \
  --tags Project=AuroraEdge ManagedBy=Codex

aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs' \
  --output table

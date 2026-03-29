#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/use_tools.sh"

STACK_NAME="${STACK_NAME:-aurora-edge-lead-intake}"
REGION="${AWS_REGION:-$(aws configure get region || true)}"
BRAND_SLUG="${BRAND_SLUG:-aurora-edge-group}"
SITE_ORIGIN="${SITE_ORIGIN:-http://localhost:8080}"
CODE_BUCKET="${CODE_BUCKET:-}"

if [[ -z "$REGION" ]]; then
  echo "AWS region is not set." >&2
  exit 1
fi

if [[ -z "$CODE_BUCKET" ]]; then
  CODE_BUCKET="$(
    aws cloudformation describe-stacks \
      --stack-name aurora-edge-foundation \
      --region "$REGION" \
      --query "Stacks[0].Outputs[?OutputKey=='KnowledgeBucketName'].OutputValue" \
      --output text
  )"
fi

if [[ -z "$CODE_BUCKET" ]]; then
  echo "Could not determine code bucket from aurora-edge-foundation outputs." >&2
  exit 1
fi

PACKAGE_DIR="$ROOT_DIR/.tools/tmp/lead-intake-package"
ZIP_PATH="$ROOT_DIR/.tools/tmp/lead-intake.zip"
S3_KEY="lambda/lead-intake-$(date +%Y%m%d-%H%M%S).zip"

rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"
cp "$ROOT_DIR/aws/lambda/lead_intake/handler.py" "$PACKAGE_DIR/handler.py"

rm -f "$ZIP_PATH"
(
  cd "$PACKAGE_DIR"
  zip -q -r "$ZIP_PATH" .
)

aws s3 cp "$ZIP_PATH" "s3://$CODE_BUCKET/$S3_KEY" --region "$REGION" >/dev/null

aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --template-file "$ROOT_DIR/aws/cloudformation/lead-intake.yml" \
  --parameter-overrides \
    "BrandSlug=$BRAND_SLUG" \
    "CodeS3Bucket=$CODE_BUCKET" \
    "CodeS3Key=$S3_KEY" \
    "SiteOrigin=$SITE_ORIGIN" \
  --capabilities CAPABILITY_NAMED_IAM \
  --tags Project=AuroraEdge ManagedBy=Codex

aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs' \
  --output table

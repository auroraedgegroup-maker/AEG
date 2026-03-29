#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/use_tools.sh"

REGION="${AWS_REGION:-$(aws configure get region || true)}"
ACCOUNT_ID="$(
  aws sts get-caller-identity \
    --query 'Account' \
    --output text \
    --region "${REGION:-us-east-1}"
)"
BUCKET_NAME="${BUCKET_NAME:-aurora-edge-group-${ACCOUNT_ID}-${REGION}-site}"
BUILD_DIR="$ROOT_DIR/.tools/tmp/public-site"
WEBSITE_URL="http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"

if [[ -z "$REGION" ]]; then
  echo "AWS region is not set." >&2
  exit 1
fi

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cp -R "$ROOT_DIR/site/." "$BUILD_DIR/"

python3 - <<'PY' "$BUILD_DIR/config.js" "$WEBSITE_URL"
import pathlib
import sys

config_path = pathlib.Path(sys.argv[1])
website_url = sys.argv[2]
text = config_path.read_text(encoding="utf-8")
text = text.replace("https://YOUR_NETLIFY_SITE.netlify.app", website_url)
config_path.write_text(text, encoding="utf-8")
PY

if ! aws s3api head-bucket --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
  aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" >/dev/null
fi

aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false >/dev/null

aws s3api put-bucket-ownership-controls \
  --bucket "$BUCKET_NAME" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerPreferred}]' >/dev/null

aws s3 website "s3://$BUCKET_NAME/" --index-document index.html --error-document index.html >/dev/null

POLICY_FILE="$ROOT_DIR/.tools/tmp/public-site-policy.json"
cat >"$POLICY_FILE" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy "file://$POLICY_FILE" >/dev/null

aws s3 sync "$BUILD_DIR/" "s3://$BUCKET_NAME/" --delete >/dev/null

cat <<EOF
Public site deployed.

Bucket:
  $BUCKET_NAME

Website URL:
  $WEBSITE_URL
EOF

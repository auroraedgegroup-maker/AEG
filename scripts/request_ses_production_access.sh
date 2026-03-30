#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/use_tools.sh"

WEBSITE_URL="${WEBSITE_URL:-${1:-}}"
CONTACT_EMAIL="${CONTACT_EMAIL:-auroraedgegroup@gmail.com}"
MAIL_TYPE="${MAIL_TYPE:-MARKETING}"
CONTACT_LANGUAGE="${CONTACT_LANGUAGE:-EN}"
REGION="${AWS_REGION:-$(aws configure get region || true)}"
USE_CASE_DESCRIPTION="${USE_CASE_DESCRIPTION:-Aurora Edge Group sends personalized cold outreach and follow-up emails to local businesses that match our target service niches. Each message is human-reviewed or based on explicit business contact data, includes clear business identification, and will honor opt-out requests. We also send transactional onboarding and delivery emails to paying clients.}"

if [[ -z "$WEBSITE_URL" ]]; then
  echo "Usage: WEBSITE_URL=https://yourdomain.com bash scripts/request_ses_production_access.sh" >&2
  exit 1
fi

aws sesv2 put-account-details \
  --region "$REGION" \
  --mail-type "$MAIL_TYPE" \
  --website-url "$WEBSITE_URL" \
  --contact-language "$CONTACT_LANGUAGE" \
  --use-case-description "$USE_CASE_DESCRIPTION" \
  --additional-contact-email-addresses "$CONTACT_EMAIL" \
  --production-access-enabled

aws sesv2 get-account --region "$REGION"

#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/use_tools.sh"

DOMAIN="${DOMAIN:-${1:-}}"
REGION="${AWS_REGION:-$(aws configure get region || true)}"
MAIL_FROM_SUBDOMAIN="${MAIL_FROM_SUBDOMAIN:-mail}"
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-}"
EXPORT_DIR="$ROOT_DIR/aws/exports"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: DOMAIN=example.com bash scripts/setup_ses_domain.sh" >&2
  exit 1
fi

if [[ -z "$REGION" ]]; then
  echo "AWS region is not set." >&2
  exit 1
fi

mkdir -p "$EXPORT_DIR"

IDENTITY_FILE="$EXPORT_DIR/ses-identity-${DOMAIN}.json"
RECORDS_JSON="$EXPORT_DIR/ses-dns-${DOMAIN}.json"
ROUTE53_JSON="$EXPORT_DIR/ses-route53-${DOMAIN}.json"
SUMMARY_TXT="$EXPORT_DIR/ses-dns-${DOMAIN}.txt"

aws sesv2 create-email-identity \
  --region "$REGION" \
  --email-identity "$DOMAIN" \
  --tags Key=Project,Value=AuroraEdge Key=ManagedBy,Value=Codex \
  >"$IDENTITY_FILE"

aws sesv2 put-email-identity-mail-from-attributes \
  --region "$REGION" \
  --email-identity "$DOMAIN" \
  --mail-from-domain "${MAIL_FROM_SUBDOMAIN}.${DOMAIN}" \
  --behavior-on-mx-failure USE_DEFAULT_VALUE >/dev/null

aws sesv2 get-email-identity \
  --region "$REGION" \
  --email-identity "$DOMAIN" \
  >"$IDENTITY_FILE"

python3 - <<'PY' "$IDENTITY_FILE" "$DOMAIN" "$MAIL_FROM_SUBDOMAIN" "$RECORDS_JSON" "$ROUTE53_JSON" "$SUMMARY_TXT"
import json
import sys

identity_path, domain, mail_from_subdomain, records_json_path, route53_json_path, summary_path = sys.argv[1:7]

with open(identity_path, "r", encoding="utf-8") as handle:
    data = json.load(handle)

records = []
dkim_tokens = data.get("DkimAttributes", {}).get("Tokens") or []
for token in dkim_tokens:
    records.append({
        "name": f"{token}._domainkey.{domain}",
        "type": "CNAME",
        "value": f"{token}.dkim.amazonses.com"
    })

mail_from_domain = f"{mail_from_subdomain}.{domain}"
records.append({
    "name": mail_from_domain,
    "type": "MX",
    "value": f"10 feedback-smtp.us-east-1.amazonses.com"
})
records.append({
    "name": mail_from_domain,
    "type": "TXT",
    "value": "v=spf1 include:amazonses.com -all"
})

with open(records_json_path, "w", encoding="utf-8") as handle:
    json.dump(records, handle, indent=2)

route53 = {
    "Comment": f"SES records for {domain}",
    "Changes": [
        {
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": record["name"],
                "Type": record["type"],
                "TTL": 300,
                "ResourceRecords": [{"Value": record["value"]}],
            },
        }
        for record in records
    ],
}

with open(route53_json_path, "w", encoding="utf-8") as handle:
    json.dump(route53, handle, indent=2)

lines = [
    f"SES identity for {domain}",
    "",
    "Add these DNS records at your DNS provider:",
]
for record in records:
    lines.append(f"- {record['type']} {record['name']} -> {record['value']}")

with open(summary_path, "w", encoding="utf-8") as handle:
    handle.write("\n".join(lines) + "\n")
PY

if [[ -n "$HOSTED_ZONE_ID" ]]; then
  aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch "file://$ROUTE53_JSON" >/dev/null
fi

cat <<EOF
SES domain setup started for $DOMAIN

Identity file:
  $IDENTITY_FILE

DNS summary:
  $SUMMARY_TXT

Route 53 batch file:
  $ROUTE53_JSON

If your DNS is not in Route 53, add the records from the summary file at your DNS provider.
Then re-run:
  source "$ROOT_DIR/scripts/use_tools.sh"
  aws sesv2 get-email-identity --email-identity "$DOMAIN" --region "$REGION"
EOF

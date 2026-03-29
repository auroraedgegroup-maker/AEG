#!/usr/bin/env python3

import csv
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(1)


def run_aws(command: list[str]) -> dict:
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        fail(result.stderr.strip() or result.stdout.strip() or "AWS command failed")
    if not result.stdout.strip():
        return {}
    return json.loads(result.stdout)


def load_campaign(path: Optional[str]) -> Dict:
    if not path:
        return {}
    campaign_path = Path(path)
    if not campaign_path.exists():
        fail(f"Campaign file not found: {campaign_path}")
    with campaign_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def render_template(template: str, row: Dict, context: Dict) -> str:
    merged = {**context, **row}
    return template.format(**merged).strip()


def render_body(row: Dict, brand_name: str, site_url: str, campaign: Dict) -> Tuple[str, str]:
    first_name = (row.get("name") or "there").split(" ")[0]
    business_name = row.get("business_name") or "your business"
    niche = row.get("niche") or "service"
    city = row.get("city") or "your market"
    pain_point = row.get("pain_point") or "slow follow-up"
    offer = row.get("offer_interest") or "AI Follow-Up Audit"

    base_context = {
        "brand_name": brand_name,
        "site_url": site_url,
        "first_name": first_name,
        "business_name": business_name,
        "niche": niche,
        "city": city,
        "pain_point": pain_point,
        "offer": offer,
        "sender_name": campaign.get("sender_name", brand_name),
    }

    proof_line = render_template(
        campaign.get(
            "proof_line",
            f"We help {niche.lower()} teams stop losing leads from missed calls, slow follow-up, and stale pipeline.",
        ),
        row,
        base_context,
    )
    offer_line = render_template(
        campaign.get(
            "offer_line",
            f"We built a fast {offer} offer to map the leak and show the next automation to install first.",
        ),
        row,
        base_context,
    )
    cta_line = render_template(
        campaign.get("cta_line", f"If you want to see it, start here: {site_url}"),
        row,
        base_context,
    )
    opt_out_line = render_template(
        campaign.get(
            "opt_out_line",
            "If this is not relevant, reply and I will close the loop.",
        ),
        row,
        base_context,
    )

    context = {
        **base_context,
        "proof_line": proof_line,
        "offer_line": offer_line,
        "cta_line": cta_line,
        "opt_out_line": opt_out_line,
    }

    subject_template = campaign.get("subject_template", "Quick idea for {business_name}")
    body_template = campaign.get(
        "body_template",
        (
            "Hi {first_name},\n\n"
            "{proof_line}\n\n"
            "I noticed a common issue around {pain_point}. {offer_line}\n\n"
            "{cta_line}\n\n"
            "{opt_out_line}\n\n"
            "- {sender_name}"
        ),
    )

    subject = render_template(subject_template, row, context)
    body = render_template(body_template, row, context)
    return subject, body


def row_matches_filters(row: Dict, campaign: Dict) -> bool:
    required_niche = (campaign.get("required_niche") or "").strip().lower()
    required_city = (campaign.get("required_city") or "").strip().lower()

    if required_niche and (row.get("niche") or "").strip().lower() != required_niche:
        return False
    if required_city and (row.get("city") or "").strip().lower() != required_city:
        return False
    return True


def write_preview(preview_path: Path, entries: List[Dict]) -> None:
    lines = [
        f"# Outreach Preview",
        "",
        f"Generated: {datetime.now(timezone.utc).replace(microsecond=0).isoformat()}",
        "",
    ]
    for entry in entries:
        lines.extend(
            [
                f"## {entry['business_name']} <{entry['email']}>",
                "",
                f"Subject: {entry['subject']}",
                "",
                entry["body"],
                "",
                "---",
                "",
            ]
        )
    preview_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 3:
        fail("Usage: python3 scripts/send_business_outreach.py prospects.csv sender@yourdomain.com")

    csv_path = Path(sys.argv[1])
    sender = sys.argv[2]
    brand_name = os.environ.get("BRAND_NAME", "Aurora Edge Group")
    site_url = os.environ.get("SITE_URL", "https://YOUR_NETLIFY_SITE.netlify.app")
    region = os.environ.get("AWS_REGION", "us-east-1")
    max_sends = int(os.environ.get("MAX_SENDS", "10"))
    campaign = load_campaign(os.environ.get("CAMPAIGN_FILE"))
    preview_only = os.environ.get("PREVIEW_ONLY", "").lower() in {"1", "true", "yes"}
    preview_output = Path(
        os.environ.get(
            "PREVIEW_OUTPUT",
            f"outbox/outreach-preview-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.md",
        )
    )

    count = 0
    previews: List[Dict] = []
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            recipient = (row.get("email") or "").strip()
            if not recipient:
                continue
            if not row_matches_filters(row, campaign):
                continue

            subject, body = render_body(row, brand_name, site_url, campaign)
            if preview_only:
                previews.append(
                    {
                        "business_name": row.get("business_name") or "Unknown",
                        "email": recipient,
                        "subject": subject,
                        "body": body,
                    }
                )
                count += 1
                if count >= max_sends:
                    break
                continue

            payload = {
                "FromEmailAddress": sender,
                "Destination": {"ToAddresses": [recipient]},
                "Content": {
                    "Simple": {
                        "Subject": {"Data": subject},
                        "Body": {"Text": {"Data": body}},
                    }
                },
            }
            run_aws(
                [
                    "aws",
                    "sesv2",
                    "send-email",
                    "--region",
                    region,
                    "--cli-input-json",
                    json.dumps(payload),
                ]
            )
            count += 1
            if count >= max_sends:
                break

    if preview_only:
        preview_output.parent.mkdir(parents=True, exist_ok=True)
        write_preview(preview_output, previews)
        print(f"Wrote preview for {count} emails to {preview_output}")
        return

    print(f"Sent {count} emails.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3

import csv
import datetime
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(1)


def request(method: str, url: str, payload: dict, headers: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req) as response:
        body = response.read().decode("utf-8")
        if not body:
            return {}
        return json.loads(body)


def main() -> None:
    if len(sys.argv) != 2:
        fail("Usage: python3 scripts/import_leads.py templates/leads-template.csv")

    csv_path = sys.argv[1]
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        fail("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.")

    endpoint = (
        f"{supabase_url}/rest/v1/leads"
        "?on_conflict=email_normalized"
    )

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }

    imported = 0
    with open(csv_path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            payload = {
                "name": row.get("name", "").strip(),
                "business_name": row.get("business_name", "").strip(),
                "email": row.get("email", "").strip().lower(),
                "phone": row.get("phone", "").strip() or None,
                "website": row.get("website", "").strip() or None,
                "city": row.get("city", "").strip() or None,
                "niche": row.get("niche", "").strip() or None,
                "pain_point": row.get("pain_point", "").strip() or None,
                "offer_interest": row.get("offer_interest", "").strip() or "AI Follow-Up Audit",
                "channel_preference": row.get("channel_preference", "").strip() or "email",
                "source": "csv",
                "outreach_status": "queued",
                "outreach_step": 0,
                "next_action_at": datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
            }

            try:
                request("POST", endpoint, payload, headers)
                imported += 1
            except urllib.error.HTTPError as error:
                body = error.read().decode("utf-8")
                fail(f"Supabase error for {payload['email']}: {body}")

    print(f"Imported {imported} leads.")


if __name__ == "__main__":
    main()

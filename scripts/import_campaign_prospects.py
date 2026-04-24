#!/usr/bin/env python3

import csv
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
    if len(sys.argv) != 3:
        fail(
            "Usage: python3 scripts/import_campaign_prospects.py "
            "<campaign_uuid> <csv_path>"
        )

    campaign_id = sys.argv[1].strip()
    csv_path = sys.argv[2]

    if not campaign_id:
        fail("campaign_uuid is required")

    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        fail("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.")

    endpoint = f"{supabase_url}/rest/v1/outreach_prospects"

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    imported = 0
    with open(csv_path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            name = row.get("name", "").strip()
            business_name = row.get("business_name", "").strip()
            email = row.get("email", "").strip().lower()

            if not name or not business_name:
                fail("Each row must include name and business_name")

            payload = {
                "campaign_id": campaign_id,
                "name": name,
                "business_name": business_name,
                "email": email or None,
                "phone": row.get("phone", "").strip() or None,
                "website": row.get("website", "").strip() or None,
                "city": row.get("city", "").strip() or None,
                "notes": row.get("notes", "").strip() or None,
                "status": row.get("status", "").strip() or "draft",
            }

            try:
                request("POST", endpoint, payload, headers)
                imported += 1
            except urllib.error.HTTPError as error:
                body = error.read().decode("utf-8")
                fail(f"Supabase error for {name}/{email}: {body}")

    print(f"Imported {imported} prospects to campaign {campaign_id}.")


if __name__ == "__main__":
    main()

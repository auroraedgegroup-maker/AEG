#!/usr/bin/env python3

import json
import os
import sys
from datetime import datetime, timezone
import urllib.error
import urllib.parse
import urllib.request

ALLOWED_STATUSES = {"draft", "sent", "replied", "booked", "won", "lost"}


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
    if len(sys.argv) < 3:
        fail(
            "Usage: python3 scripts/update_campaign_prospect_status.py "
            "<prospect_uuid> <status> <notes_optional>"
        )

    prospect_id = sys.argv[1].strip()
    status = sys.argv[2].strip().lower()
    notes = " ".join(sys.argv[3:]).strip()

    if status not in ALLOWED_STATUSES:
        fail(f"Status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}")

    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        fail("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.")

    endpoint = f"{supabase_url}/rest/v1/outreach_prospects?id=eq.{urllib.parse.quote(prospect_id)}"

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    payload = {
        "status": status,
    }
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    if notes:
        payload["notes"] = notes

    if status in {"sent", "replied", "booked", "won"}:
        payload["sent_at"] = now

    if status in {"replied", "booked", "won"}:
        payload["replied_at"] = now

    if status in {"booked", "won"}:
        payload["booked_call_at"] = now

    try:
        result = request("PATCH", endpoint, payload, headers)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8")
        fail(f"Supabase error: {body}")

    if not result:
        fail(f"No prospect updated for id={prospect_id}")

    print(f"Updated prospect {prospect_id} -> status={status}.")


if __name__ == "__main__":
    main()

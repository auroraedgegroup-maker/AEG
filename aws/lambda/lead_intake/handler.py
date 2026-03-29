import json
import os
import re
import uuid
from datetime import datetime, timezone

import boto3


dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["LEADS_TABLE_NAME"])
site_origin = os.environ.get("SITE_ORIGIN", "*")


def cors_headers():
    return {
        "Access-Control-Allow-Origin": site_origin,
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Content-Type": "application/json",
    }


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": cors_headers(),
        "body": json.dumps(body),
    }


def normalize_email(value):
    return (value or "").strip().lower()


def normalize_phone(value):
    raw = re.sub(r"[^0-9+]", "", value or "")
    return raw[:32]


def lambda_handler(event, _context):
    method = (
        event.get("requestContext", {})
        .get("http", {})
        .get("method", event.get("httpMethod", "POST"))
    )

    if method == "OPTIONS":
        return response(200, {"ok": True})

    try:
        payload = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON body"})

    name = (payload.get("name") or "").strip()
    business_name = (payload.get("businessName") or "").strip()
    email = normalize_email(payload.get("email"))

    if not name or not business_name or not email:
        return response(400, {"error": "name, businessName, and email are required"})

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    lead_id = f"lead_{uuid.uuid4().hex[:12]}"
    existing = table.get_item(Key={"pk": f"LEAD#{email}", "sk": "PROFILE"}).get("Item")

    if existing:
        lead_id = existing.get("lead_id", lead_id)
        created_at = existing.get("created_at", now)
    else:
        created_at = now

    record = {
        "pk": f"LEAD#{email}",
        "sk": "PROFILE",
        "lead_id": lead_id,
        "email": email,
        "name": name,
        "business_name": business_name,
        "phone": normalize_phone(payload.get("phone")),
        "website": (payload.get("website") or "").strip(),
        "city": (payload.get("city") or "").strip(),
        "niche": (payload.get("niche") or "").strip(),
        "pain_point": (payload.get("painPoint") or "").strip(),
        "source": (payload.get("source") or "aws-function-url").strip(),
        "offer_interest": (payload.get("offerInterest") or "AI Follow-Up Audit").strip(),
        "lead_status": "new",
        "created_at": created_at,
        "updated_at": now,
        "gsi1pk": "STATUS#new",
        "gsi1sk": f"{created_at}#{email}",
    }

    event_item = {
        "pk": f"LEAD#{email}",
        "sk": f"EVENT#{now}#{uuid.uuid4().hex[:10]}",
        "event_type": "lead_captured",
        "captured_at": now,
        "payload": payload,
    }

    table.put_item(Item=record)
    table.put_item(Item=event_item)

    return response(
        200,
        {
            "ok": True,
            "leadId": lead_id,
            "createdAt": created_at,
            "updatedAt": now,
        },
    )

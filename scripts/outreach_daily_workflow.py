#!/usr/bin/env python3

import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta, timezone
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_DAILY_LIMIT = 8


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(1)


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def to_iso_start_of_day(day: date) -> str:
    return datetime(day.year, day.month, day.day, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


def request(method: str, url: str, headers: dict, payload: dict | None = None) -> list | dict:
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req) as response:
        body = response.read().decode("utf-8")
        if not body:
            return {} if method in {"PATCH", "POST"} else []
        return json.loads(body)


def build_headers(service_key: str, include_representation: bool = False) -> dict:
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    if include_representation:
        headers["Prefer"] = "return=representation"
    return headers


def render_template(text: str, prospect: dict) -> str:
    rendered = text
    for field in ["name", "business_name", "city", "website", "email", "phone"]:
        rendered = rendered.replace("{{" + field + "}}", (prospect.get(field) or "").strip())
    return rendered


def get_active_email_template(supabase_url: str, headers: dict, campaign_id: str) -> dict:
    query = urllib.parse.urlencode(
        {
            "campaign_id": f"eq.{campaign_id}",
            "is_active": "eq.true",
            "order": "updated_at.desc",
            "limit": 1,
            "select": "id,name,subject,body",
        }
    )
    url = f"{supabase_url}/rest/v1/outreach_email_templates?{query}"
    rows = request("GET", url, headers)
    if not rows:
        fail("No active outreach_email_templates row found for this campaign.")
    return rows[0]


def get_prospect(supabase_url: str, headers: dict, prospect_id: str) -> dict:
    query = urllib.parse.urlencode(
        {
            "id": f"eq.{prospect_id}",
            "limit": 1,
            "select": "id,campaign_id,name,business_name,email,phone,website,city,status,notes",
        }
    )
    url = f"{supabase_url}/rest/v1/outreach_prospects?{query}"
    rows = request("GET", url, headers)
    if not rows:
        fail(f"Prospect not found: {prospect_id}")
    return rows[0]


def patch_prospect(supabase_url: str, headers: dict, prospect_id: str, payload: dict) -> list:
    endpoint = f"{supabase_url}/rest/v1/outreach_prospects?id=eq.{urllib.parse.quote(prospect_id)}"
    return request("PATCH", endpoint, headers, payload)


def log_activity(supabase_url: str, headers: dict, prospect: dict, event_type: str, subject: str | None, body: str | None, metadata: dict | None = None) -> None:
    payload = {
        "prospect_id": prospect["id"],
        "campaign_id": prospect["campaign_id"],
        "event_type": event_type,
        "message_subject": subject,
        "message_body": body,
        "metadata": metadata or {},
    }
    endpoint = f"{supabase_url}/rest/v1/outreach_activity_log"
    request("POST", endpoint, headers, payload)


def queue_daily(args: argparse.Namespace, supabase_url: str, headers_read: dict, headers_write: dict) -> None:
    limit = args.limit or DEFAULT_DAILY_LIMIT
    if limit <= 0:
        fail("--limit must be greater than 0")

    query = urllib.parse.urlencode(
        {
            "campaign_id": f"eq.{args.campaign_id}",
            "status": "eq.draft",
            "order": "created_at.asc",
            "limit": limit,
            "select": "id",
        }
    )
    url = f"{supabase_url}/rest/v1/outreach_prospects?{query}"
    rows = request("GET", url, headers_read)

    if not rows:
        print("No draft prospects available to queue.")
        return

    queued_at = now_utc_iso()
    queued = 0
    for row in rows:
        patch_prospect(
            supabase_url,
            headers_write,
            row["id"],
            {
                "status": "ready_to_send",
                "ready_to_send_at": queued_at,
            },
        )
        prospect = {"id": row["id"], "campaign_id": args.campaign_id}
        log_activity(
            supabase_url,
            headers_write,
            prospect,
            "queued_ready_to_send",
            None,
            None,
            {"queued_at": queued_at, "queue_limit": limit},
        )
        queued += 1

    print(f"Queued {queued} prospects as ready_to_send for campaign {args.campaign_id}.")


def approvals(args: argparse.Namespace, supabase_url: str, headers_read: dict) -> None:
    template = get_active_email_template(supabase_url, headers_read, args.campaign_id)
    query = urllib.parse.urlencode(
        {
            "campaign_id": f"eq.{args.campaign_id}",
            "status": "eq.ready_to_send",
            "order": "ready_to_send_at.asc.nullslast,created_at.asc",
            "limit": args.limit,
            "select": "id,name,business_name,email,city,status,notes",
        }
    )
    url = f"{supabase_url}/rest/v1/outreach_prospects?{query}"
    rows = request("GET", url, headers_read)

    if not rows:
        print("No ready_to_send prospects for approval.")
        return

    print(f"Manual approval queue for campaign {args.campaign_id}")
    print(f"Active template: {template['name']} ({template['id']})")
    print("=" * 80)

    for idx, row in enumerate(rows, start=1):
        subject = render_template(template["subject"], row)
        body = render_template(template["body"], row)
        print(f"[{idx}] {row['business_name']} ({row.get('email') or 'no-email'})")
        print(f"    Prospect ID: {row['id']}")
        print(f"    Subject: {subject}")
        print(f"    Body:\n{body}")
        if row.get("notes"):
            print(f"    Notes: {row['notes']}")
        print("    Actions:")
        print(f"      Send Now: python3 scripts/outreach_daily_workflow.py send-now {row['id']}")
        print(f"      Skip:     python3 scripts/outreach_daily_workflow.py skip {row['id']} --reason \"Not a fit today\"")
        print("-" * 80)


def send_now(args: argparse.Namespace, supabase_url: str, headers_read: dict, headers_write: dict) -> None:
    prospect = get_prospect(supabase_url, headers_read, args.prospect_id)
    if prospect["status"] != "ready_to_send":
        fail(f"Prospect must be ready_to_send before send-now. Current status={prospect['status']}")

    template = get_active_email_template(supabase_url, headers_read, prospect["campaign_id"])
    subject = args.subject or render_template(template["subject"], prospect)
    body = args.body or render_template(template["body"], prospect)
    sent_at = now_utc_iso()

    patch_prospect(
        supabase_url,
        headers_write,
        prospect["id"],
        {
            "status": "sent",
            "sent_at": sent_at,
            "last_message_subject": subject,
            "last_message_body": body,
        },
    )
    log_activity(
        supabase_url,
        headers_write,
        prospect,
        "send_now_approved",
        subject,
        body,
        {"sent_at": sent_at, "template_id": template["id"]},
    )

    print("Manual send approved and logged.")
    print(f"Prospect: {prospect['business_name']} ({prospect.get('email') or 'no-email'})")
    print(f"Subject: {subject}")
    print(f"Body:\n{body}")
    print("Reminder: send this message manually from your inbox now (no bulk auto-send is performed).")


def skip_prospect(args: argparse.Namespace, supabase_url: str, headers_read: dict, headers_write: dict) -> None:
    prospect = get_prospect(supabase_url, headers_read, args.prospect_id)
    skipped_at = now_utc_iso()

    patch_prospect(
        supabase_url,
        headers_write,
        prospect["id"],
        {
            "status": "skipped",
            "skipped_at": skipped_at,
            "notes": args.reason,
        },
    )
    log_activity(
        supabase_url,
        headers_write,
        prospect,
        "manual_skip",
        None,
        None,
        {"skipped_at": skipped_at, "reason": args.reason},
    )
    print(f"Prospect {prospect['id']} skipped.")


def record_reply(args: argparse.Namespace, supabase_url: str, headers_read: dict, headers_write: dict) -> None:
    prospect = get_prospect(supabase_url, headers_read, args.prospect_id)
    replied_at = now_utc_iso()
    payload = {
        "status": "replied",
        "replied_at": replied_at,
    }
    event_type = "reply_received"

    if args.positive:
        payload["positive_reply_at"] = replied_at
        event_type = "positive_reply_received"

    if args.booked:
        payload["status"] = "booked"
        payload["booked_call_at"] = replied_at
        event_type = "call_booked"

    if args.notes:
        payload["notes"] = args.notes

    patch_prospect(supabase_url, headers_write, prospect["id"], payload)
    log_activity(
        supabase_url,
        headers_write,
        prospect,
        event_type,
        None,
        None,
        {"replied_at": replied_at, "notes": args.notes or ""},
    )
    print(f"Reply recorded for prospect {prospect['id']} with status={payload['status']}.")


def schedule_followup(args: argparse.Namespace, supabase_url: str, headers_read: dict, headers_write: dict) -> None:
    prospect = get_prospect(supabase_url, headers_read, args.prospect_id)
    template = get_active_email_template(supabase_url, headers_read, prospect["campaign_id"])

    if args.scheduled_for:
        scheduled_for = args.scheduled_for
    else:
        scheduled_for = (datetime.now(timezone.utc) + timedelta(days=args.days)).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    subject = args.subject or f"Follow up: {render_template(template['subject'], prospect)}"
    body = args.body or (
        "Hi {{name}},\n\n"
        "Wanted to circle back in case this is useful for {{business_name}}. "
        "Happy to share a short breakdown when helpful.\n\n"
        "- Christopher\nAurora Edge Group"
    )
    body = render_template(body, prospect)

    payload = {
        "prospect_id": prospect["id"],
        "campaign_id": prospect["campaign_id"],
        "followup_step": args.step,
        "scheduled_for": scheduled_for,
        "status": "scheduled",
        "message_subject": subject,
        "message_body": body,
        "notes": args.notes or None,
    }

    endpoint = f"{supabase_url}/rest/v1/outreach_followups"
    request("POST", endpoint, headers_write, payload)
    log_activity(
        supabase_url,
        headers_write,
        prospect,
        "followup_scheduled",
        subject,
        body,
        {"scheduled_for": scheduled_for, "followup_step": args.step},
    )
    print(f"Follow-up scheduled for prospect {prospect['id']} on {scheduled_for}.")


def summary(args: argparse.Namespace, supabase_url: str, headers_read: dict) -> None:
    if args.day:
        report_day = datetime.strptime(args.day, "%Y-%m-%d").date()
    else:
        report_day = datetime.now(timezone.utc).date()

    start = to_iso_start_of_day(report_day)
    end = to_iso_start_of_day(report_day + timedelta(days=1))

    def count_for(field: str) -> int:
        query = urllib.parse.urlencode(
            [
                ("campaign_id", f"eq.{args.campaign_id}"),
                (field, f"gte.{start}"),
                (field, f"lt.{end}"),
                ("select", "id"),
            ]
        )
        url = f"{supabase_url}/rest/v1/outreach_prospects?{query}"
        req = urllib.request.Request(url, method="GET", headers={**headers_read, "Prefer": "count=exact"})
        with urllib.request.urlopen(req) as response:
            count_header = response.headers.get("Content-Range", "*/0")
            return int(count_header.split("/")[-1])

    sent = count_for("sent_at")
    replies = count_for("replied_at")
    positive_replies = count_for("positive_reply_at")
    booked = count_for("booked_call_at")

    print(f"Daily outreach summary for {report_day.isoformat()} (campaign {args.campaign_id})")
    print("-" * 64)
    print(f"emails_sent: {sent}")
    print(f"replies_received: {replies}")
    print(f"positive_replies: {positive_replies}")
    print(f"booked_calls: {booked}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Semi-automated manual outreach workflow (safe mode: no bulk auto-send)."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    queue_parser = sub.add_parser("queue", help="Queue draft prospects as ready_to_send.")
    queue_parser.add_argument("campaign_id")
    queue_parser.add_argument("--limit", type=int, default=DEFAULT_DAILY_LIMIT)

    approvals_parser = sub.add_parser("approvals", help="Show approval list with send/skip actions.")
    approvals_parser.add_argument("campaign_id")
    approvals_parser.add_argument("--limit", type=int, default=20)

    send_parser = sub.add_parser("send-now", help="Approve and log a manual send for one prospect.")
    send_parser.add_argument("prospect_id")
    send_parser.add_argument("--subject", default="")
    send_parser.add_argument("--body", default="")

    skip_parser = sub.add_parser("skip", help="Skip one ready prospect.")
    skip_parser.add_argument("prospect_id")
    skip_parser.add_argument("--reason", required=True)

    reply_parser = sub.add_parser("record-reply", help="Record a reply event (and optional positive/booked).")
    reply_parser.add_argument("prospect_id")
    reply_parser.add_argument("--positive", action="store_true")
    reply_parser.add_argument("--booked", action="store_true")
    reply_parser.add_argument("--notes", default="")

    followup_parser = sub.add_parser("schedule-followup", help="Prepare a follow-up for later manual sending.")
    followup_parser.add_argument("prospect_id")
    followup_parser.add_argument("--step", type=int, default=1)
    followup_parser.add_argument("--days", type=int, default=2)
    followup_parser.add_argument("--scheduled-for", default="")
    followup_parser.add_argument("--subject", default="")
    followup_parser.add_argument("--body", default="")
    followup_parser.add_argument("--notes", default="")

    report_parser = sub.add_parser("daily-summary", help="Print daily summary report.")
    report_parser.add_argument("campaign_id")
    report_parser.add_argument("--day", default="")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        fail("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.")

    headers_read = build_headers(service_key)
    headers_write = build_headers(service_key, include_representation=True)

    try:
        if args.command == "queue":
            queue_daily(args, supabase_url, headers_read, headers_write)
        elif args.command == "approvals":
            approvals(args, supabase_url, headers_read)
        elif args.command == "send-now":
            send_now(args, supabase_url, headers_read, headers_write)
        elif args.command == "skip":
            skip_prospect(args, supabase_url, headers_read, headers_write)
        elif args.command == "record-reply":
            record_reply(args, supabase_url, headers_read, headers_write)
        elif args.command == "schedule-followup":
            schedule_followup(args, supabase_url, headers_read, headers_write)
        elif args.command == "daily-summary":
            summary(args, supabase_url, headers_read)
        else:
            parser.print_help()
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8")
        fail(f"Supabase error: {body}")


if __name__ == "__main__":
    main()

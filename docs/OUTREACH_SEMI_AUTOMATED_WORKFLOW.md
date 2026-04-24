# Semi-Automated Outreach Workflow (Safe / Deliverability-First)

This extends the manual outreach MVP into a queue-and-approval workflow while keeping sends fully manual.

> Safety rule: **no bulk auto-send is performed**. Every outreach message still requires explicit human action.

## What this adds

- Daily outreach queue (`draft` -> `ready_to_send`) with configurable daily volume (default: 8).
- Manual approval view with one-command actions:
  - `send-now` (records send + message content used)
  - `skip` (records skip reason)
- Activity logging in `public.outreach_activity_log`.
- Follow-up scheduler in `public.outreach_followups` (prepared only, not auto-sent).
- Daily summary report for:
  - emails sent
  - replies received
  - positive replies
  - booked calls

## 1) Required environment

```bash
export SUPABASE_URL=https://YOUR_PROJECT.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

## 2) Apply schema changes

Run latest `supabase/schema.sql` in your Supabase SQL editor.

## 3) Queue today’s outreach

Default (8 prospects):

```bash
python3 scripts/outreach_daily_workflow.py queue CAMPAIGN_ID
```

Custom daily limit (recommended 5–10):

```bash
python3 scripts/outreach_daily_workflow.py queue CAMPAIGN_ID --limit 6
```

## 4) Review manual approvals

```bash
python3 scripts/outreach_daily_workflow.py approvals CAMPAIGN_ID --limit 20
```

This prints each `ready_to_send` prospect with rendered subject/body and direct action commands.

## 5) Approve one message at a time

### Send Now (manual send approval)

```bash
python3 scripts/outreach_daily_workflow.py send-now PROSPECT_ID
```

Then send the message manually from `info@auroraedgeghq.com` in your email client.

### Skip

```bash
python3 scripts/outreach_daily_workflow.py skip PROSPECT_ID --reason "Low fit for this wave"
```

## 6) Log replies and outcomes

Reply received:

```bash
python3 scripts/outreach_daily_workflow.py record-reply PROSPECT_ID --notes "Asked for details"
```

Positive reply:

```bash
python3 scripts/outreach_daily_workflow.py record-reply PROSPECT_ID --positive --notes "Interested in audit"
```

Booked call:

```bash
python3 scripts/outreach_daily_workflow.py record-reply PROSPECT_ID --booked --notes "Booked for Tue 2pm CT"
```

## 7) Schedule follow-ups (prepared only)

Schedule follow-up in 2 days (default):

```bash
python3 scripts/outreach_daily_workflow.py schedule-followup PROSPECT_ID --step 1
```

Schedule for exact timestamp:

```bash
python3 scripts/outreach_daily_workflow.py schedule-followup PROSPECT_ID --step 2 --scheduled-for 2026-04-27T15:00:00Z
```

## 8) Generate daily summary report

Today (UTC):

```bash
python3 scripts/outreach_daily_workflow.py daily-summary CAMPAIGN_ID
```

Specific day:

```bash
python3 scripts/outreach_daily_workflow.py daily-summary CAMPAIGN_ID --day 2026-04-24
```

## Daily operating example (Christopher)

1. Queue 6 prospects for the day.
2. Open approval list and process one-by-one.
3. For each approved outreach item:
   - Run `send-now`.
   - Copy rendered message into Gmail and send manually from `info@auroraedgeghq.com`.
4. Skip poor-fit records with a reason.
5. Record replies throughout the day (`record-reply`).
6. Schedule next follow-ups (`schedule-followup`) without auto-sending.
7. End of day: run `daily-summary` and paste output in internal notes.

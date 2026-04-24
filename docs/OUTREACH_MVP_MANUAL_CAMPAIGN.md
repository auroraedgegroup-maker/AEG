# Manual Outreach MVP Campaign (Safe Mode)

This workflow is intentionally manual-first. It tracks progress in Supabase but does **not** auto-send bulk email or SMS.

Primary sender for this campaign:
- `info@auroraedgeghq.com`

## 1) Prepare environment

```bash
export SUPABASE_URL=https://YOUR_PROJECT.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

## 2) Create a campaign record (one time)

Create a campaign in Supabase SQL editor:

```sql
insert into public.outreach_campaigns (name, channel, sender_email, description, status)
values (
  'Viktor HVAC Top 10 - Wave 1',
  'mixed',
  'info@auroraedgeghq.com',
  'Manual-first MVP outreach for HVAC Top 10 list',
  'active'
)
returning id;
```

Save the returned `id` as `CAMPAIGN_ID`.

## 3) Add reusable template copy (email + SMS)

```sql
insert into public.outreach_email_templates (campaign_id, name, subject, body)
values (
  'CAMPAIGN_ID',
  'HVAC Initial Touch',
  'Quick idea for {{business_name}}',
  'Hi {{name}},\n\nI noticed {{business_name}} could likely recover missed calls and stale estimates with a simple follow-up workflow.\n\nIf useful, I can send a 3-point breakdown specific to your team.\n\n- Christopher\nAurora Edge Group'
);

insert into public.outreach_sms_templates (campaign_id, name, body)
values (
  'CAMPAIGN_ID',
  'HVAC Initial SMS',
  'Hi {{name}} - Christopher with Aurora Edge Group. Want a quick 3-point HVAC follow-up audit for {{business_name}}?'
);
```

## 4) Import prospects from Excel/CSV export

1. Export CSV from Excel.
2. Map columns to `templates/campaign-prospects-template.csv`.
3. Run import:

```bash
python3 scripts/import_campaign_prospects.py CAMPAIGN_ID templates/campaign-prospects-template.csv
```

## 5) Execute manually from `info@auroraedgeghq.com`

1. Open the active email template in Supabase.
2. Copy/personalize one prospect at a time.
3. Send from `info@auroraedgeghq.com` manually (Gmail/SMTP client).
4. Immediately mark each record as `sent` with notes:

```bash
python3 scripts/update_campaign_prospect_status.py PROSPECT_ID sent "Sent manually from info@auroraedgeghq.com"
```

## 6) Update outcomes as replies arrive

```bash
python3 scripts/update_campaign_prospect_status.py PROSPECT_ID replied "Replied asking for details"
python3 scripts/update_campaign_prospect_status.py PROSPECT_ID booked "Booked call for Tuesday 2:00 PM CT"
python3 scripts/update_campaign_prospect_status.py PROSPECT_ID won "Closed $1,500 setup"
```

Status transitions are manual by design. Timestamp fields are written automatically by the script:
- `sent_at` when status moves to `sent` (or later)
- `replied_at` when status moves to `replied` (or later)
- `booked_call_at` when status moves to `booked` (or `won`)

## 7) Safety boundaries

- No bulk send automation is enabled in this workflow.
- No public homepage UX was changed.
- Every action is explicit and reversible through Supabase records.

# Operate

## Daily

1. Add fresh prospects into `templates/leads-template.csv`.
2. Import them:

```bash
export SUPABASE_URL=https://YOUR_PROJECT.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
python3 scripts/import_leads.py templates/leads-template.csv
```

3. Trigger `run-outreach`.
4. Answer paid client replies and install upsells.

## Manual outreach MVP (HVAC Top 10)

Use `docs/OUTREACH_MVP_MANUAL_CAMPAIGN.md` for the safe manual campaign workflow:

- campaign table + templates
- CSV prospect import
- manual status tracking (`sent`, `replied`, `booked`, `won`)
- no bulk auto-send

## ChatGPT knowledge

1. Export your ChatGPT conversations.
2. Run `python3 scripts/import_chatgpt_export.py /path/to/conversations.json`.
3. New delivery packs will pull the newest imported ChatGPT notes into the AI context.

## Money flow

1. Site visitors submit the free audit form.
2. Warm leads buy a paid audit or setup package through Stripe.
3. Paid clients complete intake.
4. `generate-delivery` creates the fulfillment pack automatically.
5. Upsell implementation, monthly maintenance, or retainer support after delivery.

## Fastest offer stack

- Front-end offer: `AI Follow-Up Audit` at `$297`
- Upsell 1: `Missed Call Text-Back Setup` at `$750`
- Upsell 2: `Lead Reactivation Sprint` at `$1,500`
- Optional recurring retainer: monthly CRM + automation maintenance

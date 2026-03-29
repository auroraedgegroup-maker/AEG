# Aurora Edge Group: ChatGPT Handoff

## What this project is

Aurora Edge Group is a zero-to-low-cost AI income system for selling automation services to local businesses.

Main goals:
- capture leads
- sell low-ticket audits and setup offers
- automate follow-up and fulfillment
- prepare outbound outreach once SES production access is approved

## What is already live

### AWS

- account region: `us-east-1`
- public website:
  `http://aurora-edge-group-034817877153-us-east-1-site.s3-website-us-east-1.amazonaws.com`
- AWS lead intake endpoint:
  `https://huu5i7tm6e.execute-api.us-east-1.amazonaws.com/lead`
- AWS knowledge bucket:
  `aurora-edge-group-034817877153-us-east-1-knowledge`
- AWS lead table:
  `aurora-edge-group-leads`
- AWS knowledge index table:
  `aurora-edge-group-knowledge-index`

### SES

- verified sender:
  `c.rojasalvarez12@outlook.com`
- production access:
  `DENIED`
- case id:
  `177481622900747`
- reconsideration draft:
  `aws/exports/ses-case-177481622900747-reconsideration.txt`

## What the site does

- public landing page for local business AI automation offers
- AWS-backed lead capture form
- trust/contact/privacy pages for reviewer and buyer confidence
- static deployment path for S3 or Netlify

## What is prepared but not fully live

- Stripe + Supabase checkout and intake flow
- AI-generated delivery packs
- SES outreach sender scripts
- first-wave roofing outreach campaign preview

## Best next actions

1. Review and reply to the SES case with the reconsideration text
2. Replace sample outreach CSV rows with real prospects
3. Configure live Stripe and Supabase values in `site/config.js`
4. Deploy the site on a cleaner public URL or custom domain when budget allows

## Important files

- `site/index.html`
- `site/contact.html`
- `site/privacy.html`
- `site/app.js`
- `site/config.js`
- `scripts/deploy_public_site.sh`
- `scripts/deploy_aws_foundation.sh`
- `scripts/deploy_aws_lead_intake.sh`
- `scripts/setup_ses_email_identity.sh`
- `scripts/request_ses_production_access.sh`
- `scripts/send_business_outreach.py`
- `campaigns/first-wave/roofing-followup-audit.json`
- `docs/AWS.md`
- `docs/EMAIL.md`
- `docs/OUTREACH.md`

## Suggested prompt to paste into ChatGPT

You are helping continue the Aurora Edge Group project.

Read `CHATGPT_HANDOFF.md` first.

Priorities:
1. Keep the AWS lead capture path intact.
2. Do not assume SES production access is approved.
3. Treat outreach as preview-only until SES approval is confirmed.
4. Help improve the public site, lead conversion, and operational readiness.
5. Prefer concrete edits, commands, and deployable outputs over theory.

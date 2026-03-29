# Email

## Goal

Send real outreach to businesses through AWS SES from your own domain instead of a personal mailbox.

## Zero-dollar start with Outlook

If you are starting without a domain, you can begin by verifying your Outlook address as the SES sender identity:

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
source scripts/use_tools.sh
EMAIL_ADDRESS=c.rojasalvarez12@outlook.com bash scripts/setup_ses_email_identity.sh
```

Then click the SES verification email in your Outlook inbox.

Important:
- This is enough to set the sender up.
- It is not enough to email arbitrary businesses while SES production access is still disabled.
- For real outbound prospecting, we still need a public website URL and SES production access approval.

## 1. Start SES domain verification

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
source scripts/use_tools.sh
DOMAIN=yourdomain.com bash scripts/setup_ses_domain.sh
```

This creates:
- `aws/exports/ses-identity-yourdomain.com.json`
- `aws/exports/ses-dns-yourdomain.com.json`
- `aws/exports/ses-route53-yourdomain.com.json`
- `aws/exports/ses-dns-yourdomain.com.txt`

If your DNS is in Route 53, pass `HOSTED_ZONE_ID=...` and the script can apply the records automatically.

## 2. Add the DNS records

If DNS is outside Route 53, copy the records from:

`aws/exports/ses-dns-yourdomain.com.txt`

Then wait for verification and check:

```bash
source scripts/use_tools.sh
aws sesv2 get-email-identity --email-identity yourdomain.com --region us-east-1
```

## 3. Request SES production access

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
source scripts/use_tools.sh
WEBSITE_URL=https://yourdomain.com bash scripts/request_ses_production_access.sh
```

## 4. Send outreach

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
source scripts/use_tools.sh
SITE_URL=http://aurora-edge-group-034817877153-us-east-1-site.s3-website-us-east-1.amazonaws.com MAX_SENDS=10 python3 scripts/send_business_outreach.py templates/outreach-first-wave.csv c.rojasalvarez12@outlook.com
```

For the prepared first wave, use:

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
source scripts/use_tools.sh
SITE_URL=http://aurora-edge-group-034817877153-us-east-1-site.s3-website-us-east-1.amazonaws.com \
CAMPAIGN_FILE=campaigns/first-wave/roofing-followup-audit.json \
PREVIEW_ONLY=1 \
MAX_SENDS=10 \
python3 scripts/send_business_outreach.py templates/outreach-first-wave.csv c.rojasalvarez12@outlook.com
```

## How it makes money

- Verified domain sender improves deliverability and trust
- SES production access lets you email real prospects directly
- The outreach script turns lead lists into live pipeline with almost no daily manual work

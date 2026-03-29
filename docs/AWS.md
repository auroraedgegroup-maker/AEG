# AWS

## What this sets up

- Private S3 bucket for knowledge and export storage
- DynamoDB index for imported ChatGPT conversations and future empire docs
- Monthly budget alert to cap surprise spend in the new account
- Dedicated IAM admin profile for automation so the CLI stops using root
- AWS-hosted lead intake endpoint backed by API Gateway, Lambda, and DynamoDB

## Deploy the foundation

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
source scripts/use_tools.sh
BILLING_EMAIL=c.rojasalvarez12@outlook.com bash scripts/deploy_aws_foundation.sh
```

## Move automation off root

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
source scripts/use_tools.sh
bash scripts/bootstrap_aws_iam_admin.sh
```

## Import ChatGPT export into AWS

After the stack deploys, get the outputs:

```bash
source scripts/use_tools.sh
aws cloudformation describe-stacks \
  --stack-name aurora-edge-foundation \
  --region us-east-1 \
  --query 'Stacks[0].Outputs' \
  --output table
```

Then import:

```bash
source scripts/use_tools.sh
python3 scripts/import_chatgpt_export_to_aws.py /path/to/conversations.json BUCKET_NAME TABLE_NAME
```

## Deploy the lead intake endpoint

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
source scripts/use_tools.sh
bash scripts/deploy_aws_lead_intake.sh
```

To set your real site origin during deploy:

```bash
source scripts/use_tools.sh
SITE_ORIGIN=https://YOUR_NETLIFY_SITE.netlify.app bash scripts/deploy_aws_lead_intake.sh
```

Get the live endpoint:

```bash
source scripts/use_tools.sh
aws cloudformation describe-stacks \
  --stack-name aurora-edge-lead-intake \
  --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='LeadIntakeApiUrl'].OutputValue" \
  --output text
```

## Wire the site to the live AWS lead intake

`site/config.js` is already pointed at the current live API:

```js
window.AEG_CONFIG = {
  brandName: "Aurora Edge Group",
  leadCaptureUrl: "https://huu5i7tm6e.execute-api.us-east-1.amazonaws.com/lead",
  functionsBaseUrl: "https://YOUR_PROJECT.supabase.co/functions/v1",
  publicSiteUrl: "https://YOUR_NETLIFY_SITE.netlify.app"
};
```

For local browser testing, serve the site from `http://localhost:8080`:

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group/site
python3 -m http.server 8080
```

## How this makes money

- Store reusable sales scripts, offer docs, and ChatGPT conversations in AWS
- Reuse that knowledge in future outreach, delivery packs, and automation builds
- Keep storage cheap with S3 and pay-on-demand indexing with DynamoDB

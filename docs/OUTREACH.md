# Outreach

## First campaign

Campaign file:

`campaigns/first-wave/roofing-followup-audit.json`

Prospect CSV:

`templates/outreach-first-wave.csv`

## Preview the first wave

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
source scripts/use_tools.sh
SITE_URL=http://aurora-edge-group-034817877153-us-east-1-site.s3-website-us-east-1.amazonaws.com \
CAMPAIGN_FILE=campaigns/first-wave/roofing-followup-audit.json \
PREVIEW_ONLY=1 \
MAX_SENDS=10 \
python3 scripts/send_business_outreach.py templates/outreach-first-wave.csv c.rojasalvarez12@outlook.com
```

This writes a preview into `outbox/`.

## Send when SES production is approved

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
source scripts/use_tools.sh
SITE_URL=http://aurora-edge-group-034817877153-us-east-1-site.s3-website-us-east-1.amazonaws.com \
CAMPAIGN_FILE=campaigns/first-wave/roofing-followup-audit.json \
MAX_SENDS=10 \
python3 scripts/send_business_outreach.py templates/outreach-first-wave.csv c.rojasalvarez12@outlook.com
```

## What to edit before sending

- Replace the example businesses in `templates/outreach-first-wave.csv` with real prospects
- Keep only one niche per wave
- Keep the first batch small

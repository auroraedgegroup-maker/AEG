# Deploy

## Static site

### Netlify

1. Create a new Netlify site.
2. Point the publish directory to `site/`.
3. Upload the folder or connect the repo.
4. Confirm the live URL.
5. Set `PUBLIC_SITE_URL` and `CORS_ORIGIN` to that URL in Supabase secrets.

### AWS S3 public site

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
source scripts/use_tools.sh
bash scripts/deploy_public_site.sh
```

## Local preview

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group/site
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

Lead capture is already wired to the live AWS endpoint in `site/config.js`.

## Daily outreach trigger

Use Supabase scheduled functions or any cron service that can hit:

```text
POST https://YOUR_PROJECT.supabase.co/functions/v1/run-outreach
Authorization: Bearer YOUR_RUN_OUTREACH_TOKEN
```

Run it once per day.

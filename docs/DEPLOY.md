# Deploy

## Static site

### Netlify

Recommended GitHub deploy:

1. In Netlify, choose `Add new site` -> `Import an existing project`.
2. Connect GitHub and select `auroraedgegroup-maker/AEG`.
3. Use branch `main`.
4. Leave the base directory empty.
5. Leave the build command empty.
6. Publish directory is already defined in [netlify.toml](/Users/christopherrojas/Documents/New%20project/aurora-edge-group/netlify.toml) as `site`.
7. Confirm the live URL is `https://auroraedgeghq.netlify.app`.
8. In Supabase, set `PUBLIC_SITE_URL=https://auroraedgeghq.netlify.app`.
9. In Supabase, set `CORS_ORIGIN=https://auroraedgeghq.netlify.app`.

Current live site config should come from:
- [site/config.js](/Users/christopherrojas/Documents/New%20project/aurora-edge-group/site/config.js)

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

Lead capture, checkout, and intake should all point at Supabase functions in `site/config.js`.

## Daily outreach trigger

Use Supabase scheduled functions or any cron service that can hit:

```text
POST https://YOUR_PROJECT.supabase.co/functions/v1/run-outreach
Authorization: Bearer YOUR_RUN_OUTREACH_TOKEN
```

Run it once per day.

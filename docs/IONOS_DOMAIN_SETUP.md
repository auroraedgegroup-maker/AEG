# IONOS Domain Setup

Domain:

```text
auroraedgeghq.com
```

Current status checked on 2026-03-30:
- `auroraedgeghq.com` resolves to IONOS parking
- `www.auroraedgeghq.com` is not configured yet
- HTTPS is not live on the custom domain yet

## Netlify records

Add these DNS records in IONOS so the domain points to the live Netlify site:

| Type | Host | Value | Notes |
| --- | --- | --- | --- |
| A | `@` | `75.2.60.5` | Apex domain to Netlify load balancer |
| CNAME | `www` | `auroraedgeghq.netlify.app` | `www` alias to the current Netlify site |

After those records are added:
1. In Netlify, open the site.
2. Go to `Domain management`.
3. Add `auroraedgeghq.com` as the primary domain.
4. Add `www.auroraedgeghq.com` as a domain alias if Netlify does not add it automatically.

## Resend records

These are the IONOS DNS records needed for Resend on the root domain.

| Type | Host | Value | Notes |
| --- | --- | --- | --- |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | Priority `10` |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | SPF for Resend |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDEvHgDZel6jwvlZz4rHlHCwDXZer9bL/YCU8YTxmurKbAtto92/mLYrcSHyb5JgztbcFAgrFWfpzkWrhocqmSKxI9Xgj2YpCEfOWSjlc8AA5iE8byKBJAh7m20rcFsStykOQI3GP3YnBufweEdNT+V0dfiF/FaCG5ZxJ9GzvzjrQIDAQAB` | DKIM value from Resend |

IONOS note:
- paste only the host part in IONOS, not the full domain
- use `send`, not `send.auroraedgeghq.com`
- use `resend._domainkey`, not `resend._domainkey.auroraedgeghq.com`

## What I will switch after DNS is live

Once Netlify and Resend both verify:
- `PUBLIC_SITE_URL=https://auroraedgeghq.com`
- `CORS_ORIGIN=https://auroraedgeghq.com`
- `MAIL_FROM=Aurora Edge Group <hello@auroraedgeghq.com>`

Admin notifications can still go to:

```text
auroraedgegroup@gmail.com
```

# Setup

## 1. Create the backend

1. Create a free Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.

## 0. Install local tools

If this laptop does not have Deno or the Supabase CLI yet:

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
bash scripts/install_tools.sh
bash scripts/install_aws_cli.sh
source scripts/use_tools.sh
```

## 2. Set the secrets

Add every variable from `.env.example` into Supabase Edge Functions secrets:

```bash
supabase secrets set \
  SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY \
  PUBLIC_SITE_URL=https://YOUR_NETLIFY_SITE.netlify.app \
  CORS_ORIGIN=https://YOUR_NETLIFY_SITE.netlify.app \
  ADMIN_EMAIL=you@example.com \
  EMAIL_FROM='Aurora Edge Group <noreply@yourdomain.com>' \
  RESEND_API_KEY=YOUR_RESEND_API_KEY \
  STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY \
  STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET \
  RUN_OUTREACH_TOKEN=SET_A_LONG_RANDOM_STRING
```

Optional:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

## 8. Optional ChatGPT knowledge import

If you export your ChatGPT history, you can import it into the backend and reuse it during delivery generation:

```bash
export SUPABASE_URL=https://YOUR_PROJECT.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
python3 scripts/import_chatgpt_export.py /path/to/conversations.json
```

## 3. Deploy the functions

```bash
supabase functions deploy lead-intake
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy intake-submit
supabase functions deploy generate-delivery
supabase functions deploy run-outreach
```

## 4. Connect Stripe webhook

Create a Stripe webhook endpoint pointing to:

```text
https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
```

Subscribe to:
- `checkout.session.completed`

## 5. Configure the site

Edit `site/config.js`:

```js
window.AEG_CONFIG = {
  brandName: "Aurora Edge Group",
  functionsBaseUrl: "https://YOUR_PROJECT.supabase.co/functions/v1",
  publicSiteUrl: "https://YOUR_NETLIFY_SITE.netlify.app"
};
```

## 6. Add email delivery

1. Create a free Resend account.
2. Verify a sending domain.
3. Add `RESEND_API_KEY` and `EMAIL_FROM`.

## 7. Add payments

1. Create a Stripe account.
2. Copy the live secret key into `STRIPE_SECRET_KEY`.
3. Use the buy buttons on the landing page to open checkout with inline Stripe pricing.

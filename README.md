# Aurora Edge Group

Deployable income system for selling AI automation packages to local businesses.

What is included:
- Static sales site with lead capture and Stripe checkout
- Supabase CRM schema for leads, orders, intake, deliverables, and activity logs
- Optional ChatGPT export ingestion into a reusable knowledge base
- AWS foundation stack for knowledge storage and low-cost account setup
- Edge Functions for lead intake, payments, intake processing, automated fulfillment, and outbound outreach
- SES domain sender and outreach scripts for real business email sending
- Prepared first-wave outreach campaign and preview flow
- CSV import script for local business lead lists
- Manual outreach MVP scripts for campaign prospect imports and status tracking
- Deployment and operating docs

Start here:
1. Run the SQL in `supabase/schema.sql`.
2. Set the secrets in `.env.example`.
3. Deploy the Supabase functions from `supabase/functions/`.
4. Update `site/config.js`.
5. Deploy `site/` to Netlify.

Core folders:
- `site/` public landing page and intake flow
- `supabase/` database schema and Edge Functions
- `scripts/` local helper scripts
- `templates/` CSV starter files
- `docs/` setup, deploy, and operating instructions

GitHub + ChatGPT:
- Use `docs/GITHUB_CHATGPT.md` to publish this repo to GitHub and connect that repo to ChatGPT.

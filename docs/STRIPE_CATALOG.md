# Stripe Catalog

Live Stripe account:
- Account ID: `acct_1SNNImLFjRc6jUeD`
- Display name: `Aurora Edge Group`

Products and prices:

| Offer | Product ID | Price ID | Amount |
| --- | --- | --- | --- |
| AI Follow-Up Audit | `prod_UEzmqG5Ezovjdp` | `price_1TGVmpLFjRc6jUeDI1lSpa1w` | `$297.00` |
| Missed Call Text-Back Setup | `prod_UEzmFdA8v2tiQ9` | `price_1TGVmqLFjRc6jUeDv3tEJZMH` | `$750.00` |
| Lead Reactivation Sprint | `prod_UEzmMPyVrJQNPj` | `price_1TGVmrLFjRc6jUeDkQA1yPYD` | `$1,500.00` |

Required webhook endpoint:

```text
https://tumruwrspoyeynxoxbpt.supabase.co/functions/v1/stripe-webhook
```

Subscribe to:
- `checkout.session.completed`

Required remaining secrets:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `OPENAI_API_KEY` (optional because delivery already falls back to a template)

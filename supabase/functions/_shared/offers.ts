export type OfferId =
  | "followup-audit"
  | "missed-call-system"
  | "lead-reactivation";

export type OfferDefinition = {
  id: OfferId;
  name: string;
  amountCents: number;
  description: string;
  deliveryMode: string;
  stripePriceEnv: string;
};

export const offers: Record<OfferId, OfferDefinition> = {
  "followup-audit": {
    id: "followup-audit",
    name: "AI Follow-Up Audit",
    amountCents: 29700,
    description: "Custom funnel copy, email and SMS follow-up sequence, and implementation roadmap.",
    deliveryMode: "audit",
    stripePriceEnv: "STRIPE_PRICE_FOLLOWUP_AUDIT"
  },
  "missed-call-system": {
    id: "missed-call-system",
    name: "Missed Call Text-Back Setup",
    amountCents: 75000,
    description: "Instant callback SMS workflow, routing prompts, and sales follow-up scripting.",
    deliveryMode: "implementation",
    stripePriceEnv: "STRIPE_PRICE_MISSED_CALL_SYSTEM"
  },
  "lead-reactivation": {
    id: "lead-reactivation",
    name: "Lead Reactivation Sprint",
    amountCents: 150000,
    description: "Three-touch revive campaign with email and SMS copy for stale leads.",
    deliveryMode: "implementation",
    stripePriceEnv: "STRIPE_PRICE_LEAD_REACTIVATION"
  }
};

export function getOffer(offerId: string) {
  const offer = offers[offerId as OfferId];
  if (!offer) {
    throw new Error(`Unknown offer id: ${offerId}`);
  }
  return offer;
}

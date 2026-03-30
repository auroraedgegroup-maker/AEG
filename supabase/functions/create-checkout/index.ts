import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createServiceClient } from "../_shared/supabase.ts";
import { getOffer } from "../_shared/offers.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL");

    if (!stripeKey || !publicSiteUrl) {
      throw new Error("Missing STRIPE_SECRET_KEY or PUBLIC_SITE_URL");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2026-02-25.clover"
    });

    const body = await request.json();
    const name = String(body.name || "").trim();
    const businessName = String(body.businessName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const offer = getOffer(String(body.offerId || ""));

    if (!name || !businessName || !email) {
      throw new Error("name, businessName, and email are required");
    }

    const supabase = createServiceClient();

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .upsert(
        {
          name,
          business_name: businessName,
          email,
          phone: body.phone || null,
          website: body.website || null,
          city: body.city || null,
          niche: body.niche || null,
          pain_point: body.painPoint || null,
          source: body.source || "website",
          offer_interest: offer.name
        },
        { onConflict: "email_normalized" }
      )
      .select("id")
      .single();

    if (leadError) {
      throw leadError;
    }

    const orderId = crypto.randomUUID();
    const configuredPriceId = Deno.env.get(offer.stripePriceEnv);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${publicSiteUrl}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicSiteUrl}/?checkout=cancelled`,
      customer_email: email,
      metadata: {
        order_id: orderId,
        lead_id: lead.id,
        offer_id: offer.id
      },
      line_items: configuredPriceId
        ? [
            {
              quantity: 1,
              price: configuredPriceId
            }
          ]
        : [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: offer.amountCents,
                product_data: {
                  name: offer.name,
                  description: offer.description
                }
              }
            }
          ]
    });

    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      lead_id: lead.id,
      stripe_checkout_session_id: session.id,
      offer_id: offer.id,
      offer_name: offer.name,
      amount_cents: offer.amountCents,
      status: "pending",
      client_name: name,
      client_email: email,
      success_url: `${publicSiteUrl}/thank-you.html`,
      cancel_url: `${publicSiteUrl}/`
    });

    if (orderError) {
      throw orderError;
    }

    await supabase.from("lead_activity").insert({
      lead_id: lead.id,
      order_id: orderId,
      event_type: "checkout_created",
      channel: "web",
      subject: offer.name,
      message: `Checkout created for ${offer.name}`,
      metadata: {
        stripe_checkout_session_id: session.id
      }
    });

    return jsonResponse({
      ok: true,
      checkoutUrl: session.url
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 400);
  }
});

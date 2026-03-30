import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createServiceClient } from "../_shared/supabase.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { canSendExternalEmail, isEmailConfigured, sendEmail } from "../_shared/resend.ts";

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL");

    if (!stripeKey || !webhookSecret || !publicSiteUrl) {
      throw new Error("Missing Stripe webhook configuration");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2026-02-25.clover"
    });

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("Missing stripe-signature header");
    }

    const body = await request.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    const supabase = createServiceClient();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          stripe_payment_intent_id: String(session.payment_intent || ""),
          delivery_status: "queued",
          delivery_error: null
        })
        .eq("stripe_checkout_session_id", session.id)
        .select("id, lead_id, client_email, client_name, offer_name")
        .single();

      if (orderError) {
        throw orderError;
      }

      await supabase.from("leads").update({ lead_status: "won" }).eq("id", order.lead_id);

      await supabase.from("deliverables").upsert({
        order_id: order.id,
        status: "queued"
      });

      await supabase.from("lead_activity").insert({
        lead_id: order.lead_id,
        order_id: order.id,
        event_type: "payment_received",
        channel: "stripe",
        subject: order.offer_name,
        message: "Stripe checkout completed",
        metadata: {
          stripe_checkout_session_id: session.id
        }
      });

      if (isEmailConfigured()) {
        if (canSendExternalEmail()) {
          await sendEmail({
            to: order.client_email,
            subject: `${order.offer_name}: complete your intake`,
            text: `Hi ${order.client_name},\n\nPayment is in. Complete your intake here so Aurora Edge Group can generate your delivery pack:\n${publicSiteUrl}/thank-you.html?session_id=${session.id}\n`
          });
        } else {
          await supabase.from("lead_activity").insert({
            lead_id: order.lead_id,
            order_id: order.id,
            event_type: "payment_customer_email_skipped",
            channel: "email",
            subject: order.offer_name,
            message:
              "Customer intake email was skipped because the sender is using Resend's onboarding domain.",
            metadata: {
              stripe_checkout_session_id: session.id
            }
          });
        }

        const adminEmail = Deno.env.get("ADMIN_EMAIL");
        if (adminEmail) {
          try {
            await sendEmail({
              to: adminEmail,
              subject: `Paid order: ${order.offer_name}`,
              text: `Client: ${order.client_name}\nEmail: ${order.client_email}\nIntake URL: ${publicSiteUrl}/thank-you.html?session_id=${session.id}`
            });
          } catch (adminError) {
            const adminMessage =
              adminError instanceof Error ? adminError.message : String(adminError);

            await supabase.from("lead_activity").insert({
              lead_id: order.lead_id,
              order_id: order.id,
              event_type: "payment_admin_email_failed",
              channel: "email",
              subject: order.offer_name,
              message: adminMessage,
              metadata: {
                stripe_checkout_session_id: session.id
              }
            });
          }
        }
      } else {
        await supabase.from("lead_activity").insert({
          lead_id: order.lead_id,
          order_id: order.id,
          event_type: "payment_email_skipped",
          channel: "email",
          subject: order.offer_name,
          message: "Payment emails were skipped because Resend is not configured.",
          metadata: {
            stripe_checkout_session_id: session.id
          }
        });
      }
    }

    return jsonResponse({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 400);
  }
});

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { getOffer } from "../_shared/offers.ts";
import { generateDeliveryPackage } from "../_shared/ai.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { sendEmail } from "../_shared/resend.ts";

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  try {
    const body = await request.json();
    const orderId = String(body.orderId || "").trim();

    if (!orderId) {
      throw new Error("orderId is required");
    }

    const supabase = createServiceClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, lead_id, offer_id, offer_name, client_email, client_name")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    const [{ data: lead, error: leadError }, { data: intake, error: intakeError }] =
      await Promise.all([
        supabase
          .from("leads")
          .select("name, business_name, niche, pain_point, city")
          .eq("id", order.lead_id)
          .single(),
        supabase
          .from("intake_responses")
          .select("website, primary_offer, service_area, crm, sales_follow_up, goals, notes")
          .eq("order_id", order.id)
          .single()
      ]);

    if (leadError || !lead) {
      throw new Error("Lead not found for order");
    }

    if (intakeError || !intake) {
      throw new Error("Intake not found for order");
    }

    const { data: knowledgeDocs } = await supabase
      .from("knowledge_documents")
      .select("title, content")
      .eq("source", "chatgpt")
      .order("created_at", { ascending: false })
      .limit(5);

    const knowledgeContext = (knowledgeDocs || [])
      .map((doc) => `## ${doc.title}\n${String(doc.content).slice(0, 2000)}`)
      .join("\n\n");

    const offer = getOffer(order.offer_id);
    const delivery = await generateDeliveryPackage({
      offer,
      lead,
      intake,
      knowledgeContext
    });

    const generatedAt = new Date().toISOString();
    await supabase.from("deliverables").upsert({
      order_id: order.id,
      status: "queued",
      generated_at: generatedAt,
      delivery_markdown: delivery.markdown,
      delivery_json: delivery.json,
      last_error: null
    });

    try {
      const emailResult = await sendEmail({
        to: order.client_email,
        subject: `${order.offer_name} delivery for ${lead.business_name}`,
        text: `Hi ${order.client_name},\n\nYour delivery pack is ready.\n\n${delivery.markdown}`
      });

      const deliveredAt = new Date().toISOString();
      await supabase.from("deliverables").upsert({
        order_id: order.id,
        status: "ready",
        generated_at: generatedAt,
        delivered_at: deliveredAt,
        delivery_markdown: delivery.markdown,
        delivery_json: delivery.json,
        last_error: null
      });

      await supabase
        .from("orders")
        .update({
          status: "fulfilled",
          delivery_status: "sent",
          delivery_error: null,
          delivery_provider_id: String(emailResult?.id || ""),
          fulfilled_at: deliveredAt
        })
        .eq("id", order.id);

      await supabase.from("lead_activity").insert({
        lead_id: order.lead_id,
        order_id: order.id,
        event_type: "delivery_generated",
        channel: "automation",
        subject: order.offer_name,
        message: delivery.markdown
      });

      const adminEmail = Deno.env.get("ADMIN_EMAIL");
      if (adminEmail) {
        try {
          await sendEmail({
            to: adminEmail,
            subject: `Delivery generated: ${order.offer_name}`,
            text: `Client: ${order.client_name}\n\n${delivery.markdown}`
          });
        } catch (adminError) {
          const adminMessage =
            adminError instanceof Error ? adminError.message : String(adminError);

          await supabase.from("lead_activity").insert({
            lead_id: order.lead_id,
            order_id: order.id,
            event_type: "delivery_admin_notification_failed",
            channel: "automation",
            subject: order.offer_name,
            message: adminMessage
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await supabase.from("deliverables").upsert({
        order_id: order.id,
        status: "failed",
        generated_at: generatedAt,
        delivery_markdown: delivery.markdown,
        delivery_json: delivery.json,
        last_error: message
      });

      await supabase
        .from("orders")
        .update({
          delivery_status: "failed",
          delivery_error: message
        })
        .eq("id", order.id);

      await supabase.from("lead_activity").insert({
        lead_id: order.lead_id,
        order_id: order.id,
        event_type: "delivery_failed",
        channel: "automation",
        subject: order.offer_name,
        message
      });

      throw error;
    }

    return jsonResponse({
      ok: true,
      orderId: order.id
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 400);
  }
});

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  try {
    const body = await request.json();
    const intakeToken = String(body.intakeToken || "").trim();

    if (!intakeToken) {
      throw new Error("intakeToken is required");
    }

    const supabase = createServiceClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, lead_id, status")
      .eq("intake_token", intakeToken)
      .single();

    if (orderError || !order) {
      return jsonResponse({ error: "Order not found" }, 404);
    }

    if (!["paid", "fulfilled"].includes(order.status)) {
      return jsonResponse({ error: "Order not paid" }, 403);
    }

    const { error: intakeError } = await supabase.from("intake_responses").upsert({
      order_id: order.id,
      website: body.website || null,
      primary_offer: body.primaryOffer || null,
      service_area: body.serviceArea || null,
      crm: body.crm || null,
      sales_follow_up: body.salesFollowUp || null,
      goals: body.goals || null,
      notes: body.notes || null
    });

    if (intakeError) {
      throw intakeError;
    }

    await supabase.from("deliverables").upsert({
      order_id: order.id,
      status: "queued",
      last_error: null
    });

    await supabase
      .from("orders")
      .update({
        delivery_status: "queued",
        delivery_error: null
      })
      .eq("id", order.id);

    await supabase.from("lead_activity").insert({
      lead_id: order.lead_id,
      order_id: order.id,
      event_type: "intake_submitted",
      channel: "web",
      subject: "Client intake submitted",
      message: "Intake form saved"
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceKey) {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-delivery`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ orderId: order.id })
      }).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Delivery trigger failed: ${message}`);
      });

      if (!response.ok) {
        const text = await response.text();

        await supabase.from("deliverables").upsert({
          order_id: order.id,
          status: "failed",
          last_error: text
        });

        await supabase
          .from("orders")
          .update({
            delivery_status: "failed",
            delivery_error: text
          })
          .eq("id", order.id);

        return jsonResponse({ error: `Delivery trigger failed: ${text}` }, 500);
      }
    }

    return jsonResponse({ ok: true, orderId: order.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 400);
  }
});

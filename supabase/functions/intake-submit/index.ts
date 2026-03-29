import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  try {
    const body = await request.json();
    const sessionId = String(body.sessionId || "").trim();

    if (!sessionId) {
      throw new Error("sessionId is required");
    }

    const supabase = createServiceClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, lead_id, status")
      .eq("stripe_checkout_session_id", sessionId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
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
      status: "queued"
    });

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
      fetch(`${supabaseUrl}/functions/v1/generate-delivery`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ orderId: order.id })
      }).catch(() => null);
    }

    return jsonResponse({ ok: true, orderId: order.id });
  } catch (error) {
    return jsonResponse({ error: error.message }, 400);
  }
});

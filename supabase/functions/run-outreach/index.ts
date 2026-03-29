import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { buildOutreachMessage } from "../_shared/ai.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { sendEmail } from "../_shared/resend.ts";
import { sendSms } from "../_shared/twilio.ts";

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  try {
    const requiredToken = Deno.env.get("RUN_OUTREACH_TOKEN");
    const authHeader = request.headers.get("authorization") || "";
    const bearer = authHeader.replace("Bearer ", "");

    if (requiredToken && bearer !== requiredToken) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createServiceClient();
    const now = new Date().toISOString();
    const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL") || "";

    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, name, business_name, email, phone, niche, pain_point, city, offer_interest, outreach_step, channel_preference")
      .eq("outreach_status", "queued")
      .lte("next_action_at", now)
      .limit(25);

    if (error) {
      throw error;
    }

    const processed = [];

    for (const lead of leads || []) {
      const message = buildOutreachMessage({
        name: lead.name,
        businessName: lead.business_name,
        niche: lead.niche,
        painPoint: lead.pain_point,
        city: lead.city,
        offerInterest: lead.offer_interest,
        step: lead.outreach_step,
        siteUrl: publicSiteUrl
      });

      let channel = "email";
      if (lead.channel_preference === "sms" && lead.phone) {
        channel = "sms";
        await sendSms({
          to: lead.phone,
          body: message.body
        });
      } else {
        await sendEmail({
          to: lead.email,
          subject: message.subject,
          text: message.body
        });
      }

      const nextStep = lead.outreach_step + 1;
      const nextActionAt =
        nextStep >= 3
          ? null
          : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from("leads").update({
        outreach_step: nextStep,
        outreach_status: nextStep >= 3 ? "completed" : "queued",
        last_contacted_at: now,
        next_action_at: nextActionAt
      }).eq("id", lead.id);

      await supabase.from("lead_activity").insert({
        lead_id: lead.id,
        event_type: "outreach_sent",
        channel,
        subject: message.subject,
        message: message.body,
        metadata: {
          step: lead.outreach_step
        }
      });

      processed.push({
        leadId: lead.id,
        channel,
        step: nextStep
      });
    }

    return jsonResponse({
      ok: true,
      processed
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 400);
  }
});

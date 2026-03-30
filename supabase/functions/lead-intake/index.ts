import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { canSendExternalEmail, isEmailConfigured, sendEmail } from "../_shared/resend.ts";

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const businessName = String(body.businessName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    if (!name || !businessName || !email) {
      throw new Error("name, businessName, and email are required");
    }

    const supabase = createServiceClient();
    const payload = {
      name,
      business_name: businessName,
      email,
      phone: body.phone || null,
      website: body.website || null,
      niche: body.niche || null,
      pain_point: body.painPoint || null,
      source: body.source || "website",
      offer_interest: body.offerInterest || "AI Follow-Up Audit",
      outreach_status: "draft",
      channel_preference: "email"
    };

    const { data: inserted, error } = await supabase
      .from("leads")
      .upsert(payload, { onConflict: "email_normalized" })
      .select("id, name, business_name, email")
      .single();

    if (error) {
      throw error;
    }

    await supabase.from("lead_activity").insert({
      lead_id: inserted.id,
      event_type: "lead_captured",
      channel: "web",
      subject: "Inbound lead captured",
      message: JSON.stringify(payload)
    });

    if (isEmailConfigured()) {
      const adminEmail = Deno.env.get("ADMIN_EMAIL");
      if (adminEmail) {
        try {
          await sendEmail({
            to: adminEmail,
            subject: `New inbound lead: ${businessName}`,
            text: `Name: ${name}\nBusiness: ${businessName}\nEmail: ${email}\nPhone: ${body.phone || ""}\nNiche: ${body.niche || ""}\nPain point: ${body.painPoint || ""}`
          });
        } catch (adminError) {
          const adminMessage =
            adminError instanceof Error ? adminError.message : String(adminError);

          await supabase.from("lead_activity").insert({
            lead_id: inserted.id,
            event_type: "lead_admin_email_failed",
            channel: "email",
            subject: "Inbound admin notification failed",
            message: adminMessage
          });
        }
      }

      if (canSendExternalEmail()) {
        await sendEmail({
          to: email,
          subject: "Aurora Edge Group received your audit request",
          text: `Hi ${name},\n\nYour audit request is in. Aurora Edge Group will review ${businessName} and respond with the next step.\n\nIf you want the paid version immediately, the fastest path is the AI Follow-Up Audit on the site.\n`
        });
      } else {
        await supabase.from("lead_activity").insert({
          lead_id: inserted.id,
          event_type: "lead_customer_email_skipped",
          channel: "email",
          subject: "Customer email skipped",
          message:
            "Customer confirmation email was skipped because the sender is using Resend's onboarding domain."
        });
      }
    } else {
      await supabase.from("lead_activity").insert({
        lead_id: inserted.id,
        event_type: "lead_email_skipped",
        channel: "email",
        subject: "Lead captured without mail provider",
        message: "Lead emails were skipped because Resend is not configured."
      });
    }

    return jsonResponse({
      ok: true,
      leadId: inserted.id
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 400);
  }
});

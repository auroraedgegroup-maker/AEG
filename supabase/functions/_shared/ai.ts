type LeadRecord = {
  name: string;
  business_name: string;
  niche: string | null;
  pain_point: string | null;
  city: string | null;
};

type IntakeRecord = {
  website: string | null;
  primary_offer: string | null;
  service_area: string | null;
  crm: string | null;
  sales_follow_up: string | null;
  goals: string | null;
  notes: string | null;
};

type OfferRecord = {
  name: string;
  description: string;
  deliveryMode: string;
};

type DeliveryPayload = {
  executive_summary: string;
  quick_wins: string[];
  funnel: {
    headline: string;
    subheadline: string;
    cta: string;
    proof_points: string[];
  };
  email_sequence: string[];
  sms_sequence: string[];
  crm_pipeline: string[];
};

function fallbackPackage(
  offer: OfferRecord,
  lead: LeadRecord,
  intake: IntakeRecord
): DeliveryPayload {
  const audience = intake.primary_offer || lead.niche || "local service business buyers";
  const area = intake.service_area || lead.city || "your market";
  const painPoint = lead.pain_point || "manual follow-up causes leads to go cold";
  const goal = intake.goals || "book more qualified appointments in the next 30 days";

  return {
    executive_summary: `${lead.business_name} is buying ${offer.name}. The system should focus on ${goal}. The current gap is that ${painPoint}.`,
    quick_wins: [
      `Install an immediate response workflow for every missed call and form fill in ${area}.`,
      `Send a quote follow-up message within 5 minutes instead of waiting for manual outreach.`,
      `Tag every lead by source, service requested, and sales stage inside ${intake.crm || "the CRM"}.`
    ],
    funnel: {
      headline: `Turn more ${audience} inquiries into booked appointments in ${area}.`,
      subheadline: `Aurora Edge Group builds instant follow-up, quote recovery, and reactivation systems for ${lead.business_name}.`,
      cta: "Get the next available install slot",
      proof_points: [
        "Instant missed-call text back",
        "Three-touch quote follow-up",
        "Lead source tags and pipeline tracking"
      ]
    },
    email_sequence: [
      `Subject: Quick fix for lost ${audience} leads\n\nHi ${lead.name},\n\nI reviewed the follow-up gap around ${painPoint}. First fix: message every inquiry within 5 minutes and give them a direct booking CTA. I mapped the full workflow in your delivery pack.\n\nReply if you want the setup installed this week.`,
      `Subject: Your next 30-day revenue play\n\nThe fastest lift is to reactivate every lead that did not book after first contact. I included the funnel copy, follow-up timing, and CRM handoff stages to move that live fast.`,
      `Subject: Final handoff from Aurora Edge Group\n\nYour pack includes the landing page headline, CTA stack, email sequence, SMS copy, and CRM stages. If you want us to install it for you, reply with your preferred go-live date.`
    ],
    sms_sequence: [
      `Hi ${lead.name}, this is Aurora Edge Group. We mapped a fast fix for ${lead.business_name}'s follow-up leaks. Want the install summary here?`,
      `Quick reminder: the missed-call and quote follow-up workflow is the fastest route to ${goal}. Reply YES and we will send the next step.`,
      `Closing this out for now. If you want the automation package installed later, reply START and we will reopen your build.`
    ],
    crm_pipeline: [
      "New Lead -> auto-tag by source and service interest",
      "Contacted -> first response sent inside 5 minutes",
      "Quoted -> trigger 3-touch follow-up sequence",
      "Reactivation -> move old leads into a timed revive campaign",
      "Won -> collect payment and trigger onboarding intake"
    ]
  };
}

async function callOpenAI(prompt: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return compact JSON only. Keys: executive_summary, quick_wins, funnel, email_sequence, sms_sequence, crm_pipeline."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error: ${text}`);
  }

  const payload = await response.json();
  return payload.choices?.[0]?.message?.content ?? null;
}

export async function generateDeliveryPackage(args: {
  offer: OfferRecord;
  lead: LeadRecord;
  intake: IntakeRecord;
  knowledgeContext?: string;
}) {
  const fallback = fallbackPackage(args.offer, args.lead, args.intake);
  const prompt = `
Brand: Aurora Edge Group
Offer sold: ${args.offer.name}
Delivery mode: ${args.offer.deliveryMode}
Client name: ${args.lead.name}
Business name: ${args.lead.business_name}
Niche: ${args.lead.niche || ""}
Pain point: ${args.lead.pain_point || ""}
City: ${args.lead.city || ""}
Website: ${args.intake.website || ""}
Primary offer: ${args.intake.primary_offer || ""}
Service area: ${args.intake.service_area || ""}
CRM: ${args.intake.crm || ""}
Current follow-up: ${args.intake.sales_follow_up || ""}
Goals: ${args.intake.goals || ""}
Notes: ${args.intake.notes || ""}
Knowledge base context:
${args.knowledgeContext || "No additional context provided."}

Write a practical delivery pack for a local business AI automation service.
`;

  try {
    const aiContent = await callOpenAI(prompt);
    if (!aiContent) {
      return {
        markdown: renderDeliveryMarkdown(args.offer.name, args.lead.business_name, fallback),
        json: fallback
      };
    }

    const parsed = JSON.parse(aiContent) as DeliveryPayload;
    return {
      markdown: renderDeliveryMarkdown(args.offer.name, args.lead.business_name, parsed),
      json: parsed
    };
  } catch (_error) {
    return {
      markdown: renderDeliveryMarkdown(args.offer.name, args.lead.business_name, fallback),
      json: fallback
    };
  }
}

export function renderDeliveryMarkdown(
  offerName: string,
  businessName: string,
  delivery: DeliveryPayload
) {
  const proofPoints = delivery.funnel.proof_points.map((item) => `- ${item}`).join("\n");
  const emailSequence = delivery.email_sequence
    .map((item, index) => `### Email ${index + 1}\n${item}`)
    .join("\n\n");
  const smsSequence = delivery.sms_sequence
    .map((item, index) => `### SMS ${index + 1}\n${item}`)
    .join("\n\n");
  const quickWins = delivery.quick_wins.map((item) => `- ${item}`).join("\n");
  const pipeline = delivery.crm_pipeline.map((item) => `- ${item}`).join("\n");

  return `# ${offerName} Delivery Pack\n\n## Client\n${businessName}\n\n## Executive Summary\n${delivery.executive_summary}\n\n## Quick Wins\n${quickWins}\n\n## Funnel Copy\n### Headline\n${delivery.funnel.headline}\n\n### Subheadline\n${delivery.funnel.subheadline}\n\n### CTA\n${delivery.funnel.cta}\n\n### Proof Points\n${proofPoints}\n\n## Email Sequence\n${emailSequence}\n\n## SMS Sequence\n${smsSequence}\n\n## CRM Pipeline\n${pipeline}\n`;
}

export function buildOutreachMessage(args: {
  name: string;
  businessName: string;
  niche: string | null;
  painPoint: string | null;
  city: string | null;
  offerInterest: string | null;
  step: number;
  siteUrl: string;
}) {
  const niche = args.niche || "service business";
  const painPoint = args.painPoint || "slow follow-up";
  const area = args.city || "your market";
  const offer = args.offerInterest || "AI Follow-Up Audit";
  const firstName = args.name.split(" ")[0];

  const messages = [
    {
      subject: `Free audit for ${args.businessName}`,
      body: `Hi ${firstName},\n\nI help ${niche.toLowerCase()} teams in ${area} fix missed-call leaks, quote drop-off, and slow lead follow-up.\n\nI can send you a free audit showing exactly where ${args.businessName} is leaking revenue and the fastest automation to install first.\n\nIf you want the paid version with the full copy and workflow pack, it starts here: ${args.siteUrl}\n\n- Aurora Edge Group`
    },
    {
      subject: `${args.businessName}: fast win`,
      body: `Hi ${firstName},\n\nMost local operators lose money because ${painPoint}. The quick fix is instant response plus a 3-touch follow-up after every call, form, or estimate.\n\nIf you want the done-for-you version, the ${offer} is live here: ${args.siteUrl}\n\n- Aurora Edge Group`
    },
    {
      subject: `Close the file?`,
      body: `Hi ${firstName},\n\nI have one slot open to build the ${offer} for a ${niche.toLowerCase()} business in ${area}. If you want it, grab it here: ${args.siteUrl}\n\nIf not, I will close the loop for now.\n\n- Aurora Edge Group`
    }
  ];

  return messages[Math.min(args.step, messages.length - 1)];
}

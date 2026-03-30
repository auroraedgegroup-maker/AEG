export async function sendEmail(args: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("MAIL_FROM") || Deno.env.get("EMAIL_FROM");

  if (!apiKey || !from) {
    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY");
    }
    throw new Error("Missing MAIL_FROM or EMAIL_FROM");
  }

  if (!args.text && !args.html) {
    throw new Error("sendEmail requires text or html content");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      text: args.text,
      html: args.html ?? (args.text ? textToHtml(args.text) : undefined)
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error: ${body}`);
  }

  return response.json();
}

export function isEmailConfigured() {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("MAIL_FROM") || Deno.env.get("EMAIL_FROM");
  return Boolean(apiKey && from);
}

export function canSendExternalEmail() {
  const from = Deno.env.get("MAIL_FROM") || Deno.env.get("EMAIL_FROM") || "";
  const senderEmail = extractSenderEmail(from);
  return Boolean(senderEmail && !senderEmail.endsWith("@resend.dev"));
}

function extractSenderEmail(from: string) {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] || from).trim().toLowerCase();
}

function textToHtml(text: string) {
  return text
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br />");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

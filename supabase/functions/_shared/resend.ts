export async function sendEmail(args: {
  to: string | string[];
  subject: string;
  text: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");

  if (!apiKey || !from) {
    return { sent: false, reason: "Missing RESEND_API_KEY or EMAIL_FROM" };
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
      text: args.text
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error: ${body}`);
  }

  return response.json();
}

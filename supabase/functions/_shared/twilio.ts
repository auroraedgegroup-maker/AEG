export async function sendSms(args: {
  to: string;
  body: string;
}) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!accountSid || !authToken || !from) {
    throw new Error("Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER");
  }

  const credentials = btoa(`${accountSid}:${authToken}`);
  const body = new URLSearchParams({
    To: args.to,
    From: from,
    Body: args.body
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio error: ${text}`);
  }

  return response.json();
}

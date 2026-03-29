const config = window.AEG_CONFIG || {};

const offerLabels = {
  "followup-audit": "AI Follow-Up Audit",
  "missed-call-system": "Missed Call Text-Back Setup",
  "lead-reactivation": "Lead Reactivation Sprint"
};

function isConfiguredUrl(value) {
  return typeof value === "string" && /^https?:\/\//.test(value) && !value.includes("YOUR_");
}

function setStatus(node, message, tone = "") {
  if (!node) return;
  node.textContent = message;
  node.className = `status-text ${tone}`.trim();
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Request failed");
  }
  return body;
}

function getSupabaseFunctionUrl(endpoint) {
  if (!isConfiguredUrl(config.functionsBaseUrl)) {
    throw new Error(`Set functionsBaseUrl in site/config.js before using ${endpoint}.`);
  }
  return `${config.functionsBaseUrl}/${endpoint}`;
}

function getLeadCaptureUrl() {
  if (isConfiguredUrl(config.leadCaptureUrl)) {
    return config.leadCaptureUrl;
  }
  return getSupabaseFunctionUrl("lead-intake");
}

async function handleAuditFormSubmit(event) {
  event.preventDefault();
  const statusNode = document.querySelector("#audit-form-status");
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    setStatus(statusNode, "Sending your audit request...", "");
    await postJson(getLeadCaptureUrl(), {
      source: "website",
      offerInterest: "AI Follow-Up Audit",
      ...data
    });
    form.reset();
    setStatus(statusNode, "Lead captured. Check your inbox for the next step.", "success");
  } catch (error) {
    setStatus(statusNode, error.message, "error");
  }
}

async function handleCheckout(offerId) {
  const form = document.querySelector("#audit-form");
  const statusNode = document.querySelector("#audit-form-status");
  const data = form ? Object.fromEntries(new FormData(form).entries()) : {};

  if (!data.name || !data.businessName || !data.email) {
    setStatus(
      statusNode,
      "Enter name, business name, and email first so the order is attached to a client record.",
      "error"
    );
    document.querySelector("#lead-form").scrollIntoView({ behavior: "smooth" });
    return;
  }

  try {
    setStatus(statusNode, `Opening checkout for ${offerLabels[offerId]}...`, "");
    const body = await postJson(getSupabaseFunctionUrl("create-checkout"), {
      offerId,
      ...data
    });
    window.location.href = body.checkoutUrl;
  } catch (error) {
    setStatus(statusNode, error.message, "error");
  }
}

async function handleIntakeFormSubmit(event) {
  event.preventDefault();
  const statusNode = document.querySelector("#intake-form-status");
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");

  if (!sessionId) {
    setStatus(statusNode, "Missing Stripe session id in the URL.", "error");
    return;
  }

  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    setStatus(statusNode, "Saving intake and generating your delivery pack...", "");
    await postJson(getSupabaseFunctionUrl("intake-submit"), {
      sessionId,
      ...data
    });
    form.reset();
    setStatus(
      statusNode,
      "Intake saved. Delivery generation is running and the output will be emailed automatically.",
      "success"
    );
  } catch (error) {
    setStatus(statusNode, error.message, "error");
  }
}

document.querySelectorAll(".checkout-button").forEach((button) => {
  button.addEventListener("click", () => handleCheckout(button.dataset.offer));
});

const auditForm = document.querySelector("#audit-form");
if (auditForm) {
  auditForm.addEventListener("submit", handleAuditFormSubmit);
}

const intakeForm = document.querySelector("#intake-form");
if (intakeForm) {
  intakeForm.addEventListener("submit", handleIntakeFormSubmit);
}

const brandNode = document.querySelector("#brand-name");
if (brandNode && config.brandName) {
  brandNode.textContent = config.brandName;
}

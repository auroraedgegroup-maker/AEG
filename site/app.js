(function () {
  const config = window.APP_CONFIG || {};

  const businessName = getConfigText("businessName", "Aurora Edge Group HQ");
  const infoEmail = getConfigText("infoEmail", "info@auroraedgeghq.com");
  const supportEmail = getConfigText("supportEmail", "support@auroraedgeghq.com");
  const billingEmail = getConfigText("billingEmail", "billing@auroraedgeghq.com");
  const phone = getConfigText("phone", "+16507195861");
  const phoneDisplay = getConfigText("phoneDisplay", "+1 650 719 5861");
  const publicSiteUrl = getConfigText("publicSiteUrl", window.location.origin);

  const offerMeta = {
    "followup-audit": {
      title: "AI Follow-Up Audit",
      description:
        "Start with the $297 audit and continue to secure Stripe checkout.",
    },
    "missed-call-system": {
      title: "Missed Call Text-Back Setup",
      description:
        "Continue to secure Stripe checkout for the missed call text-back setup.",
    },
    "lead-reactivation": {
      title: "Lead Reactivation Sprint",
      description:
        "Continue to secure Stripe checkout for the reactivation sprint.",
    },
  };

  function getConfigText(key, fallback) {
    return typeof config[key] === "string" && config[key].trim()
      ? config[key].trim()
      : fallback;
  }

  function isConfiguredUrl(value) {
    return typeof value === "string" &&
      /^https?:\/\//.test(value) &&
      !value.includes("YOUR_");
  }

  function setFeedback(node, message, tone) {
    if (!node) return;
    node.textContent = message;
    node.className = `form-feedback ${tone || ""}`.trim();
  }

  function applyText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  function applyLink(selector, href, text) {
    document.querySelectorAll(selector).forEach((node) => {
      node.setAttribute("href", href);
      if (text) {
        node.textContent = text;
      }
    });
  }

  function getFunctionUrl(endpoint) {
    const baseUrl = getConfigText("functionsBaseUrl", "");
    if (!isConfiguredUrl(baseUrl)) {
      throw new Error(`Set functionsBaseUrl in site/config.js before calling ${endpoint}.`);
    }
    return `${baseUrl.replace(/\/$/, "")}/${endpoint}`;
  }

  function requestJson(url, body) {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      return data;
    });
  }

  function showCancelMessage() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "cancelled") return;

    const heroCopy = document.querySelector(".hero-copy");
    if (!heroCopy) return;

    const notice = document.createElement("div");
    notice.className = "page-banner";
    notice.textContent =
      "Checkout was cancelled. You can restart the paid audit or request the free audit below.";
    heroCopy.prepend(notice);
  }

  function enhanceHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function bindRevealAnimations() {
    const nodes = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18 }
    );

    nodes.forEach((node) => observer.observe(node));
  }

  function bindContactData() {
    applyText("[data-business-name]", businessName);
    applyText("[data-phone-display]", phoneDisplay);
    applyLink("[data-phone-link]", `tel:${phone.replace(/\s+/g, "")}`, phoneDisplay);
    applyLink("[data-info-email-link]", `mailto:${infoEmail}`, infoEmail);
    applyLink("[data-support-email-link]", `mailto:${supportEmail}`, supportEmail);
    applyLink("[data-billing-email-link]", `mailto:${billingEmail}`, billingEmail);
    document.querySelectorAll("[data-public-site]").forEach((node) => {
      node.textContent = publicSiteUrl;
    });
  }

  function resolveStripeLink(offerId) {
    const stripeLinks = config.stripeLinks || {};
    const candidate = stripeLinks[offerId];
    return isConfiguredUrl(candidate) ? candidate : "";
  }

  function bindHomeCheckout() {
    const modal = document.getElementById("checkout-modal");
    const form = document.querySelector("[data-checkout-form]");
    const statusNode = document.querySelector("[data-checkout-form-status]");
    const modalTitle = document.getElementById("checkout-modal-title");
    const modalCopy = document.getElementById("checkout-modal-copy");
    if (!form || !modal) return;

    const openModal = (offerId) => {
      const meta = offerMeta[offerId] || offerMeta["followup-audit"];
      form.elements.offerId.value = offerId;
      modalTitle.textContent = meta.title;
      modalCopy.textContent = meta.description;
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
      setFeedback(statusNode, "", "");
      setTimeout(() => {
        const firstField = form.querySelector("input[name='name']");
        if (firstField) firstField.focus();
      }, 0);
    };

    const closeModal = () => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    };

    document.querySelectorAll(".checkout-trigger").forEach((button) => {
      button.addEventListener("click", () => {
        const offerId = button.getAttribute("data-offer-id");
        const stripeLink = resolveStripeLink(offerId);
        if (stripeLink) {
          window.location.href = stripeLink;
          return;
        }
        openModal(offerId);
      });
    });

    modal.querySelectorAll("[data-modal-close]").forEach((node) => {
      node.addEventListener("click", closeModal);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setFeedback(statusNode, "Preparing secure checkout…", "");

      const payload = {
        offerId: form.elements.offerId.value,
        name: form.elements.name.value.trim(),
        businessName: form.elements.businessName.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        website: form.elements.website.value.trim(),
        source: "website_paid_offer",
      };

      try {
        const data = await requestJson(getFunctionUrl("create-checkout"), payload);
        if (!data.checkoutUrl) {
          throw new Error("Checkout URL missing from response.");
        }
        window.location.href = data.checkoutUrl;
      } catch (error) {
        setFeedback(statusNode, error.message || "Unable to start checkout.", "is-error");
      }
    });
  }

  function bindLeadForm() {
    const form = document.querySelector("[data-lead-form]");
    const statusNode = document.querySelector("[data-lead-form-status]");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setFeedback(statusNode, "Sending your free audit request…", "");

      const payload = {
        name: form.elements.name.value.trim(),
        businessName: form.elements.businessName.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        website: form.elements.website.value.trim(),
        niche: form.elements.niche.value.trim(),
        painPoint: form.elements.painPoint.value.trim(),
        source: "site_free_audit",
        offerInterest: "Free Audit Request",
      };

      try {
        await requestJson(getFunctionUrl("lead-intake"), payload);
        form.reset();
        setFeedback(
          statusNode,
          "Free audit request received. AEG will route this through the free path and follow up by email.",
          "is-success"
        );
      } catch (error) {
        setFeedback(statusNode, error.message || "Unable to submit the free audit request.", "is-error");
      }
    });
  }

  function bindContactForm() {
    const form = document.querySelector("[data-contact-form]");
    const statusNode = document.querySelector("[data-contact-form-status]");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setFeedback(statusNode, "Sending your inquiry…", "");

      const payload = {
        name: form.elements.name.value.trim(),
        businessName: form.elements.businessName.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        niche: form.elements.niche.value.trim(),
        notes: form.elements.notes.value.trim(),
        source: "site_general_inquiry",
        offerInterest: "General Inquiry",
      };

      try {
        await requestJson(getFunctionUrl("lead-intake"), payload);
        form.reset();
        setFeedback(
          statusNode,
          "Inquiry received. AEG logged it and will route follow-up through the info inbox.",
          "is-success"
        );
      } catch (error) {
        setFeedback(statusNode, error.message || "Unable to send inquiry.", "is-error");
      }
    });
  }

  function bindThankYouForm() {
    const form = document.querySelector("[data-intake-form]");
    const statusNode = document.querySelector("[data-intake-form-status]");
    const sessionNode = document.querySelector("[data-session-state]");
    if (!form || !sessionNode) return;

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id") || "";

    if (!sessionId) {
      sessionNode.textContent =
        "No checkout session detected. Use the secure checkout flow first, then return here automatically.";
      sessionNode.classList.add("is-warning");
      form.querySelector("button[type='submit']").disabled = true;
      return;
    }

    sessionNode.textContent = `Secure session detected: ${sessionId.slice(0, 12)}…`;
    sessionNode.classList.add("is-success");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setFeedback(statusNode, "Submitting intake…", "");

      const payload = {
        sessionId,
        website: form.elements.website.value.trim(),
        primaryOffer: form.elements.primaryOffer.value.trim(),
        serviceArea: form.elements.serviceArea.value.trim(),
        crm: form.elements.crm.value.trim(),
        salesFollowUp: form.elements.salesFollowUp.value.trim(),
        goals: form.elements.goals.value.trim(),
        notes: form.elements.notes.value.trim(),
      };

      try {
        await requestJson(getFunctionUrl("intake-submit"), payload);
        form.reset();
        setFeedback(
          statusNode,
          "Intake submitted. Your deliverable is now queued for fulfillment.",
          "is-success"
        );
      } catch (error) {
        setFeedback(statusNode, error.message || "Unable to submit intake.", "is-error");
      }
    });
  }

  bindContactData();
  enhanceHeader();
  bindRevealAnimations();
  showCancelMessage();
  bindHomeCheckout();
  bindLeadForm();
  bindContactForm();
  bindThankYouForm();
})();

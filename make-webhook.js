(() => {
  const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/aufm9atnl7jf7kn8466xqc5dqwwiygy4";
  const form = document.querySelector(".govcon-form");
  const submitButton = form?.querySelector(".form-submit");
  const removedFieldNames = ["helpNeeded", "timeline"];
  let submitClickArmed = false;
  let lastPayloadSignature = "";
  let lastSentAt = 0;

  if (!form || !submitButton) {
    return;
  }

  function removeUnusedFields() {
    for (const fieldName of removedFieldNames) {
      const field = form.elements[fieldName];
      const wrapper = field?.closest(".form-field");
      wrapper?.remove();
    }
  }

  function relaxWebsiteValidation() {
    const websiteField = form.elements.companyWebsite;

    if (!websiteField) {
      return;
    }

    websiteField.type = "text";
    websiteField.inputMode = "url";
    websiteField.placeholder = "www.example.com";
  }

  function buildPayload() {
    const formData = new FormData(form);
    const payload = {};

    for (const [key, value] of formData.entries()) {
      if (removedFieldNames.includes(key)) {
        continue;
      }

      payload[key] = typeof value === "string" ? value.trim() : "";
    }

    return payload;
  }

  function hasMeaningfulPayload(payload) {
    return Object.values(payload).some((value) => value.length > 0);
  }

  function sendToMake() {
    const payload = buildPayload();
    const payloadSignature = JSON.stringify(payload);
    const now = Date.now();

    if (
      !MAKE_WEBHOOK_URL ||
      !submitClickArmed ||
      !form.checkValidity() ||
      !hasMeaningfulPayload(payload) ||
      (payloadSignature === lastPayloadSignature && now - lastSentAt < 8000)
    ) {
      submitClickArmed = false;
      return;
    }

    submitClickArmed = false;
    lastPayloadSignature = payloadSignature;
    lastSentAt = now;

    void fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: payloadSignature,
      keepalive: true
    }).catch(() => {});
  }

  removeUnusedFields();
  relaxWebsiteValidation();

  submitButton.addEventListener("click", (event) => {
    submitClickArmed = event.isTrusted === true;
  });

  form.addEventListener("submit", sendToMake);
})();

(() => {
  const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/aufm9atnl7jf7kn8466xqc5dqwwiygy4";
  const form = document.querySelector(".govcon-form");
  const removedFieldNames = ["helpNeeded", "timeline"];

  if (!form) {
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

  function sendToMake() {
    if (!MAKE_WEBHOOK_URL || !form.checkValidity()) {
      return;
    }

    void fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildPayload()),
      keepalive: true
    }).catch(() => {});
  }

  removeUnusedFields();
  relaxWebsiteValidation();
  form.addEventListener("submit", sendToMake);
})();

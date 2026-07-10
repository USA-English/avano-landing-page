(() => {
  const MAKE_WEBHOOK_URL = "";
  const form = document.querySelector(".govcon-form");

  if (!form) {
    return;
  }

  function buildPayload() {
    const formData = new FormData(form);
    const payload = {};

    for (const [key, value] of formData.entries()) {
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

  form.addEventListener("submit", sendToMake);
})();

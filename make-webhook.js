(() => {
  const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/aufm9atnl7jf7kn8466xqc5dqwwiygy4";
  const form = document.querySelector(".govcon-form");
  const submitButton = form?.querySelector(".form-submit");
  const removedFieldNames = ["helpNeeded", "timeline"];
  const requiredFieldNames = [
    "firstName",
    "lastName",
    "businessEmail",
    "phone",
    "companyName",
    "state",
    "annualRevenue",
    "companyOffer",
    "samRegistered",
    "previousBid"
  ];
  const payloadFieldNames = [
    ...requiredFieldNames,
    "companyWebsite",
    "additionalNotes"
  ];
  let submitClickArmed = false;
  let submitClickAt = 0;
  let lastPayloadSignature = "";
  let lastSentAt = 0;

  if (!form || !submitButton) {
    return;
  }

  function injectExpertSectionStyles() {
    if (document.getElementById("expert-section-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "expert-section-styles";
    style.textContent = `
      .expert-section {
        background: var(--background);
        background-image: none !important;
      }

      .expert-section__inner {
        width: min(100%, 94rem);
        display: grid;
        grid-template-columns: minmax(14rem, 0.55fr) minmax(0, 1.45fr);
        align-items: center;
        gap: clamp(1rem, 1.8vw, 1.75rem);
      }

      .expert-section__title {
        max-width: none !important;
        margin: 0;
        text-align: center;
        white-space: normal;
        line-height: 0.92;
      }

      .expert-section__title-line {
        display: block;
      }

      .expert-section__visual,
      .expert-section__seals {
        margin: 0;
      }

      .expert-section__visual {
        display: grid;
        justify-items: center;
        gap: clamp(1.25rem, 2.4vw, 2rem);
      }

      .expert-section__visual > img {
        display: block;
        width: min(100%, 26rem);
        height: auto;
        object-fit: contain;
      }

      .expert-section__copy {
        min-width: 0;
        text-align: center;
      }

      .expert-section__copy .copy-section__title,
      .expert-section__copy .copy-section__subtitle,
      .expert-section__copy .copy-section__body {
        margin-left: auto;
        margin-right: auto;
      }

      .expert-section__copy .copy-section__subtitle {
        max-width: none;
        white-space: nowrap;
      }

      .expert-section__copy .copy-section__body {
        max-width: 50rem;
      }

      .expert-section__seals {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: clamp(1.35rem, 2.6vw, 2.15rem);
      }

      .expert-section__seals img {
        display: block;
        width: min(42%, 10.2rem);
        height: auto;
        object-fit: contain;
      }

      .hero__cta--image,
      .hero__cta--image:hover,
      .hero__cta--image:focus,
      .hero__cta--image:focus-visible,
      .hero__cta--image:active {
        width: min(100%, 18rem);
        padding: 0 !important;
        border: 0 !important;
        outline: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        background-color: transparent !important;
        box-shadow: none !important;
        filter: none !important;
        color: inherit !important;
        line-height: 0;
        transform: none !important;
        animation: none !important;
      }

      .hero__cta--image::before,
      .hero__cta--image::after {
        display: none !important;
        content: none !important;
        animation: none !important;
        box-shadow: none !important;
        filter: none !important;
      }

      .hero__cta--image img {
        display: block;
        width: 100%;
        height: auto;
        background: transparent !important;
        box-shadow: none !important;
        filter: none !important;
        clip-path: none !important;
      }

      @media (max-width: 960px) {
        .expert-section__inner {
          grid-template-columns: minmax(13rem, 0.55fr) minmax(0, 1.45fr);
          gap: 1.25rem;
        }

        .expert-section__seals img {
          width: min(42%, 7.5rem);
        }
      }

      @media (max-width: 720px) {
        .expert-section__inner {
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .expert-section__title {
          font-size: clamp(2.35rem, 12vw, 4.25rem);
          white-space: normal;
        }

        .expert-section__copy .copy-section__subtitle {
          white-space: normal;
        }

        .expert-section__visual > img {
          width: min(100%, 22rem);
        }

        .expert-section__seals img {
          width: min(38vw, 8rem);
        }

        .hero__cta--image,
        .hero__cta--image:hover,
        .hero__cta--image:focus,
        .hero__cta--image:focus-visible,
        .hero__cta--image:active {
          width: min(100%, 9rem);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function replaceHeroButton() {
    const heroCta = document.querySelector(".hero__cta");

    if (!heroCta || heroCta.classList.contains("hero__cta--image")) {
      return;
    }

    heroCta.classList.add("hero__cta--image");
    heroCta.setAttribute("aria-label", "Learn how");
    heroCta.innerHTML = `
      <img
        src="./uploads/learn-how-button.webp"
        alt="Learn how"
      />
    `;
  }

  function preserveMazeBackground() {
    const mazeSection = document.querySelector(".copy-section--maze");

    if (!mazeSection) {
      return;
    }

    mazeSection.style.position = "relative";
    mazeSection.style.zIndex = "1";
    mazeSection.style.overflow = "hidden";
    mazeSection.style.backgroundImage = 'url("./uploads/maze.bg-v2.webp")';
    mazeSection.style.backgroundPosition = "center";
    mazeSection.style.backgroundSize = "cover";
    mazeSection.style.backgroundRepeat = "no-repeat";
  }

  function insertExpertSection() {
    const anchor = document.querySelector("#next");

    if (!anchor || document.querySelector(".expert-section")) {
      preserveMazeBackground();
      return;
    }

    const section = document.createElement("section");
    section.className = "copy-section copy-section--wide expert-section";
    section.setAttribute("aria-label", "Meet Eric Craig");
    section.style.backgroundImage = "none";
    section.innerHTML = `
      <div class="copy-section__inner expert-section__inner">
        <figure class="expert-section__visual">
          <img
            src="./uploads/eric-headshot.webp"
            alt="Eric Craig, Founder and Federal Contracting Advisor"
          />
          <div class="expert-section__seals" aria-label="Eric Craig credentials">
            <img
              src="./uploads/us-army-seal.webp"
              alt="United States Army seal"
            />
            <img
              src="./uploads/wh-comms-seal.webp"
              alt="White House Communications Agency seal"
            />
          </div>
        </figure>
        <div class="expert-section__copy">
          <h1 class="copy-section__title expert-section__title">
            <span class="expert-section__title-line">From the White House</span>
            <span class="expert-section__title-line">to Federal Contracting</span>
          </h1>
          <p class="copy-section__subtitle">
            Meet Eric Craig, Founder and Federal Contracting Advisor
          </p>
          <div class="copy-section__body">
            <p>
              <strong>Eric Craig</strong> is a seasoned government contracting advisor with a diverse career spanning secure government communications, global IT leadership, and federal contracting. He began his career with the White House Communications Agency, providing secure telecommunications and IT support to the President of the United States while holding a Top Secret/SCI security clearance. Today, he helps businesses successfully enter and grow in the federal marketplace by providing practical guidance on registrations, compliance, proposal development, and contract acquisition, turning complex government processes into clear, actionable business strategies.
            </p>
          </div>
        </div>
      </div>
    `;

    anchor.insertAdjacentElement("afterend", section);
    preserveMazeBackground();
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
    const payload = {};

    for (const fieldName of payloadFieldNames) {
      const field = form.elements[fieldName];
      payload[fieldName] = typeof field?.value === "string"
        ? field.value.trim()
        : "";
    }

    return payload;
  }

  function hasCompletePayload(payload) {
    const hasRequiredValues = requiredFieldNames.every(
      (fieldName) => payload[fieldName].length > 0
    );
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(payload.businessEmail);
    const hasValidPhone = payload.phone.replace(/\D/g, "").length === 10;

    return hasRequiredValues && hasValidEmail && hasValidPhone;
  }

  function resetSubmitAuthorization() {
    submitClickArmed = false;
    submitClickAt = 0;
  }

  function sendToMake(event) {
    const payload = buildPayload();
    const payloadSignature = JSON.stringify(payload);
    const now = Date.now();
    const isFreshHumanClick = submitClickArmed && now - submitClickAt <= 1200;
    const isTrustedSubmitFromButton =
      event?.isTrusted === true && event.submitter === submitButton;

    if (
      !MAKE_WEBHOOK_URL ||
      !isFreshHumanClick ||
      !isTrustedSubmitFromButton ||
      !form.checkValidity() ||
      !hasCompletePayload(payload) ||
      (payloadSignature === lastPayloadSignature && now - lastSentAt < 8000)
    ) {
      resetSubmitAuthorization();
      return;
    }

    resetSubmitAuthorization();
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

  injectExpertSectionStyles();
  replaceHeroButton();
  insertExpertSection();
  removeUnusedFields();
  relaxWebsiteValidation();
  form.dispatchEvent(new Event("form:requirements-changed"));

  submitButton.addEventListener("click", (event) => {
    if (!event.isTrusted) {
      resetSubmitAuthorization();
      return;
    }

    submitClickArmed = true;
    submitClickAt = Date.now();
  });

  form.addEventListener("input", resetSubmitAuthorization);
  form.addEventListener("change", resetSubmitAuthorization);
  form.addEventListener("reset", resetSubmitAuthorization);
  form.addEventListener("submit", sendToMake);
})();

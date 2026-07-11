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
        grid-template-columns: minmax(16rem, 0.72fr) minmax(0, 1fr) minmax(9rem, 0.36fr);
        align-items: center;
        gap: clamp(1.75rem, 3.6vw, 4.5rem);
      }

      .expert-section__visual,
      .expert-section__seals {
        margin: 0;
      }

      .expert-section__visual img {
        display: block;
        width: min(100%, 30rem);
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

      .expert-section__copy .copy-section__title {
        max-width: min(100%, 58rem);
      }

      .expert-section__copy .copy-section__subtitle {
        max-width: min(100%, 46rem);
      }

      .expert-section__copy .copy-section__body {
        max-width: 50rem;
      }

      .expert-section__seals {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: clamp(1.5rem, 3vw, 2.75rem);
      }

      .expert-section__seals img {
        display: block;
        width: min(100%, 10.5rem);
        height: auto;
        object-fit: contain;
      }

      @media (max-width: 960px) {
        .expert-section__inner {
          grid-template-columns: minmax(0, 0.85fr) minmax(0, 1fr);
        }

        .expert-section__seals {
          grid-column: 1 / -1;
          flex-direction: row;
        }

        .expert-section__seals img {
          width: min(38vw, 9rem);
        }
      }

      @media (max-width: 720px) {
        .expert-section__inner {
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .expert-section__visual {
          order: -2;
        }

        .expert-section__seals {
          order: -1;
        }

        .expert-section__visual img {
          width: min(100%, 22rem);
          margin: 0 auto;
        }
      }
    `;
    document.head.appendChild(style);
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
        </figure>
        <div class="expert-section__copy">
          <h1 class="copy-section__title copy-section__title--single">
            From the White House to Federal Contracting
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
        <figure class="expert-section__seals" aria-label="Eric Craig credentials">
          <img
            src="./uploads/us-army-seal.webp"
            alt="United States Army seal"
          />
          <img
            src="./uploads/wh-comms-seal.webp"
            alt="White House Communications Agency seal"
          />
        </figure>
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

  injectExpertSectionStyles();
  insertExpertSection();
  removeUnusedFields();
  relaxWebsiteValidation();

  submitButton.addEventListener("click", (event) => {
    submitClickArmed = event.isTrusted === true;
  });

  form.addEventListener("submit", sendToMake);
})();

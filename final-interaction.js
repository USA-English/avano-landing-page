(() => {
  const canvas = document.getElementById("final-field");
  const space = document.querySelector(".final-particle-space");
  const token = document.querySelector(".opportunity-token");
  const modal = document.querySelector(".opportunity-modal");
  const modalClose = document.querySelector(".opportunity-modal__close");
  const assessmentCta = document.querySelector(".assessment-cta");
  const successModal = document.querySelector(".success-modal");
  const successModalOk = document.querySelector(".success-modal__ok");
  const form = document.querySelector(".govcon-form");
  const submitButton = form?.querySelector(".form-submit");
  const formStatus = document.querySelector(".form-status");
  const firstNameInput = form?.elements?.firstName;
  const emailInput = form?.elements?.businessEmail;
  const phoneInput = form?.elements?.phone;

  if (!canvas || !space || !token) {
    return;
  }

  let tokenHomeParent = token.parentElement;
  let tokenHomeNext = token.nextSibling;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let tokenPlaceholder = null;

  function openModal() {
    if (!modal) {
      return;
    }

    modal.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(updateSubmitButton);
    window.setTimeout(updateSubmitButton, 120);
    firstNameInput?.focus();
  }

  function closeModal() {
    if (!modal) {
      return;
    }

    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function openSuccessModal() {
    if (!successModal) {
      return;
    }

    successModal.hidden = false;
    document.body.classList.add("modal-open");
    successModalOk?.focus();
  }

  function closeSuccessModal() {
    if (!successModal) {
      return;
    }

    successModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function validateEmail() {
    if (!emailInput) {
      return true;
    }

    const value = emailInput.value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
    emailInput.setCustomValidity(isValid ? "" : "Please enter a valid business email.");
    return isValid;
  }

  function formatPhone(value) {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    const area = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const line = digits.slice(6, 10);

    if (digits.length > 6) {
      return `(${area}) ${prefix}-${line}`;
    }

    if (digits.length > 3) {
      return `(${area}) ${prefix}`;
    }

    if (digits.length > 0) {
      return `(${area}`;
    }

    return "";
  }

  function validatePhone() {
    if (!phoneInput) {
      return true;
    }

    const isValid = phoneInput.value.replace(/\D/g, "").length === 10;
    phoneInput.setCustomValidity(isValid ? "" : "Please enter a complete US phone number.");
    return isValid;
  }

  function updateFormStatus(message, isError = false) {
    if (!formStatus) {
      return;
    }

    formStatus.textContent = message;
    formStatus.classList.toggle("is-error", isError);
  }

  function validateForm() {
    const validEmail = validateEmail();
    const validPhone = validatePhone();
    return validEmail && validPhone && Boolean(form?.checkValidity());
  }

  function updateSubmitButton() {
    if (!submitButton) {
      return;
    }

    submitButton.disabled = !validateForm();
  }

  function handleFormSubmit(event) {
    event.preventDefault();

    if (!form) {
      return;
    }

    if (!validateForm()) {
      updateFormStatus("Please complete every required field with valid information.", true);
      form.reportValidity();
      return;
    }

    closeModal();
    openSuccessModal();
  }

  function beginDrag(event) {
    if (token.classList.contains("is-locked")) {
      event.preventDefault();
      openModal();
      return;
    }

    const rect = token.getBoundingClientRect();

    tokenHomeParent = token.parentElement;
    tokenHomeNext = token.nextSibling;
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;

    tokenPlaceholder = document.createElement("span");
    tokenPlaceholder.className = "opportunity-token-placeholder";
    tokenPlaceholder.style.width = `${rect.width}px`;
    tokenPlaceholder.style.height = `${rect.height}px`;
    tokenHomeParent.insertBefore(tokenPlaceholder, token);

    token.classList.remove("is-dropped");
    token.classList.add("is-dragging");
    token.style.width = `${rect.width}px`;
    token.style.height = `${rect.height}px`;
    token.style.left = `${rect.left}px`;
    token.style.top = `${rect.top}px`;
    token.style.transform = "none";
    document.body.appendChild(token);

    updateDrag(event);
    window.addEventListener("pointermove", updateDrag, { passive: false });
    window.addEventListener("pointerup", endDrag, { passive: true, once: true });
  }

  function updateDrag(event) {
    event.preventDefault();
    token.style.left = `${event.clientX - dragOffsetX}px`;
    token.style.top = `${event.clientY - dragOffsetY}px`;
  }

  function endDrag(event) {
    window.removeEventListener("pointermove", updateDrag);

    const rect = space.getBoundingClientRect();
    const dropX = event.clientX - rect.left;
    const dropY = event.clientY - rect.top;
    const droppedInside = dropX >= 0 && dropY >= 0 && dropX <= rect.width && dropY <= rect.height;

    token.classList.remove("is-dragging");
    token.style.width = "";
    token.style.height = "";
    token.style.transform = "";

    if (droppedInside) {
      tokenPlaceholder?.remove();
      tokenPlaceholder = null;
      space.appendChild(token);
      token.classList.add("is-dropped", "is-locked");
      token.style.left = `${dropX}px`;
      token.style.top = `${dropY}px`;
      token.setAttribute("aria-label", "Company marker positioned inside the GovCon cloud");
      openModal();
    } else {
      token.classList.remove("is-dropped");
      token.style.left = "";
      token.style.top = "";

      if (tokenPlaceholder && tokenPlaceholder.parentElement) {
        tokenPlaceholder.replaceWith(token);
        tokenPlaceholder = null;
      } else if (tokenHomeNext) {
        tokenHomeParent.insertBefore(token, tokenHomeNext);
      } else {
        tokenHomeParent.appendChild(token);
      }
    }
  }

  modalClose?.addEventListener("click", closeModal);
  assessmentCta?.addEventListener("click", openModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
  successModalOk?.addEventListener("click", closeSuccessModal);
  successModal?.addEventListener("click", (event) => {
    if (event.target === successModal) {
      closeSuccessModal();
    }
  });
  form?.addEventListener("input", updateSubmitButton);
  form?.addEventListener("change", updateSubmitButton);
  form?.addEventListener("form:requirements-changed", updateSubmitButton);
  form?.addEventListener("submit", handleFormSubmit);
  firstNameInput?.addEventListener("input", () => {
    updateFormStatus("");
  });
  emailInput?.addEventListener("input", () => {
    validateEmail();
    updateFormStatus("");
  });
  phoneInput?.addEventListener("input", () => {
    phoneInput.value = formatPhone(phoneInput.value);
    validatePhone();
    updateFormStatus("");
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && successModal && !successModal.hidden) {
      closeSuccessModal();
      return;
    }

    if (event.key === "Escape" && modal && !modal.hidden) {
      closeModal();
    }
  });
  token.addEventListener("pointerdown", beginDrag);
  updateSubmitButton();
})();

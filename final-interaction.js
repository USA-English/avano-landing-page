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

  const ctx = canvas.getContext("2d", { alpha: true });
  const PARTICLE_COUNT = 10000;
  const SHAPE_COUNT = 6;
  const SEGMENT_DURATION = 8600;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = [
    { r: 17, g: 50, b: 91 },
    { r: 179, g: 138, b: 73 }
  ];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let shapeTargets = [];
  let shapeDeck = [];
  let shapeIndices = { previous: 0, current: 1, next: 2, following: 3 };
  let segmentStart = performance.now();
  let tokenHomeParent = token.parentElement;
  let tokenHomeNext = token.nextSibling;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let tokenPlaceholder = null;

  const pointer = {
    x: -10000,
    y: -10000,
    active: false,
    presence: 0
  };

  const tokenField = {
    x: -10000,
    y: -10000,
    active: false,
    presence: 0
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;

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

  function gaussian(x, y, centerX, centerY, radiusX, radiusY) {
    const normalizedX = (x - centerX) / radiusX;
    const normalizedY = (y - centerY) / radiusY;
    return Math.exp(-(normalizedX * normalizedX + normalizedY * normalizedY) * 1.45);
  }

  function rotatePoint(x, y, angle) {
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);

    return {
      x: x * cosine - y * sine,
      y: x * sine + y * cosine
    };
  }

  function catmullRom(previous, current, nextPoint, following, amount) {
    const amount2 = amount * amount;
    const amount3 = amount2 * amount;

    return {
      x: 0.5 * (
        2 * current.x +
        (-previous.x + nextPoint.x) * amount +
        (2 * previous.x - 5 * current.x + 4 * nextPoint.x - following.x) * amount2 +
        (-previous.x + 3 * current.x - 3 * nextPoint.x + following.x) * amount3
      ),
      y: 0.5 * (
        2 * current.y +
        (-previous.y + nextPoint.y) * amount +
        (2 * previous.y - 5 * current.y + 4 * nextPoint.y - following.y) * amount2 +
        (-previous.y + 3 * current.y - 3 * nextPoint.y + following.y) * amount3
      )
    };
  }

  function deformPoint(shapeIndex, particle) {
    const x = particle.x;
    const y = particle.y;
    let nextX = x;
    let nextY = y;

    switch (shapeIndex) {
      case 0: {
        const verticalProgress = (y + 1) * 0.5;
        const widthProfile =
          0.48 +
          verticalProgress * 0.38 +
          Math.sin(verticalProgress * Math.PI) * 0.08;
        nextX = x * widthProfile + (1 - y * y) * 0.1 - y * 0.045;
        nextY = y * 1.08 + x * x * 0.035;
        return rotatePoint(nextX, nextY, -0.055);
      }

      case 1: {
        nextX = x * 0.8 + (1 - y * y) * 0.19 + y * 0.08;
        nextY = y * 0.87;
        const lowerNotch = gaussian(x, y, -0.02, 0.58, 0.34, 0.31);
        const leftShoulder = gaussian(x, y, -0.62, 0.04, 0.38, 0.45);
        nextX += lowerNotch * 0.07 - leftShoulder * 0.15;
        nextY -= lowerNotch * 0.12 - leftShoulder * 0.04;
        return rotatePoint(nextX, nextY, -0.13);
      }

      case 2: {
        nextX = x * 0.81 + Math.sin((y + 0.22) * 2.35) * 0.22 + y * 0.08;
        nextY = y * 0.76 + Math.sin(x * 2.7) * 0.1;
        const upperFold = gaussian(x, y, -0.5, -0.35, 0.32, 0.34);
        const waist = gaussian(x, y, 0.02, 0.08, 0.34, 0.42);
        nextX += upperFold * 0.22 + waist * 0.035;
        nextY += upperFold * 0.08 + waist * 0.035;
        return rotatePoint(nextX, nextY, 0.16);
      }

      case 3: {
        nextX = x * 0.79 - y * 0.2 + (1 - y * y) * 0.18;
        nextY = y * 0.76 + Math.sin((x + 0.9) * 2.2) * 0.11;
        const curlPocket = gaussian(nextX, nextY, -0.45, 0.25, 0.31, 0.29);
        const foldedTip = gaussian(x, y, 0.58, -0.34, 0.3, 0.34);
        nextX += curlPocket * 0.34 - foldedTip * 0.12;
        nextY -= curlPocket * 0.18 + foldedTip * 0.06;
        return rotatePoint(nextX, nextY, -0.2);
      }

      case 4: {
        nextX = x * 0.84;
        nextY = y * 0.72;
        const centerBridge = gaussian(x, y, 0, -0.42, 0.34, 0.42);
        const horns = gaussian(Math.abs(x), y, 0.58, -0.42, 0.25, 0.42);
        const lowerBody = gaussian(x, y, 0, 0.62, 0.7, 0.3);
        nextX *= 1 - centerBridge * 0.08;
        nextY += centerBridge * 0.08 - horns * 0.14 + lowerBody * 0.09;
        return { x: nextX, y: nextY };
      }

      default: {
        nextX = x * 0.96 + y * 0.18 + (1 - y * y) * 0.13;
        nextY = y * 0.59 - x * 0.11 + Math.sin(x * 2.45) * 0.09;
        const upperMass = gaussian(x, y, -0.42, -0.14, 0.46, 0.53);
        const hookNotch = gaussian(nextX, nextY, 0.43, 0.12, 0.29, 0.24);
        nextX -= hookNotch * 0.2;
        nextY -= upperMass * 0.15 - hookNotch * 0.2;
        return rotatePoint(nextX, nextY, 0.25);
      }
    }
  }

  function normalizeShape(points) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    const centerX = (minX + maxX) * 0.5;
    const centerY = (minY + maxY) * 0.5;
    const largestHalfExtent = Math.max(
      (maxX - minX) * 0.5,
      (maxY - minY) * 0.5,
      0.001
    );
    const scale = 0.96 / largestHalfExtent;

    return points.map((point) => ({
      x: (point.x - centerX) * scale,
      y: (point.y - centerY) * scale
    }));
  }

  function shuffle(values) {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
    }

    return values;
  }

  function takeNextShape(excluded = []) {
    if (!shapeDeck.length) {
      shapeDeck = shuffle(Array.from({ length: SHAPE_COUNT }, (_, index) => index));
    }

    let deckIndex = shapeDeck.findIndex((shapeIndex) => !excluded.includes(shapeIndex));

    if (deckIndex === -1) {
      shapeDeck = shuffle(Array.from({ length: SHAPE_COUNT }, (_, index) => index));
      deckIndex = shapeDeck.findIndex((shapeIndex) => !excluded.includes(shapeIndex));
    }

    return shapeDeck.splice(Math.max(0, deckIndex), 1)[0];
  }

  function initializeShapeSequence() {
    const previous = takeNextShape();
    const current = takeNextShape([previous]);
    const nextShape = takeNextShape([previous, current]);
    const following = takeNextShape([previous, current, nextShape]);
    shapeIndices = { previous, current, next: nextShape, following };
  }

  function advanceShapeSequence() {
    shapeIndices = {
      previous: shapeIndices.current,
      current: shapeIndices.next,
      next: shapeIndices.following,
      following: takeNextShape([
        shapeIndices.current,
        shapeIndices.next,
        shapeIndices.following
      ])
    };
  }

  function createParticles() {
    particles = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random());

      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        angle,
        radius,
        depth: Math.random() ** 0.58,
        phase: Math.random() * Math.PI * 2,
        seed: Math.random() * 1000,
        colorIndex: index % 2,
        size: lerp(0.55, 1.4, Math.random() ** 0.72)
      };
    });

    shapeTargets = Array.from({ length: SHAPE_COUNT }, (_, shapeIndex) =>
      normalizeShape(
        particles.map((particle) => deformPoint(shapeIndex, particle))
      )
    );
    initializeShapeSequence();
  }

  function cloudPosition(index, time, morph) {
    const particle = particles[index];
    const point = catmullRom(
      shapeTargets[shapeIndices.previous][index],
      shapeTargets[shapeIndices.current][index],
      shapeTargets[shapeIndices.next][index],
      shapeTargets[shapeIndices.following][index],
      morph
    );
    const boundedX = clamp(point.x, -1.08, 1.08);
    const boundedY = clamp(point.y, -1.08, 1.08);
    const centerCohesion = 1 - smoothstep(0.06, 0.32, Math.abs(boundedX));
    const cohesiveX = boundedX * (1 - centerCohesion * 0.18);
    const breathX =
      1 +
      Math.sin(time * 0.54 + 0.35) * 0.028 +
      Math.sin(time * 0.24 + 1.8) * 0.012;
    const breathY =
      1 +
      Math.cos(time * 0.47 + 0.8) * 0.032 +
      Math.sin(time * 0.29 + 2.4) * 0.01;
    const rotation =
      Math.sin(time * 0.19) * 0.045 +
      Math.sin(time * 0.089 + 1.2) * 0.022;
    const rotated = rotatePoint(cohesiveX * breathX, boundedY * breathY, rotation);
    const flowX =
      Math.sin(rotated.y * 3.1 + time * 0.39 + particle.phase) * 0.022;
    const flowY =
      Math.cos(rotated.x * 2.7 - time * 0.34 + particle.phase * 0.73) * 0.02;
    const scale = Math.min(width * 0.4, height * 0.43);
    const centerX = width * 0.52;
    const centerY = height * 0.5;

    return {
      x: centerX + (rotated.x + flowX) * scale,
      y: centerY + (rotated.y + flowY) * scale
    };
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function applyField(position, field, coreRadius, fieldRadius, push, swirl) {
    if (field.presence <= 0.01) {
      return position;
    }

    const dx = position.x - field.x;
    const dy = position.y - field.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 0.01 || distance > fieldRadius) {
      return position;
    }

    const directionX = dx / distance;
    const directionY = dy / distance;
    const core = 1 - smoothstep(0, coreRadius, distance);
    const influence = 1 - smoothstep(coreRadius, fieldRadius, distance);
    const ring =
      smoothstep(coreRadius * 0.45, coreRadius * 1.5, distance) *
      (1 - smoothstep(coreRadius * 1.3, fieldRadius, distance));
    const pushAmount = (core * push + influence * push * 0.32) * field.presence;
    const swirlAmount = ring * swirl * field.presence;

    return {
      x: position.x + directionX * pushAmount - directionY * swirlAmount,
      y: position.y + directionY * pushAmount + directionX * swirlAmount
    };
  }

  function resize() {
    const rect = space.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updatePointer(event) {
    const rect = space.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active =
      pointer.x >= 0 &&
      pointer.y >= 0 &&
      pointer.x <= rect.width &&
      pointer.y <= rect.height;
  }

  function updateTokenFieldFromViewport(clientX, clientY) {
    const rect = space.getBoundingClientRect();
    tokenField.x = clientX - rect.left;
    tokenField.y = clientY - rect.top;
    tokenField.active =
      tokenField.x >= 0 &&
      tokenField.y >= 0 &&
      tokenField.x <= rect.width &&
      tokenField.y <= rect.height;
  }

  function updateTokenFieldFromElement() {
    const tokenRect = token.getBoundingClientRect();
    updateTokenFieldFromViewport(
      tokenRect.left + tokenRect.width * 0.5,
      tokenRect.top + tokenRect.height * 0.5
    );
  }

  function render(now) {
    const time = now * 0.001;
    let elapsed = reducedMotion ? 0 : now - segmentStart;

    while (!reducedMotion && elapsed >= SEGMENT_DURATION) {
      advanceShapeSequence();
      segmentStart += SEGMENT_DURATION;
      elapsed -= SEGMENT_DURATION;
    }

    const rawMorph = reducedMotion ? 0 : clamp(elapsed / SEGMENT_DURATION, 0, 1);
    const morph = rawMorph * rawMorph * (3 - 2 * rawMorph);
    pointer.presence = lerp(pointer.presence, pointer.active ? 1 : 0, 0.11);
    tokenField.presence = lerp(tokenField.presence, tokenField.active ? 1 : 0, 0.1);

    if (token.classList.contains("is-dropped")) {
      updateTokenFieldFromElement();
    }

    ctx.clearRect(0, 0, width, height);

    for (const colorIndex of [0, 1]) {
      const color = COLORS[colorIndex];
      ctx.beginPath();

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];

        if (particle.colorIndex !== colorIndex) {
          continue;
        }

        let position = cloudPosition(index, time, morph);

        position = applyField(
          position,
          pointer,
          clamp(Math.min(width, height) * 0.055, 22, 44),
          clamp(Math.min(width, height) * 0.28, 105, 185),
          15,
          8
        );

        position = applyField(
          position,
          tokenField,
          clamp(Math.min(width, height) * 0.1, 44, 82),
          clamp(Math.min(width, height) * 0.34, 130, 230),
          22,
          16
        );

        const pulse =
          0.88 +
          Math.sin(time * 1.1 + particle.seed) * 0.07 +
          Math.sin(time * 0.43 + particle.seed * 0.31) * 0.06;
        const radius = particle.size * (0.78 + particle.depth * 0.72) * pulse;

        ctx.moveTo(position.x + radius, position.y);
        ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
      }

      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.68 + tokenField.presence * 0.08})`;
      ctx.fill();
    }

    requestAnimationFrame(render);
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
    updateTokenFieldFromViewport(event.clientX, event.clientY);
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
      tokenField.x = dropX;
      tokenField.y = dropY;
      tokenField.active = true;
      openModal();
    } else {
      token.classList.remove("is-dropped");
      token.style.left = "";
      token.style.top = "";
      tokenField.active = false;

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

  createParticles();
  resize();
  window.addEventListener("resize", resize, { passive: true });
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
  space.addEventListener("pointerenter", updatePointer, { passive: true });
  space.addEventListener("pointermove", updatePointer, { passive: true });
  space.addEventListener("pointerleave", () => {
    pointer.active = false;
  }, { passive: true });
  token.addEventListener("pointerdown", beginDrag);
  updateSubmitButton();
  requestAnimationFrame(render);
})();

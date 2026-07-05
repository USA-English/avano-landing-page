(() => {
  const canvas = document.getElementById("final-field");
  const space = document.querySelector(".final-particle-space");
  const token = document.querySelector(".opportunity-token");

  if (!canvas || !space || !token) {
    return;
  }

  const ctx = canvas.getContext("2d", { alpha: true });
  const PARTICLE_COUNT = 6500;
  const COLORS = [
    { r: 17, g: 50, b: 91 },
    { r: 179, g: 138, b: 73 }
  ];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let tokenHomeParent = token.parentElement;
  let tokenHomeNext = token.nextSibling;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

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

  function createParticles() {
    particles = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() ** 0.56;
      const depth = Math.random() ** 0.58;

      return {
        angle,
        radius,
        depth,
        seed: Math.random() * 1000,
        color: COLORS[index % 2],
        size: lerp(0.95, 2.35, Math.random() ** 0.72)
      };
    });
  }

  function cloudPosition(particle, time) {
    const centerX = width * 0.53;
    const centerY = height * 0.52;
    const radiusX = Math.min(width * 0.43, height * 0.58);
    const radiusY = Math.min(height * 0.42, width * 0.34);
    const angle = particle.angle + Math.sin(particle.seed * 0.37) * 0.12;
    const shell = particle.radius;
    const notch = Math.max(0, Math.cos(angle - 2.92));
    const shoulder = Math.max(0, Math.cos(angle - 0.68));
    const taper = 0.86 + shoulder * 0.16 - notch * 0.2;
    const xBase =
      Math.cos(angle) * radiusX * shell * taper -
      notch * radiusX * 0.12 * shell;
    const yBase =
      Math.sin(angle) * radiusY * shell * (0.9 + shoulder * 0.08) +
      Math.sin(angle * 2.0 + particle.seed * 0.01) * radiusY * 0.055 * shell;
    const driftAngle = angle + time * (0.1 + particle.depth * 0.06);
    const internalX =
      Math.cos(driftAngle * 1.7 + particle.seed) * (4 + particle.depth * 10) +
      Math.sin(time * 0.9 + particle.seed * 0.2) * (3 + particle.depth * 7);
    const internalY =
      Math.sin(driftAngle * 1.45 + particle.seed * 0.3) * (4 + particle.depth * 10) +
      Math.cos(time * 0.78 + particle.seed * 0.17) * (3 + particle.depth * 7);

    return {
      x: centerX + xBase + internalX,
      y: centerY + yBase + internalY
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
    pointer.presence = lerp(pointer.presence, pointer.active ? 1 : 0, 0.11);
    tokenField.presence = lerp(tokenField.presence, tokenField.active ? 1 : 0, 0.1);

    if (token.classList.contains("is-dropped")) {
      updateTokenFieldFromElement();
    }

    ctx.clearRect(0, 0, width, height);

    for (const particle of particles) {
      let position = cloudPosition(particle, time);

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
        0.84 +
        Math.sin(time * 1.1 + particle.seed) * 0.08 +
        Math.sin(time * 0.43 + particle.seed * 0.31) * 0.08;
      const alpha = clamp(0.34 + particle.depth * 0.42 + tokenField.presence * 0.08, 0.22, 0.86);
      const radius = particle.size * (0.78 + particle.depth * 0.8) * pulse;

      ctx.beginPath();
      ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${alpha})`;
      ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  function beginDrag(event) {
    const rect = token.getBoundingClientRect();

    tokenHomeParent = token.parentElement;
    tokenHomeNext = token.nextSibling;
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;

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
      space.appendChild(token);
      token.classList.add("is-dropped");
      token.style.left = `${dropX}px`;
      token.style.top = `${dropY}px`;
      tokenField.x = dropX;
      tokenField.y = dropY;
      tokenField.active = true;
    } else {
      token.classList.remove("is-dropped");
      token.style.left = "";
      token.style.top = "";
      tokenField.active = false;

      if (tokenHomeNext) {
        tokenHomeParent.insertBefore(token, tokenHomeNext);
      } else {
        tokenHomeParent.appendChild(token);
      }
    }
  }

  createParticles();
  resize();
  window.addEventListener("resize", resize, { passive: true });
  space.addEventListener("pointerenter", updatePointer, { passive: true });
  space.addEventListener("pointermove", updatePointer, { passive: true });
  space.addEventListener("pointerleave", () => {
    pointer.active = false;
  }, { passive: true });
  token.addEventListener("pointerdown", beginDrag);
  requestAnimationFrame(render);
})();

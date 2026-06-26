(() => {
  const LOGO_PATH = "./uploads/avano-animation-svg.svg";
  const canvas = document.getElementById("avano-field");
  const ctx = canvas.getContext("2d", { alpha: true });
  const logo = new Image();
  const particleCount = 11000;
  const background = { r: 248, g: 247, b: 244 };
  const brandColors = [
    { hex: "#11325b", r: 17, g: 50, b: 91 },
    { hex: "#b38a49", r: 179, g: 138, b: 73 }
  ];
  const particles = [];
  const pointer = { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, speed: 0, trail: [] };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let targets = [];
  let logoReady = false;
  let lastTime = performance.now();

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const smoothstep = (a, b, value) => {
    const t = clamp((value - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function colorDistance(pixel, color) {
    return (pixel.r - color.r) ** 2 + (pixel.g - color.g) ** 2 + (pixel.b - color.b) ** 2;
  }

  function nearestBrandColor(pixel) {
    return colorDistance(pixel, brandColors[0]) <= colorDistance(pixel, brandColors[1]) ? 0 : 1;
  }

  function isLogoPixel(pixel) {
    return pixel.a > 28 && colorDistance(pixel, background) > 620;
  }

  function createDriftParticles() {
    for (let i = 0; i < particleCount; i += 1) {
      if (!particles[i]) {
        particles[i] = {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          targetX: Math.random() * width,
          targetY: Math.random() * height,
          color: i % 2,
          seed: Math.random() * 1000,
          size: lerp(0.72, 1.85, Math.random()),
          delay: Math.random(),
          phase: Math.random()
        };
      }
    }
  }

  function pickTargets(pool) {
    const picked = [];
    const stride = Math.max(1, Math.floor(pool.length / particleCount));
    let cursor = Math.floor(Math.random() * stride);
    for (let i = 0; i < particleCount; i += 1) {
      cursor = (cursor + stride + Math.floor(Math.random() * 7)) % pool.length;
      picked.push(pool[cursor]);
    }
    return picked;
  }

  function assignTargets() {
    if (!targets.length) return;
    for (let i = 0; i < particleCount; i += 1) {
      const target = targets[i % targets.length];
      if (!particles[i]) createDriftParticles();
      particles[i].targetX = target.x;
      particles[i].targetY = target.y;
      particles[i].color = target.color;
    }
  }

  function sampleLogoTargets() {
    if (!width || !height || !logo.complete || !logo.naturalWidth) return;

    const sample = document.createElement("canvas");
    const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
    const aspect = logo.naturalWidth / logo.naturalHeight || 4;
    const logoWidth = Math.min(width * 0.78, 1080);
    const logoHeight = logoWidth / aspect;
    const left = (width - logoWidth) * 0.5;
    const top = height * 0.43 - logoHeight * 0.5;

    sample.width = Math.max(1, Math.ceil(logoWidth));
    sample.height = Math.max(1, Math.ceil(logoHeight));
    sampleCtx.clearRect(0, 0, sample.width, sample.height);
    sampleCtx.drawImage(logo, 0, 0, sample.width, sample.height);

    let imageData;
    try {
      imageData = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
    } catch (error) {
      console.error("AVANO logo could not be sampled. The particle field requires a same-origin SVG or image.", error);
      return;
    }

    const pool = [];
    for (let y = 0; y < sample.height; y += 1) {
      for (let x = 0; x < sample.width; x += 1) {
        const index = (y * sample.width + x) * 4;
        const pixel = { r: imageData[index], g: imageData[index + 1], b: imageData[index + 2], a: imageData[index + 3] };
        if (isLogoPixel(pixel)) {
          pool.push({
            x: left + x + (Math.random() - 0.5) * 0.45,
            y: top + y + (Math.random() - 0.5) * 0.45,
            color: nearestBrandColor(pixel)
          });
        }
      }
    }

    if (pool.length < 400) {
      console.error(`AVANO logo sampling found only ${pool.length} visible pixels. Check uploads/avano-animation-svg.svg.`);
      targets = [];
      logoReady = false;
      return;
    }

    targets = pickTargets(pool);
    logoReady = true;
    assignTargets();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createDriftParticles();
    sampleLogoTargets();
  }

  function curlField(x, y, time, seed) {
    const a = 0.0085;
    const b = 0.0105;
    const c = 0.0045;
    const t = time * 0.00042;
    const sx = x + seed * 19.7;
    const sy = y - seed * 11.3;
    const p1x = sx * a + t * 2.3;
    const p1y = sy * b - t * 1.8;
    const p2x = sx * c - t * 1.2 + seed;
    const p2y = sy * c + t * 2.6 - seed * 0.7;
    return {
      x: (-b * Math.sin(p1x) * Math.sin(p1y) + c * Math.cos(p2x) * Math.cos(p2y)) * 92,
      y: -(a * Math.cos(p1x) * Math.cos(p1y) - c * Math.sin(p2x) * Math.sin(p2y)) * 92
    };
  }

  function cycleForm(time, particle) {
    if (!logoReady) return 0;
    if (reducedMotion) return 1;
    const duration = 14500;
    const phase = ((time + particle.delay * 1200) % duration) / duration;
    return clamp(ease(smoothstep(0.14, 0.48, phase)) * (1 - ease(smoothstep(0.72, 0.98, phase))), 0, 1);
  }

  function pointerInfluence(particle) {
    let pushX = 0;
    let pushY = 0;
    let disrupt = 0;
    for (const point of pointer.trail) {
      const dx = particle.x - point.x;
      const dy = particle.y - point.y;
      const distSq = dx * dx + dy * dy;
      const energy = clamp(point.speed / 48, 0, 1);
      const radius = lerp(92, 230, energy) * point.life;
      if (distSq >= radius * radius || radius <= 0) continue;
      const dist = Math.sqrt(distSq) || 1;
      const influence = smoothstep(radius, 0, dist) * point.life;
      const nx = dx / dist;
      const ny = dy / dist;
      const tangent = point.spin * influence * lerp(0.34, 2.2, energy);
      pushX += nx * influence * lerp(0.7, 3.1, energy) - ny * tangent + point.vx * influence * 0.014;
      pushY += ny * influence * lerp(0.7, 3.1, energy) + nx * tangent + point.vy * influence * 0.014;
      disrupt = Math.max(disrupt, influence * lerp(0.42, 0.88, energy));
    }
    return { pushX, pushY, disrupt };
  }

  function updateTrail(dt) {
    for (let i = pointer.trail.length - 1; i >= 0; i -= 1) {
      pointer.trail[i].life -= dt * 1.55;
      if (pointer.trail[i].life <= 0) pointer.trail.splice(i, 1);
    }
  }

  function addPointerEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.px = pointer.x || event.clientX - rect.left;
    pointer.py = pointer.y || event.clientY - rect.top;
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.vx = pointer.x - pointer.px;
    pointer.vy = pointer.y - pointer.py;
    pointer.speed = Math.hypot(pointer.vx, pointer.vy);
    pointer.trail.push({
      x: pointer.x,
      y: pointer.y,
      vx: pointer.vx,
      vy: pointer.vy,
      speed: pointer.speed,
      spin: pointer.vx * pointer.vy >= 0 ? 1 : -1,
      life: 1
    });
    if (pointer.trail.length > 18) pointer.trail.shift();
  }

  function step(now) {
    const dt = clamp((now - lastTime) / 1000, 0.001, 0.033);
    lastTime = now;
    updateTrail(dt);
    ctx.clearRect(0, 0, width, height);

    for (const particle of particles) {
      const field = curlField(particle.x, particle.y, now, particle.seed);
      const mouse = pointerInfluence(particle);
      const form = clamp(cycleForm(now, particle) - mouse.disrupt, 0, 1);
      const drift = 1 - form;
      const targetDx = particle.targetX - particle.x;
      const targetDy = particle.targetY - particle.y;
      const attraction = reducedMotion ? 0.11 : lerp(0.006, 0.047, form);
      const turbulence = reducedMotion ? 0.02 : lerp(0.58, 0.06, form);
      const micro = Math.sin(now * 0.0015 + particle.seed) * 0.016 * form;

      particle.vx += field.x * turbulence * dt + targetDx * attraction + mouse.pushX + micro;
      particle.vy += field.y * turbulence * dt + targetDy * attraction + mouse.pushY - micro;
      particle.vx *= lerp(0.986, 0.82, form);
      particle.vy *= lerp(0.986, 0.82, form);
      particle.x += particle.vx * lerp(32, 54, drift) * dt;
      particle.y += particle.vy * lerp(32, 46, drift) * dt;

      if (particle.x < -30) particle.x = width + 30;
      if (particle.x > width + 30) particle.x = -30;
      if (particle.y < -30) particle.y = height + 30;
      if (particle.y > height + 30) particle.y = -30;

      ctx.globalAlpha = lerp(0.28, 0.92, form) * lerp(0.72, 1, particle.phase);
      ctx.fillStyle = brandColors[particle.color].hex;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(step);
  }

  function start() {
    resize();
    lastTime = performance.now();
    requestAnimationFrame(step);
  }

  logo.onload = start;
  logo.onerror = () => {
    console.error(`Missing AVANO logo target: ${LOGO_PATH}. Upload the exact SVG to uploads/avano-animation-svg.svg.`);
    start();
  };
  logo.src = LOGO_PATH;
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", addPointerEvent, { passive: true });
  window.addEventListener("pointerdown", addPointerEvent, { passive: true });
})();

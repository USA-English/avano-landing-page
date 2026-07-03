(() => {
  const LOGO_PATH = "./uploads/avano-animation-svg.svg";
  const PARTICLE_COUNT = 11000;
  const MAX_EXCLUSION_RECTS = 6;
  const BACKGROUND = { r: 248, g: 247, b: 244 };
  const BRAND_COLORS = [
    { hex: "#11325b", r: 17 / 255, g: 50 / 255, b: 91 / 255 },
    { hex: "#b38a49", r: 179 / 255, g: 138 / 255, b: 73 / 255 }
  ];
  const TIMING = {
    cloud: 10000,
    resolve: 500,
    formed: 5000,
    dissolve: 500,
    stagger: 80
  };
  TIMING.total = TIMING.cloud + TIMING.resolve + TIMING.formed + TIMING.dissolve;

  const VERTEX_SHADER = `
    precision highp float;

    attribute vec2 aCloud;
    attribute vec2 aTarget;
    attribute vec3 aColor;
    attribute vec4 aMeta;

    uniform vec2 uResolution;
    uniform vec2 uCloudCenter;
    uniform vec2 uPointer;
    uniform float uTime;
    uniform float uDpr;
    uniform float uPointerPresence;
    uniform float uPointerEnergy;
    uniform float uPointerCoreRadius;
    uniform float uPointerFieldRadius;
    uniform float uExclusionCount;
    uniform vec4 uExclusionRects[${MAX_EXCLUSION_RECTS}];
    uniform float uReducedMotion;

    varying vec3 vColor;
    varying float vAlpha;
    varying float vDepth;
    varying float vPulse;
    varying float vHole;
    varying float vSparkle;
    varying float vCloud;

    float easeCubic(float t) {
      return t < 0.5
        ? 4.0 * t * t * t
        : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
    }

    float cycleForm(float delay) {
      return 0.0;
    }

    mat2 rotate2d(float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return mat2(c, -s, s, c);
    }

    vec2 repelFromExclusionRects(vec2 position) {
      for (int i = 0; i < ${MAX_EXCLUSION_RECTS}; i += 1) {
        if (float(i) >= uExclusionCount) {
          continue;
        }

        vec4 rect = uExclusionRects[i];
        vec2 rectMin = rect.xy;
        vec2 rectMax = rect.xy + rect.zw;
        vec2 center = (rectMin + rectMax) * 0.5;
        vec2 halfSize = max((rectMax - rectMin) * 0.5, vec2(1.0));
        vec2 local = position - center;
        vec2 gap = abs(local) - halfSize;

        if (gap.x < 0.0 && gap.y < 0.0) {
          vec2 edgeDistance = halfSize - abs(local);
          vec2 axis = edgeDistance.x < edgeDistance.y
            ? vec2(sign(local.x), 0.0)
            : vec2(0.0, sign(local.y));

          if (length(axis) < 0.1) {
            axis = vec2(0.0, -1.0);
          }

          position += axis * (min(edgeDistance.x, edgeDistance.y) + 34.0);
        } else {
          vec2 closest = clamp(position, rectMin, rectMax);
          vec2 delta = position - closest;
          float distanceToRect = length(delta);
          float field = 1.0 - smoothstep(0.0, 58.0, distanceToRect);

          if (field > 0.0 && distanceToRect > 0.01) {
            position += normalize(delta) * field * 26.0;
          }
        }
      }

      return position;
    }

    void main() {
      float size = aMeta.x;
      float seed = aMeta.y;
      float depth = aMeta.z;
      float delay = aMeta.w;
      float form = cycleForm(delay);
      float cloudWeight = 1.0 - form;
      float travel = sin(form * 3.14159265);
      float time = uTime * 0.001;

      vec2 cloudOffset = aCloud - uCloudCenter;
      vec2 rotatedCloud = aCloud;
      vec2 cloudTangent = length(cloudOffset) > 0.01
        ? normalize(vec2(-cloudOffset.y, cloudOffset.x))
        : vec2(0.0, 0.0);
      float internalFlow =
        sin(time * 0.95 + seed * 0.47) * (2.4 + depth * 4.8) +
        sin(time * 1.35 + seed * 1.13) * (0.9 + depth * 1.8);

      vec2 cloudBreath = vec2(
        sin(time * 0.72 + seed * 1.73),
        cos(time * 0.66 + seed * 1.21)
      ) * (2.2 + depth * 6.4) * cloudWeight + cloudTangent * internalFlow * cloudWeight;

      vec2 logoBreath = vec2(
        sin(time * 0.24 + seed * 0.93),
        cos(time * 0.2 + seed * 1.31)
      ) * (0.85 + depth * 1.7) * form;

      vec2 arcLift = vec2(
        sin(seed * 0.17) * 18.0,
        -34.0 - depth * 26.0
      ) * travel;

      vec2 position = mix(rotatedCloud + cloudBreath, aTarget + logoBreath, form) + arcLift;

      vec2 pointerDelta = position - uPointer;
      float pointerDistance = length(pointerDelta);
      vec2 pointerDirection = pointerDistance > 0.01 ? pointerDelta / pointerDistance : vec2(0.0, 0.0);
      vec2 pointerTangent = vec2(-pointerDirection.y, pointerDirection.x);
      float pointerCoreRadius = uPointerCoreRadius * mix(0.32, 0.88, cloudWeight);
      float pointerFieldRadius = uPointerFieldRadius * mix(0.5, 1.4, cloudWeight);
      float pointerEffect = uPointerPresence * mix(0.12, 1.15, cloudWeight);
      float pointerHolePresence = uPointerPresence * smoothstep(0.15, 0.85, cloudWeight);
      float coreHole = smoothstep(pointerCoreRadius, 0.0, pointerDistance);
      float fieldWarp = smoothstep(pointerFieldRadius, 0.0, pointerDistance);
      float swirlRing =
        smoothstep(pointerCoreRadius * 0.45, pointerCoreRadius, pointerDistance) *
        (1.0 - smoothstep(pointerCoreRadius * 1.15, pointerFieldRadius, pointerDistance));
      float depthResponse = 0.72 + depth * 0.7;
      float persistentPush = coreHole * mix(12.0, 74.0, cloudWeight) + fieldWarp * mix(8.0, 52.0, cloudWeight);
      float movingSwirl = swirlRing * mix(5.0, 34.0 + uPointerEnergy * 38.0, cloudWeight);
      position += pointerDirection * persistentPush * pointerEffect * depthResponse;
      position += pointerTangent * movingSwirl * pointerEffect * (0.62 + depth * 0.72);

      float breathingPulse = 0.5 + 0.5 * sin(time * 0.85 + seed);
      float sparkle =
        (0.5 + 0.5 * sin(time * 1.45 + seed * 2.13)) *
        (0.5 + 0.5 * sin(time * 0.67 + seed * 0.71));
      sparkle = pow(sparkle, 2.4) * mix(0.42, 1.0, depth);
      float depthFade = mix(0.58, 1.0, depth);
      float stateAlpha = mix(0.76, 0.96, form);
      float travelAlpha = 1.0 + travel * 0.16;
      float cloudVisibility = 1.0 + cloudWeight * 0.42;
      float holeFade = clamp(coreHole * 0.7 + fieldWarp * 0.08, 0.0, 0.72) * pointerHolePresence;

      vec2 clip = (position / uResolution) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      gl_PointSize = size * uDpr * (1.32 + depth * 1.55 + breathingPulse * 0.2 + travel * 0.4 + cloudWeight * 0.22);

      vColor = aColor;
      vAlpha = depthFade * stateAlpha * travelAlpha * cloudVisibility * (1.0 + sparkle * 0.18) * (1.0 - holeFade * 0.72);
      vDepth = depth;
      vPulse = breathingPulse;
      vHole = holeFade;
      vSparkle = sparkle;
      vCloud = cloudWeight;
    }
  `;

  const FRAGMENT_SHADER = `
    precision mediump float;

    varying vec3 vColor;
    varying float vAlpha;
    varying float vDepth;
    varying float vPulse;
    varying float vHole;
    varying float vSparkle;
    varying float vCloud;

    void main() {
      vec2 point = gl_PointCoord - vec2(0.5);
      float distanceFromCenter = length(point);
      float softDisc = smoothstep(0.5, 0.17, distanceFromCenter);
      float core = smoothstep(0.22, 0.0, distanceFromCenter);
      float alpha = (softDisc * 0.68 + core * 0.28) * vAlpha * (1.0 - vHole * 0.32);

      if (alpha < 0.012) {
        discard;
      }

      vec3 color = vColor * (0.9 + vDepth * 0.24 + vPulse * 0.18 + vSparkle * 0.16 + vCloud * 0.28);
      gl_FragColor = vec4(color, alpha);
    }
  `;

  const canvas = document.getElementById("avano-field");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    depth: false,
    premultipliedAlpha: false
  });
  const logo = new Image();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const customCursor = document.querySelector(".custom-cursor");
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let logoReady = false;
  let animationStarted = false;
  let program = null;
  let particleSpecs = [];
  let cloudBuffer = null;
  let targetBuffer = null;
  let colorBuffer = null;
  let metaBuffer = null;
  let exclusionRectCount = 0;
  const exclusionRects = new Float32Array(MAX_EXCLUSION_RECTS * 4);

  const pointer = {
    x: -10000,
    y: -10000,
    previousX: -10000,
    previousY: -10000,
    active: false,
    presence: 0,
    energy: 0
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  function updateExclusionRects() {
    exclusionRects.fill(0);

    const protectedElements = Array.from(
      document.querySelectorAll(".hero__copy .reveal")
    ).slice(0, MAX_EXCLUSION_RECTS);
    const padX = clamp(width * 0.018, 18, 34);
    const padY = clamp(height * 0.018, 14, 30);

    exclusionRectCount = protectedElements.length;

    protectedElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const offset = index * 4;
      const left = clamp(rect.left - padX, 0, width);
      const top = clamp(rect.top - padY, 0, height);
      const right = clamp(rect.right + padX, 0, width);
      const bottom = clamp(rect.bottom + padY, 0, height);

      exclusionRects[offset] = left;
      exclusionRects[offset + 1] = top;
      exclusionRects[offset + 2] = Math.max(0, right - left);
      exclusionRects[offset + 3] = Math.max(0, bottom - top);
    });
  }

  function pushOutOfExclusionRects(x, y) {
    let nextX = x;
    let nextY = y;

    for (let i = 0; i < exclusionRectCount; i += 1) {
      const offset = i * 4;
      const left = exclusionRects[offset];
      const top = exclusionRects[offset + 1];
      const right = left + exclusionRects[offset + 2];
      const bottom = top + exclusionRects[offset + 3];

      if (nextX < left || nextX > right || nextY < top || nextY > bottom) {
        continue;
      }

      const distances = [
        { axis: "x", value: left - 18, distance: Math.abs(nextX - left) },
        { axis: "x", value: right + 18, distance: Math.abs(right - nextX) },
        { axis: "y", value: top - 18, distance: Math.abs(nextY - top) },
        { axis: "y", value: bottom + 18, distance: Math.abs(bottom - nextY) }
      ].sort((a, b) => a.distance - b.distance);

      if (distances[0].axis === "x") {
        nextX = distances[0].value;
      } else {
        nextY = distances[0].value;
      }
    }

    return {
      x: clamp(nextX, width * 0.025, width * 0.975),
      y: clamp(nextY, height * 0.025, height * 0.975)
    };
  }

  function colorDistance(pixel, color) {
    return (
      (pixel.r / 255 - color.r) ** 2 +
      (pixel.g / 255 - color.g) ** 2 +
      (pixel.b / 255 - color.b) ** 2
    );
  }

  function nearestBrandColor(pixel) {
    return colorDistance(pixel, BRAND_COLORS[0]) <=
      colorDistance(pixel, BRAND_COLORS[1])
      ? 0
      : 1;
  }

  function isLogoPixel(pixel) {
    return (
      pixel.a > 28 &&
      (pixel.r - BACKGROUND.r) ** 2 +
        (pixel.g - BACKGROUND.g) ** 2 +
        (pixel.b - BACKGROUND.b) ** 2 >
        620
    );
  }

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(error || "Unable to compile AVANO particle shader.");
    }

    return shader;
  }

  function createProgram() {
    const vertexShader = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const nextProgram = gl.createProgram();

    gl.attachShader(nextProgram, vertexShader);
    gl.attachShader(nextProgram, fragmentShader);
    gl.linkProgram(nextProgram);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(nextProgram);
      gl.deleteProgram(nextProgram);
      throw new Error(error || "Unable to link AVANO particle program.");
    }

    return nextProgram;
  }

  function createParticleSpecs() {
    if (particleSpecs.length) return;

    particleSpecs = Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.sqrt(Math.random()),
      skew: Math.random(),
      seed: Math.random() * 1000,
      size: lerp(1.15, 2.7, Math.random()),
      depth: Math.random() ** 0.55,
      delay: Math.random() * TIMING.stagger,
      color: index % 2
    }));
  }

  function buildCloudTargets() {
    const centerX = width * 0.735;
    const centerY = height * 0.5;
    const radiusX = Math.min(height * 0.41, 390);
    const radiusY = Math.min(width * 0.22, 360);
    const cloud = new Float32Array(PARTICLE_COUNT * 2);

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const spec = particleSpecs[i];
      const angle = spec.angle + Math.sin(spec.seed * 0.31) * 0.18;
      const shell = spec.radius ** 0.72;
      const rim = 0.74 + Math.sin(angle * 2.1 + spec.seed) * 0.1;
      const nose = Math.max(0, Math.cos(angle - 0.08));
      const tail = Math.max(0, Math.cos(angle - 3.72));
      const lowerWing = Math.max(0, Math.cos(angle - 2.24));
      const upperWing = Math.max(0, Math.cos(angle - 4.95));
      const xBase =
        Math.cos(angle) * radiusX * shell * rim +
        nose * radiusX * 0.18 * shell -
        tail * radiusX * 0.22 * (0.35 + shell);
      const yBase =
        Math.sin(angle) * radiusY * shell * (0.78 + nose * 0.18) +
        lowerWing * radiusY * 0.18 * shell -
        upperWing * radiusY * 0.12 * shell;
      const bend = ((xBase / radiusX) ** 2) * radiusY * 0.2 - radiusY * 0.07;
      const grain = (spec.skew - 0.5) * (8 + shell * 18);
      const rotatedX = -(yBase + bend);
      const rotatedY = xBase;
      const x = centerX + rotatedX + grain * 0.65;
      const y = centerY + rotatedY + Math.sin(spec.seed * 0.19) * 8 * shell;

      cloud[i * 2] = x;
      cloud[i * 2 + 1] = y;
    }

    return cloud;
  }

  function buildLogoPointTargets() {
    const targetData = new Float32Array(PARTICLE_COUNT * 2);
    const logoElement = document.querySelector(".hero__logo");
    const rect = logoElement?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width * 0.5 : width * 0.28;
    const centerY = rect ? rect.top + rect.height * 0.5 : height * 0.66;
    const coreRadius = clamp(Math.min(width, height) * 0.018, 10, 22);

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const spec = particleSpecs[i];
      const radius = coreRadius * Math.sqrt(spec.radius) * (0.25 + spec.depth * 0.75);
      const angle = spec.angle + spec.seed * 0.013;

      targetData[i * 2] = centerX + Math.cos(angle) * radius;
      targetData[i * 2 + 1] = centerY + Math.sin(angle) * radius;
    }

    return targetData;
  }

  function pickTargets(pool) {
    const picked = [];
    const stride = Math.max(1, Math.floor(pool.length / PARTICLE_COUNT));
    let cursor = Math.floor(Math.random() * stride);

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      cursor = (cursor + stride + Math.floor(Math.random() * 7)) % pool.length;
      picked.push(pool[cursor]);
    }

    return picked;
  }

  function sampleLogoTargets() {
    if (!width || !height || !logo.complete || !logo.naturalWidth) return [];

    const sample = document.createElement("canvas");
    const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
    const aspect = logo.naturalWidth / logo.naturalHeight || 4;
    const logoWidth = Math.min(width * 0.56, 760);
    const logoHeight = logoWidth / aspect;
    const marginX = clamp(width * 0.055, 42, 96);
    const marginY = clamp(height * 0.105, 52, 112);
    const left = marginX;
    const top = Math.max(height * 0.52, height - logoHeight - marginY);

    sample.width = Math.max(1, Math.ceil(logoWidth));
    sample.height = Math.max(1, Math.ceil(logoHeight));
    sampleCtx.clearRect(0, 0, sample.width, sample.height);
    sampleCtx.drawImage(logo, 0, 0, sample.width, sample.height);

    let imageData;
    try {
      imageData = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
    } catch (error) {
      console.error(
        "AVANO logo could not be sampled. The particle field requires a same-origin SVG or image.",
        error
      );
      return [];
    }

    const pool = [];
    for (let y = 0; y < sample.height; y += 1) {
      for (let x = 0; x < sample.width; x += 1) {
        const index = (y * sample.width + x) * 4;
        const pixel = {
          r: imageData[index],
          g: imageData[index + 1],
          b: imageData[index + 2],
          a: imageData[index + 3]
        };

        if (isLogoPixel(pixel)) {
          pool.push({
            x: left + x + (Math.random() - 0.5) * 0.25,
            y: top + y + (Math.random() - 0.5) * 0.25,
            color: nearestBrandColor(pixel)
          });
        }
      }
    }

    if (pool.length < 400) {
      console.error(
        `AVANO logo sampling found only ${pool.length} visible pixels. Check uploads/avano-animation-svg.svg.`
      );
      return [];
    }

    return pickTargets(pool);
  }

  function uploadAttribute(buffer, data, attribute, size) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, size, gl.FLOAT, false, 0, 0);
  }

  function rebuildField() {
    if (!program || !width || !height) return;

    createParticleSpecs();

    const cloudData = buildCloudTargets();
    const targetData = buildLogoPointTargets();
    const colorData = new Float32Array(PARTICLE_COUNT * 3);
    const metaData = new Float32Array(PARTICLE_COUNT * 4);

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const spec = particleSpecs[i];
      const colorIndex = spec.color;
      const color = BRAND_COLORS[colorIndex];

      colorData[i * 3] = color.r;
      colorData[i * 3 + 1] = color.g;
      colorData[i * 3 + 2] = color.b;
      metaData[i * 4] = spec.size;
      metaData[i * 4 + 1] = spec.seed;
      metaData[i * 4 + 2] = spec.depth;
      metaData[i * 4 + 3] = spec.delay;
    }

    gl.useProgram(program);
    uploadAttribute(cloudBuffer, cloudData, gl.getAttribLocation(program, "aCloud"), 2);
    uploadAttribute(targetBuffer, targetData, gl.getAttribLocation(program, "aTarget"), 2);
    uploadAttribute(colorBuffer, colorData, gl.getAttribLocation(program, "aColor"), 3);
    uploadAttribute(metaBuffer, metaData, gl.getAttribLocation(program, "aMeta"), 4);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
    exclusionRectCount = 0;
    rebuildField();
  }

  function render(now) {
    pointer.presence = lerp(pointer.presence, pointer.active ? 1 : 0, 0.12);
    pointer.energy *= 0.9;

    const pointerCoreRadius = clamp(Math.min(width, height) * 0.09, 70, 130);
    const pointerFieldRadius = clamp(Math.min(width, height) * 0.28, 220, 380);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(gl.getUniformLocation(program, "uResolution"), width, height);
    gl.uniform2f(gl.getUniformLocation(program, "uCloudCenter"), width * 0.735, height * 0.5);
    gl.uniform2f(gl.getUniformLocation(program, "uPointer"), pointer.x, pointer.y);
    gl.uniform1f(gl.getUniformLocation(program, "uTime"), now);
    gl.uniform1f(gl.getUniformLocation(program, "uDpr"), dpr);
    gl.uniform1f(gl.getUniformLocation(program, "uPointerPresence"), pointer.presence);
    gl.uniform1f(gl.getUniformLocation(program, "uPointerEnergy"), pointer.energy);
    gl.uniform1f(gl.getUniformLocation(program, "uPointerCoreRadius"), pointerCoreRadius);
    gl.uniform1f(gl.getUniformLocation(program, "uPointerFieldRadius"), pointerFieldRadius);
    gl.uniform1f(gl.getUniformLocation(program, "uExclusionCount"), exclusionRectCount);
    gl.uniform4fv(gl.getUniformLocation(program, "uExclusionRects[0]"), exclusionRects);
    gl.uniform1f(gl.getUniformLocation(program, "uReducedMotion"), reducedMotion ? 1 : 0);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);

    requestAnimationFrame(render);
  }

  function start() {
    if (animationStarted || !program) return;

    animationStarted = true;
    resize();
    requestAnimationFrame(render);
  }

  function trackPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hasPointer = pointer.x > -9000;
    const speed = hasPointer ? Math.hypot(x - pointer.previousX, y - pointer.previousY) : 0;

    pointer.previousX = hasPointer ? pointer.x : x;
    pointer.previousY = hasPointer ? pointer.y : y;
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    pointer.energy = Math.max(pointer.energy, clamp(speed / 80, 0, 1));
  }

  function activatePointer(event) {
    trackPointer(event);
    pointer.active = true;
  }

  function deactivatePointer() {
    pointer.active = false;
  }

  function moveCustomCursor(event) {
    if (!customCursor || !hasFinePointer) {
      return;
    }

    customCursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
    customCursor.classList.add("is-visible");
  }

  function hideCustomCursor() {
    if (customCursor) {
      customCursor.classList.remove("is-visible");
    }
  }

  if (customCursor && hasFinePointer) {
    window.addEventListener("pointermove", moveCustomCursor, { passive: true });
    window.addEventListener("pointerdown", moveCustomCursor, { passive: true });
    document.addEventListener("mouseleave", hideCustomCursor, { passive: true });
    window.addEventListener("blur", hideCustomCursor);
  }

  if (!gl) {
    console.error("WebGL is required for the AVANO particle field.");
    return;
  }

  try {
    program = createProgram();
    cloudBuffer = gl.createBuffer();
    targetBuffer = gl.createBuffer();
    colorBuffer = gl.createBuffer();
    metaBuffer = gl.createBuffer();

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  } catch (error) {
    console.error(error);
    return;
  }

  logo.onload = () => {
    logoReady = true;
    rebuildField();
    start();
  };
  logo.onerror = () => {
    console.error(
      `Missing AVANO logo target: ${LOGO_PATH}. Upload the exact SVG to uploads/avano-animation-svg.svg.`
    );
    start();
  };
  logo.src = LOGO_PATH;

  window.addEventListener("resize", resize, { passive: true });
  canvas.addEventListener("pointerenter", activatePointer, { passive: true });
  canvas.addEventListener("pointerleave", deactivatePointer, { passive: true });
  canvas.addEventListener("pointermove", trackPointer, { passive: true });
  canvas.addEventListener("pointerdown", trackPointer, { passive: true });
})();

(() => {
  const LOGO_PATH = "./uploads/avano-animation-svg.svg";
  const PARTICLE_COUNT = 11000;
  const BACKGROUND = { r: 248, g: 247, b: 244 };
  const BRAND_COLORS = [
    { hex: "#11325b", r: 17 / 255, g: 50 / 255, b: 91 / 255 },
    { hex: "#b38a49", r: 179 / 255, g: 138 / 255, b: 73 / 255 }
  ];
  const TIMING = {
    cloud: 5000,
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
    uniform float uReducedMotion;

    varying vec3 vColor;
    varying float vAlpha;
    varying float vDepth;
    varying float vPulse;
    varying float vHole;
    varying float vSparkle;

    float easeCubic(float t) {
      return t < 0.5
        ? 4.0 * t * t * t
        : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
    }

    float cycleForm(float delay) {
      if (uReducedMotion > 0.5) {
        return 1.0;
      }

      float phase = mod(uTime, ${TIMING.total.toFixed(1)});
      float resolveStart = ${TIMING.cloud.toFixed(1)};
      float formedStart = ${TIMING.cloud + TIMING.resolve}.0;
      float dissolveStart = ${TIMING.cloud + TIMING.resolve + TIMING.formed}.0;
      float transitionDuration = ${TIMING.resolve - TIMING.stagger}.0;

      if (phase < resolveStart) {
        return 0.0;
      }

      if (phase < formedStart) {
        return easeCubic(clamp((phase - resolveStart - delay) / transitionDuration, 0.0, 1.0));
      }

      if (phase < dissolveStart) {
        return 1.0;
      }

      return 1.0 - easeCubic(clamp((phase - dissolveStart - delay) / transitionDuration, 0.0, 1.0));
    }

    mat2 rotate2d(float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return mat2(c, -s, s, c);
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
      float cloudRotation = uTime * 0.000035 * cloudWeight;
      vec2 rotatedCloud = uCloudCenter + rotate2d(cloudRotation) * cloudOffset;

      vec2 cloudBreath = vec2(
        sin(time * 0.42 + seed * 1.73),
        cos(time * 0.36 + seed * 1.21)
      ) * (2.0 + depth * 7.0) * cloudWeight;

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
      float coreHole = smoothstep(uPointerCoreRadius, 0.0, pointerDistance);
      float fieldWarp = smoothstep(uPointerFieldRadius, 0.0, pointerDistance);
      float swirlRing =
        smoothstep(uPointerCoreRadius * 0.45, uPointerCoreRadius, pointerDistance) *
        (1.0 - smoothstep(uPointerCoreRadius * 1.15, uPointerFieldRadius, pointerDistance));
      float depthResponse = 0.72 + depth * 0.7;
      float persistentPush = coreHole * 90.0 + fieldWarp * 42.0;
      float movingSwirl = swirlRing * (28.0 + uPointerEnergy * 34.0);
      position += pointerDirection * persistentPush * uPointerPresence * depthResponse;
      position += pointerTangent * movingSwirl * uPointerPresence * (0.62 + depth * 0.72);

      float breathingPulse = 0.5 + 0.5 * sin(time * 0.85 + seed);
      float sparkle =
        (0.5 + 0.5 * sin(time * 1.45 + seed * 2.13)) *
        (0.5 + 0.5 * sin(time * 0.67 + seed * 0.71));
      sparkle = pow(sparkle, 2.4) * mix(0.42, 1.0, depth);
      float depthFade = mix(0.54, 1.0, depth);
      float stateAlpha = mix(0.46, 0.96, form);
      float travelAlpha = 1.0 + travel * 0.16;
      float holeFade = clamp(coreHole * 0.88 + fieldWarp * 0.2, 0.0, 0.92) * uPointerPresence;

      vec2 clip = (position / uResolution) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      gl_PointSize = size * uDpr * (1.15 + depth * 1.55 + breathingPulse * 0.2 + travel * 0.4);

      vColor = aColor;
      vAlpha = depthFade * stateAlpha * travelAlpha * (1.0 + sparkle * 0.18) * (1.0 - holeFade * 0.72);
      vDepth = depth;
      vPulse = breathingPulse;
      vHole = holeFade;
      vSparkle = sparkle;
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

    void main() {
      vec2 point = gl_PointCoord - vec2(0.5);
      float distanceFromCenter = length(point);
      float softDisc = smoothstep(0.5, 0.17, distanceFromCenter);
      float core = smoothstep(0.22, 0.0, distanceFromCenter);
      float alpha = (softDisc * 0.68 + core * 0.28) * vAlpha * (1.0 - vHole * 0.32);

      if (alpha < 0.012) {
        discard;
      }

      vec3 color = vColor * (0.84 + vDepth * 0.22 + vPulse * 0.18 + vSparkle * 0.16);
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
    const centerX = width * 0.72;
    const centerY = height * 0.29;
    const radiusX = Math.min(width * 0.29, 430);
    const radiusY = Math.min(height * 0.31, 300);
    const cloud = new Float32Array(PARTICLE_COUNT * 2);

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const spec = particleSpecs[i];
      const organicEdge =
        0.9 +
        Math.sin(spec.angle * 2.4 + spec.seed) * 0.16 +
        Math.sin(spec.angle * 5.1 - spec.seed * 0.37) * 0.12;
      const density = spec.radius * organicEdge;
      const upperLift = Math.sin(spec.angle - 0.65) > 0 ? 0.9 : 1.08;
      const skew = (spec.skew - 0.5) * radiusX * 0.14 * density;

      cloud[i * 2] = centerX + Math.cos(spec.angle) * radiusX * density + skew;
      cloud[i * 2 + 1] =
        centerY + Math.sin(spec.angle) * radiusY * density * upperLift;
    }

    return cloud;
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
    const sampledTargets = logoReady ? sampleLogoTargets() : [];
    const targetData = new Float32Array(PARTICLE_COUNT * 2);
    const colorData = new Float32Array(PARTICLE_COUNT * 3);
    const metaData = new Float32Array(PARTICLE_COUNT * 4);

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const spec = particleSpecs[i];
      const target = sampledTargets[i];
      const colorIndex = target ? target.color : spec.color;
      const color = BRAND_COLORS[colorIndex];

      targetData[i * 2] = target ? target.x : cloudData[i * 2];
      targetData[i * 2 + 1] = target ? target.y : cloudData[i * 2 + 1];
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
    rebuildField();
  }

  function render(now) {
    pointer.presence = lerp(pointer.presence, pointer.active ? 1 : 0, 0.12);
    pointer.energy *= 0.9;

    const pointerCoreRadius = clamp(Math.min(width, height) * 0.16, 120, 210);
    const pointerFieldRadius = clamp(Math.min(width, height) * 0.28, 220, 380);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(gl.getUniformLocation(program, "uResolution"), width, height);
    gl.uniform2f(gl.getUniformLocation(program, "uCloudCenter"), width * 0.72, height * 0.29);
    gl.uniform2f(gl.getUniformLocation(program, "uPointer"), pointer.x, pointer.y);
    gl.uniform1f(gl.getUniformLocation(program, "uTime"), now);
    gl.uniform1f(gl.getUniformLocation(program, "uDpr"), dpr);
    gl.uniform1f(gl.getUniformLocation(program, "uPointerPresence"), pointer.presence);
    gl.uniform1f(gl.getUniformLocation(program, "uPointerEnergy"), pointer.energy);
    gl.uniform1f(gl.getUniformLocation(program, "uPointerCoreRadius"), pointerCoreRadius);
    gl.uniform1f(gl.getUniformLocation(program, "uPointerFieldRadius"), pointerFieldRadius);
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

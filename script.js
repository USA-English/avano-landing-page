(() => {
  const PARTICLE_COUNT = 10000;
  const SHAPE_COUNT = 6;
  const SEGMENT_DURATION = 8600;
  const BRAND_COLORS = [
    { r: 17 / 255, g: 50 / 255, b: 91 / 255 },
    { r: 179 / 255, g: 138 / 255, b: 73 / 255 }
  ];

  const VERTEX_SHADER = `
    precision highp float;

    attribute vec2 aPrevious;
    attribute vec2 aCurrent;
    attribute vec2 aNext;
    attribute vec2 aFollowing;
    attribute vec3 aColor;
    attribute vec4 aMeta;

    uniform vec2 uResolution;
    uniform vec2 uCloudCenter;
    uniform vec2 uPointer;
    uniform float uCloudScale;
    uniform float uMorph;
    uniform float uTime;
    uniform float uDpr;
    uniform float uPointerPresence;
    uniform float uPointerEnergy;
    uniform float uReducedMotion;

    varying vec3 vColor;
    varying float vAlpha;
    varying float vDepth;
    varying float vPulse;
    varying float vInteraction;

    float hash21(vec2 point) {
      return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float valueNoise(vec2 point) {
      vec2 cell = floor(point);
      vec2 local = fract(point);
      vec2 smoothLocal = local * local * (3.0 - 2.0 * local);
      float a = hash21(cell);
      float b = hash21(cell + vec2(1.0, 0.0));
      float c = hash21(cell + vec2(0.0, 1.0));
      float d = hash21(cell + vec2(1.0, 1.0));

      return mix(mix(a, b, smoothLocal.x), mix(c, d, smoothLocal.x), smoothLocal.y);
    }

    vec2 catmullRom(vec2 previous, vec2 current, vec2 next, vec2 following, float t) {
      float t2 = t * t;
      float t3 = t2 * t;
      return 0.5 * (
        2.0 * current +
        (-previous + next) * t +
        (2.0 * previous - 5.0 * current + 4.0 * next - following) * t2 +
        (-previous + 3.0 * current - 3.0 * next + following) * t3
      );
    }

    mat2 rotate2d(float angle) {
      float sine = sin(angle);
      float cosine = cos(angle);
      return mat2(cosine, -sine, sine, cosine);
    }

    void main() {
      float size = aMeta.x;
      float seed = aMeta.y;
      float depth = aMeta.z;
      float phase = aMeta.w;
      float motion = 1.0 - uReducedMotion;
      float time = uTime * 0.001;
      float morph = mix(0.0, uMorph, motion);

      vec2 organicPoint = catmullRom(
        aPrevious,
        aCurrent,
        aNext,
        aFollowing,
        morph
      );
      organicPoint = clamp(organicPoint, vec2(-1.08), vec2(1.08));
      float centralCohesion = 1.0 - smoothstep(0.06, 0.32, abs(organicPoint.x));
      organicPoint.x *= 1.0 - centralCohesion * 0.18;

      float breathX = 1.0 + motion * (
        sin(time * 0.54 + 0.35) * 0.028 +
        sin(time * 0.24 + 1.8) * 0.012
      );
      float breathY = 1.0 + motion * (
        cos(time * 0.47 + 0.8) * 0.032 +
        sin(time * 0.29 + 2.4) * 0.01
      );
      organicPoint *= vec2(breathX, breathY);

      float bodyRotation = motion * (
        sin(time * 0.19) * 0.045 +
        sin(time * 0.089 + 1.2) * 0.022
      );
      organicPoint = rotate2d(bodyRotation) * organicPoint;

      vec2 flowCoordinate = organicPoint * 1.65 + vec2(time * 0.069, -time * 0.054);
      float epsilon = 0.075;
      float leftNoise = valueNoise(flowCoordinate - vec2(epsilon, 0.0));
      float rightNoise = valueNoise(flowCoordinate + vec2(epsilon, 0.0));
      float topNoise = valueNoise(flowCoordinate - vec2(0.0, epsilon));
      float bottomNoise = valueNoise(flowCoordinate + vec2(0.0, epsilon));
      vec2 curl = vec2(bottomNoise - topNoise, leftNoise - rightNoise);
      float curlLength = length(curl);
      curl = curlLength > 0.0001 ? curl / curlLength : vec2(0.0);

      float flowStrength = (0.028 + depth * 0.026) * motion;
      organicPoint += curl * flowStrength;
      organicPoint += vec2(
        sin(organicPoint.y * 3.1 + time * 0.39 + phase) * 0.014,
        cos(organicPoint.x * 2.7 - time * 0.34 + phase * 0.73) * 0.012
      ) * motion;

      vec2 position = uCloudCenter + organicPoint * uCloudScale;
      vec2 pointerDelta = position - uPointer;
      float pointerDistance = length(pointerDelta);
      vec2 pointerDirection = pointerDistance > 0.01
        ? pointerDelta / pointerDistance
        : vec2(0.0);
      vec2 pointerTangent = vec2(-pointerDirection.y, pointerDirection.x);
      float pointerCoreRadius = clamp(uCloudScale * 0.2, 58.0, 112.0);
      float pointerFieldRadius = clamp(uCloudScale * 0.66, 170.0, 330.0);
      float pointerCore = 1.0 - smoothstep(0.0, pointerCoreRadius, pointerDistance);
      float pointerField = 1.0 - smoothstep(pointerCoreRadius * 0.35, pointerFieldRadius, pointerDistance);
      float pointerRing =
        smoothstep(pointerCoreRadius * 0.4, pointerCoreRadius, pointerDistance) *
        (1.0 - smoothstep(pointerCoreRadius, pointerFieldRadius, pointerDistance));
      float pointerInfluence = uPointerPresence * motion * (0.72 + depth * 0.58);

      position += pointerDirection * (
        pointerCore * 62.0 +
        pointerField * 28.0
      ) * pointerInfluence;
      position += pointerTangent * pointerRing * (
        20.0 + uPointerEnergy * 54.0
      ) * pointerInfluence;

      float breathingPulse = 0.5 + 0.5 * sin(time * 0.95 + seed * 0.021);
      float densityWave = 0.5 + 0.5 * sin(
        organicPoint.x * 4.2 - organicPoint.y * 3.4 + time * 0.78 + phase
      );
      vec2 clip = (position / uResolution) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      gl_PointSize = size * uDpr * (
        1.22 + depth * 1.5 + breathingPulse * 0.18 + densityWave * 0.12
      );

      vColor = aColor;
      vAlpha = mix(0.58, 1.0, depth) * (0.9 + densityWave * 0.16);
      vDepth = depth;
      vPulse = breathingPulse;
      vInteraction = pointerCore * pointerInfluence;
    }
  `;

  const FRAGMENT_SHADER = `
    precision mediump float;

    varying vec3 vColor;
    varying float vAlpha;
    varying float vDepth;
    varying float vPulse;
    varying float vInteraction;

    void main() {
      vec2 point = gl_PointCoord - vec2(0.5);
      float distanceFromCenter = length(point);
      float softDisc = smoothstep(0.5, 0.16, distanceFromCenter);
      float core = smoothstep(0.22, 0.0, distanceFromCenter);
      float alpha = (softDisc * 0.7 + core * 0.26) * vAlpha;
      alpha *= 1.0 - vInteraction * 0.34;

      if (alpha < 0.012) {
        discard;
      }

      vec3 color = vColor * (0.9 + vDepth * 0.25 + vPulse * 0.14);
      gl_FragColor = vec4(color, alpha);
    }
  `;

  const canvas = document.getElementById("avano-field");
  const customCursor = document.querySelector(".custom-cursor");
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canvas) {
    return;
  }

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    depth: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance"
  });

  if (!gl) {
    console.error("WebGL is required for the AVANO organic particle field.");
    canvas.style.display = "none";
    return;
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function mulberry32(seed) {
    return function random() {
      let value = (seed += 0x6d2b79f5);
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getSessionSeed() {
    const fallback = (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;

    try {
      const stored = Number(sessionStorage.getItem("avano-organic-cloud-seed"));
      if (Number.isFinite(stored) && stored > 0) {
        return stored >>> 0;
      }
      sessionStorage.setItem("avano-organic-cloud-seed", String(fallback));
    } catch (error) {
      return fallback;
    }

    return fallback;
  }

  const sequenceRandom = mulberry32(getSessionSeed());
  const particleRandom = mulberry32(0xa6a90f2d);
  const particleSpecs = [];
  const shapeTargets = [];
  const shapeBuffers = [];
  const shapeAttributes = ["aPrevious", "aCurrent", "aNext", "aFollowing"];
  let shapeDeck = [];
  let shapeIndices = { previous: 0, current: 1, next: 2, following: 3 };
  let width = 1;
  let height = 1;
  let dpr = 1;
  let cloudCenterX = 1;
  let cloudCenterY = 1;
  let cloudScale = 1;
  let program = null;
  let colorBuffer = null;
  let metaBuffer = null;
  let uniforms = null;
  let segmentStart = performance.now();
  let lastMorph = 0;
  let animationFrame = 0;

  const pointer = {
    x: -10000,
    y: -10000,
    previousX: -10000,
    previousY: -10000,
    active: false,
    presence: 0,
    energy: 0
  };

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

  function createParticleSpecs() {
    if (particleSpecs.length) {
      return;
    }

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const angle = particleRandom() * Math.PI * 2;
      const radius = Math.sqrt(particleRandom());
      particleSpecs.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        angle,
        radius,
        size: 1.05 + particleRandom() * 1.7,
        seed: particleRandom() * 1000,
        depth: particleRandom() ** 0.58,
        phase: particleRandom() * Math.PI * 2,
        color: particleRandom() < 0.5 ? 0 : 1
      });
    }
  }

  function deformPoint(shapeIndex, spec) {
    const x = spec.x;
    const y = spec.y;
    let nextX = x;
    let nextY = y;
    let rotated;

    switch (shapeIndex) {
      case 0: {
        const verticalProgress = (y + 1) * 0.5;
        const widthProfile = 0.48 + verticalProgress * 0.38 +
          Math.sin(verticalProgress * Math.PI) * 0.08;
        nextX = x * widthProfile + (1 - y * y) * 0.1 - y * 0.045;
        nextY = y * 1.08 + x * x * 0.035;
        rotated = rotatePoint(nextX, nextY, -0.055);
        return rotated;
      }

      case 1: {
        nextX = x * 0.8 + (1 - y * y) * 0.19 + y * 0.08;
        nextY = y * 0.87;
        const lowerNotch = gaussian(x, y, -0.02, 0.58, 0.34, 0.31);
        const leftShoulder = gaussian(x, y, -0.62, 0.04, 0.38, 0.45);
        nextX += lowerNotch * 0.07 - leftShoulder * 0.15;
        nextY -= lowerNotch * 0.12 - leftShoulder * 0.04;
        rotated = rotatePoint(nextX, nextY, -0.13);
        return rotated;
      }

      case 2: {
        nextX = x * 0.81 + Math.sin((y + 0.22) * 2.35) * 0.22 + y * 0.08;
        nextY = y * 0.76 + Math.sin(x * 2.7) * 0.1;
        const upperFold = gaussian(x, y, -0.5, -0.35, 0.32, 0.34);
        const waist = gaussian(x, y, 0.02, 0.08, 0.34, 0.42);
        nextX += upperFold * 0.22 + waist * 0.035;
        nextY += upperFold * 0.08 + waist * 0.035;
        rotated = rotatePoint(nextX, nextY, 0.16);
        return rotated;
      }

      case 3: {
        nextX = x * 0.79 - y * 0.2 + (1 - y * y) * 0.18;
        nextY = y * 0.76 + Math.sin((x + 0.9) * 2.2) * 0.11;
        const curlPocket = gaussian(nextX, nextY, -0.45, 0.25, 0.31, 0.29);
        const foldedTip = gaussian(x, y, 0.58, -0.34, 0.3, 0.34);
        nextX += curlPocket * 0.34 - foldedTip * 0.12;
        nextY -= curlPocket * 0.18 + foldedTip * 0.06;
        rotated = rotatePoint(nextX, nextY, -0.2);
        return rotated;
      }

      case 4: {
        nextX = x * 0.84;
        nextY = y * 0.72;
        const centerBridge = gaussian(x, y, 0, -0.42, 0.34, 0.42);
        const horns = gaussian(Math.abs(x), y, 0.58, -0.42, 0.25, 0.42);
        const lowerBody = gaussian(x, y, 0, 0.62, 0.7, 0.3);
        nextX *= 1.0 - centerBridge * 0.08;
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
        rotated = rotatePoint(nextX, nextY, 0.25);
        return rotated;
      }
    }
  }

  function normalizeShape(points) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let index = 0; index < points.length; index += 2) {
      minX = Math.min(minX, points[index]);
      maxX = Math.max(maxX, points[index]);
      minY = Math.min(minY, points[index + 1]);
      maxY = Math.max(maxY, points[index + 1]);
    }

    const centerX = (minX + maxX) * 0.5;
    const centerY = (minY + maxY) * 0.5;
    const largestHalfExtent = Math.max((maxX - minX) * 0.5, (maxY - minY) * 0.5, 0.001);
    const scale = 0.96 / largestHalfExtent;

    for (let index = 0; index < points.length; index += 2) {
      points[index] = (points[index] - centerX) * scale;
      points[index + 1] = (points[index + 1] - centerY) * scale;
    }

    return points;
  }

  function buildShapeTargets() {
    createParticleSpecs();

    for (let shapeIndex = 0; shapeIndex < SHAPE_COUNT; shapeIndex += 1) {
      const target = new Float32Array(PARTICLE_COUNT * 2);

      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const spec = particleSpecs[index];
        const point = deformPoint(shapeIndex, spec);
        const texture = (spec.depth - 0.5) * 0.014;
        target[index * 2] = point.x + Math.cos(spec.phase) * texture;
        target[index * 2 + 1] = point.y + Math.sin(spec.phase) * texture;
      }

      shapeTargets.push(normalizeShape(target));
    }
  }

  function shuffle(values) {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(sequenceRandom() * (index + 1));
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
    const next = takeNextShape([previous, current]);
    const following = takeNextShape([previous, current, next]);
    shapeIndices = { previous, current, next, following };
  }

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || "Unable to compile AVANO organic cloud shader.");
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
      const message = gl.getProgramInfoLog(nextProgram);
      gl.deleteProgram(nextProgram);
      throw new Error(message || "Unable to link AVANO organic cloud program.");
    }

    return nextProgram;
  }

  function uploadAttribute(buffer, data, attributeName, size, usage = gl.STATIC_DRAW) {
    const attribute = gl.getAttribLocation(program, attributeName);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, size, gl.FLOAT, false, 0, 0);
  }

  function uploadShapeSequence() {
    const order = [
      shapeIndices.previous,
      shapeIndices.current,
      shapeIndices.next,
      shapeIndices.following
    ];

    for (let index = 0; index < shapeBuffers.length; index += 1) {
      uploadAttribute(
        shapeBuffers[index],
        shapeTargets[order[index]],
        shapeAttributes[index],
        2,
        gl.DYNAMIC_DRAW
      );
    }
  }

  function uploadParticleAppearance() {
    const colorData = new Float32Array(PARTICLE_COUNT * 3);
    const metaData = new Float32Array(PARTICLE_COUNT * 4);

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const spec = particleSpecs[index];
      const color = BRAND_COLORS[spec.color];
      colorData[index * 3] = color.r;
      colorData[index * 3 + 1] = color.g;
      colorData[index * 3 + 2] = color.b;
      metaData[index * 4] = spec.size;
      metaData[index * 4 + 1] = spec.seed;
      metaData[index * 4 + 2] = spec.depth;
      metaData[index * 4 + 3] = spec.phase;
    }

    uploadAttribute(colorBuffer, colorData, "aColor", 3);
    uploadAttribute(metaBuffer, metaData, "aMeta", 4);
  }

  function cacheUniforms() {
    uniforms = {
      resolution: gl.getUniformLocation(program, "uResolution"),
      cloudCenter: gl.getUniformLocation(program, "uCloudCenter"),
      pointer: gl.getUniformLocation(program, "uPointer"),
      cloudScale: gl.getUniformLocation(program, "uCloudScale"),
      morph: gl.getUniformLocation(program, "uMorph"),
      time: gl.getUniformLocation(program, "uTime"),
      dpr: gl.getUniformLocation(program, "uDpr"),
      pointerPresence: gl.getUniformLocation(program, "uPointerPresence"),
      pointerEnergy: gl.getUniformLocation(program, "uPointerEnergy"),
      reducedMotion: gl.getUniformLocation(program, "uReducedMotion")
    };
  }

  function updateCloudLayout() {
    const canvasRect = canvas.getBoundingClientRect();
    const heroCopy = document.querySelector(".hero__copy");
    const copyRect = heroCopy?.getBoundingClientRect();
    width = Math.max(1, canvasRect.width || window.innerWidth);
    height = Math.max(1, canvasRect.height || window.innerHeight);

    if (width >= 900) {
      const copyRight = copyRect ? copyRect.right - canvasRect.left : width * 0.5;
      const safeLeft = Math.max(width * 0.54, copyRight + 28);
      const safeRight = width * 0.965;
      const safeTop = height * 0.055;
      const safeBottom = height * 0.945;
      cloudCenterX = (safeLeft + safeRight) * 0.5;
      cloudCenterY = (safeTop + safeBottom) * 0.5;
      cloudScale = Math.max(120, Math.min(safeRight - safeLeft, safeBottom - safeTop) * 0.48);
    } else if (width >= 600) {
      cloudCenterX = width * 0.76;
      cloudCenterY = height * 0.48;
      cloudScale = Math.min(width * 0.25, height * 0.34);
    } else {
      cloudCenterX = width * 0.79;
      cloudCenterY = height * 0.47;
      cloudScale = Math.min(width * 0.225, height * 0.28);
    }
  }

  function resize() {
    updateCloudLayout();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);

    if (reducedMotion && program) {
      render(performance.now(), false);
    }
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
    uploadShapeSequence();
  }

  function render(now, scheduleNextFrame = true) {
    if (!program) {
      return;
    }

    pointer.presence += ((pointer.active ? 1 : 0) - pointer.presence) * 0.1;
    pointer.energy *= 0.91;

    if (!reducedMotion) {
      let elapsed = now - segmentStart;
      if (elapsed > SEGMENT_DURATION * 3) {
        segmentStart = now;
        elapsed = 0;
      }

      while (elapsed >= SEGMENT_DURATION) {
        advanceShapeSequence();
        segmentStart += SEGMENT_DURATION;
        elapsed -= SEGMENT_DURATION;
      }
      lastMorph = clamp(elapsed / SEGMENT_DURATION, 0, 1);
    } else {
      lastMorph = 0;
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform2f(uniforms.cloudCenter, cloudCenterX, cloudCenterY);
    gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
    gl.uniform1f(uniforms.cloudScale, cloudScale);
    gl.uniform1f(uniforms.morph, lastMorph);
    gl.uniform1f(uniforms.time, now);
    gl.uniform1f(uniforms.dpr, dpr);
    gl.uniform1f(uniforms.pointerPresence, pointer.presence);
    gl.uniform1f(uniforms.pointerEnergy, pointer.energy);
    gl.uniform1f(uniforms.reducedMotion, reducedMotion ? 1 : 0);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);

    if (scheduleNextFrame && !reducedMotion) {
      animationFrame = requestAnimationFrame(render);
    }
  }

  function trackPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const nextX = event.clientX - rect.left;
    const nextY = event.clientY - rect.top;
    const hasPointer = pointer.x > -9000;
    const speed = hasPointer
      ? Math.hypot(nextX - pointer.previousX, nextY - pointer.previousY)
      : 0;

    pointer.previousX = hasPointer ? pointer.x : nextX;
    pointer.previousY = hasPointer ? pointer.y : nextY;
    pointer.x = nextX;
    pointer.y = nextY;
    pointer.active = true;
    pointer.energy = Math.max(pointer.energy, clamp(speed / 72, 0, 1));
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
    customCursor?.classList.remove("is-visible");
  }

  try {
    program = createProgram();
    shapeBuffers.push(
      gl.createBuffer(),
      gl.createBuffer(),
      gl.createBuffer(),
      gl.createBuffer()
    );
    colorBuffer = gl.createBuffer();
    metaBuffer = gl.createBuffer();
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.useProgram(program);
    cacheUniforms();
    buildShapeTargets();
    initializeShapeSequence();
    uploadShapeSequence();
    uploadParticleAppearance();
  } catch (error) {
    console.error("AVANO organic particle field could not start.", error);
    canvas.style.display = "none";
    return;
  }

  if (customCursor && hasFinePointer) {
    window.addEventListener("pointermove", moveCustomCursor, { passive: true });
    window.addEventListener("pointerdown", moveCustomCursor, { passive: true });
    document.addEventListener("mouseleave", hideCustomCursor, { passive: true });
    window.addEventListener("blur", hideCustomCursor);
  }

  window.addEventListener("resize", resize, { passive: true });
  canvas.addEventListener("pointerenter", activatePointer, { passive: true });
  canvas.addEventListener("pointerleave", deactivatePointer, { passive: true });
  canvas.addEventListener("pointermove", trackPointer, { passive: true });
  canvas.addEventListener("pointerdown", trackPointer, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !reducedMotion) {
      segmentStart = performance.now() - lastMorph * SEGMENT_DURATION;
    }
  });
  window.addEventListener("pagehide", () => cancelAnimationFrame(animationFrame), { once: true });

  resize();
  segmentStart = performance.now();
  if (reducedMotion) {
    render(segmentStart, false);
  } else {
    animationFrame = requestAnimationFrame(render);
  }
})();


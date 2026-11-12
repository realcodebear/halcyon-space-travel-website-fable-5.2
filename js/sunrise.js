/* HALCYON — one orbital sunrise, drawn in a fragment shader.
   Night side with city lights and silent storms, the thin blue line of the
   atmosphere, the sun breaking over the limb, then full day.
   Driven by scroll progress; loaded only when the section is near. */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform float uAlt;      // sun altitude above the limb, in screen heights
uniform float uMotion;   // 0 = still frame (reduced motion), 1 = alive

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash31(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash31(i);
  float b = hash31(i + vec3(1.0, 0.0, 0.0));
  float c = hash31(i + vec3(0.0, 1.0, 0.0));
  float d = hash31(i + vec3(1.0, 1.0, 0.0));
  float e = hash31(i + vec3(0.0, 0.0, 1.0));
  float g = hash31(i + vec3(1.0, 0.0, 1.0));
  float h = hash31(i + vec3(0.0, 1.0, 1.0));
  float k = hash31(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
             mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.02 + vec3(13.1, 7.7, 3.3);
    a *= 0.5;
  }
  return s;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float aspect = uRes.x / uRes.y;
  float wide = smoothstep(0.8, 1.3, aspect);

  // The planet: a very large disc whose limb crosses the lower third.
  float R = 2.3;
  float limbTop = mix(-0.20, -0.17, wide);
  vec2 C = vec2(mix(0.0, 0.10 * aspect, wide), limbTop - R);
  float sx = mix(0.07, 0.21 * aspect, wide);

  vec2 q = uv - C;
  float r = length(q);
  float d = r - R;

  float limbY = C.y + sqrt(max(R * R - (sx - C.x) * (sx - C.x), 0.0));
  vec2 S = vec2(sx, limbY + uAlt);

  float tw = smoothstep(-0.32, 0.03, uAlt);
  float up = smoothstep(-0.014, 0.03, uAlt);
  float day = smoothstep(0.0, 0.40, uAlt);

  float ax = uv.x - sx;
  float spread = mix(0.12, 1.0, tw * tw * tw);
  float g = exp(-(ax * ax) / (2.0 * spread * spread));

  vec3 col = vec3(0.0);

  if (d > 0.0) {
    // ---- space ----
    vec2 sp = uv * 190.0;
    vec2 cell = floor(sp);
    vec2 f = fract(sp) - 0.5;
    float rnd = hash21(cell);
    vec2 off = vec2(hash21(cell + 3.1), hash21(cell + 7.7)) - 0.5;
    float star = step(0.987, rnd) * smoothstep(0.30, 0.0, length(f - off * 0.6));
    star *= 0.25 + 0.75 * hash21(cell + 11.3);
    star *= 0.82 + 0.18 * sin(uTime * 1.7 + rnd * 60.0) * uMotion;
    float starFade = (1.0 - 0.94 * smoothstep(-0.10, 0.10, uAlt)) * smoothstep(0.0, 0.07, d);
    col += vec3(0.80, 0.88, 1.0) * star * starFade * 0.8;

    // ---- atmosphere, seen edge on ----
    // Colour is layered by height: ember at the ground, then gold, white,
    // cyan and deep blue. The warm layers only exist near the sun.
    float h = d;
    vec3 deep = vec3(0.06, 0.22, 0.92);
    vec3 warmCol = mix(vec3(1.0, 0.30, 0.05), vec3(1.0, 0.74, 0.34), smoothstep(0.0, 0.0045, h));
    warmCol = mix(warmCol, vec3(1.0, 0.96, 0.88), smoothstep(0.003, 0.010, h));
    vec3 coolCol = mix(vec3(0.42, 0.74, 1.0), deep, smoothstep(0.004, 0.026, h));
    float warmth = g * (1.0 - smoothstep(0.006, 0.018, h));
    vec3 air = mix(coolCol, warmCol, warmth);
    float dens = exp(-h / 0.017) + 0.35 * exp(-h / 0.045);
    col += air * dens * tw * (0.30 + 1.9 * g) * (1.0 - 0.3 * day);
    // the hot point where the sun is about to appear
    float hot = exp(-(ax * ax) / (2.0 * 0.055 * 0.055)) * exp(-h / 0.011) * pow(tw, 5.0);
    col += vec3(1.0, 0.80, 0.48) * hot * 2.6 * (1.0 - day);
    // full daylight: an even blue line all the way round
    col += (deep * 0.9 * exp(-h / 0.026) + vec3(0.30, 0.72, 1.0) * 0.6 * exp(-h / 0.011)) * day;
    // airglow, the only light at night
    col += vec3(0.10, 0.42, 0.30) * exp(-abs(h - 0.011) / 0.0035) * 0.085 * (1.0 - tw);
    col += vec3(0.05, 0.12, 0.30) * exp(-h / 0.014) * 0.04 * (1.0 - tw);
  } else {
    // ---- the surface ----
    vec3 n = vec3(q / R, sqrt(max(1.0 - (r * r) / (R * R), 0.0)));

    // orbital motion: the ground slides toward us
    float th = 0.012 * uTime * uMotion + uAlt * 0.55 + 1.3;
    float cs = cos(th);
    float sn = sin(th);
    vec3 m = vec3(n.x, n.y * cs - n.z * sn, n.y * sn + n.z * cs);
    m = vec3(m.x * 0.94 - m.z * 0.34, m.y, m.x * 0.34 + m.z * 0.94);

    vec3 wp = m * 5.0;
    float warp = fbm(wp * 0.6 + 4.0);
    float cl = fbm(wp * 1.9 + vec3(warp * 1.8, 0.0, warp * 1.3));
    float fine = vnoise(wp * 9.0 + 2.0) * 0.6 + vnoise(wp * 19.0) * 0.4;
    float cloud = smoothstep(0.47, 0.72, cl + (fine - 0.5) * 0.14);
    float land = smoothstep(0.52, 0.58, fbm(m * 2.6 + 21.0));

    float nx0 = (sx - C.x) / R;
    vec3 n0 = vec3(nx0, sqrt(max(1.0 - nx0 * nx0, 0.0)), 0.0);
    float a = uAlt * 2.1;
    vec3 sdir = normalize(n0 * sin(a) + vec3(0.0, 0.0, -1.0) * cos(a));
    float ndl = dot(n, sdir);
    float lit = smoothstep(-0.03, 0.24, ndl);

    vec3 ocean = mix(vec3(0.008, 0.06, 0.20), vec3(0.025, 0.18, 0.50), pow(1.0 - n.z, 2.0));
    vec3 ground = mix(ocean, vec3(0.10, 0.085, 0.05), land * 0.85);
    vec3 dayCol = mix(ground, vec3(0.95, 0.96, 0.98), cloud);
    vec3 tint = mix(vec3(1.0, 0.60, 0.36), vec3(1.0), smoothstep(0.0, 0.32, lit));
    col += dayCol * tint * lit * 1.35;

    // sun glint on open water
    vec3 refl = reflect(-sdir, n);
    float spec = pow(max(refl.z, 0.0), 40.0) * (1.0 - cloud) * (1.0 - land) * up;
    col += vec3(1.0, 0.78, 0.5) * spec * 1.1;

    // the night side: cities, and storms that flicker without a sound
    float nightAmt = 1.0 - smoothstep(-0.10, 0.10, ndl);
    vec3 cg = m * 105.0;
    vec3 ci = floor(cg);
    vec3 cf = fract(cg) - 0.5;
    float cluster = smoothstep(0.50, 0.66, fbm(m * 6.0 + 40.0));
    float city = step(0.72, hash31(ci)) * exp(-dot(cf, cf) * 30.0) * land * cluster;
    col += vec3(1.0, 0.66, 0.32) * city * nightAmt * (1.0 - cloud * 0.85) * 0.9;
    col += vec3(0.0022, 0.003, 0.005) * cloud * nightAmt;

    vec3 lg = m * 6.0;
    vec3 li = floor(lg);
    vec3 lf = fract(lg) - 0.5;
    float tt = floor(uTime * 7.0);
    float flash = step(0.988, hash31(li + vec3(tt * 0.37, tt * 0.11, 0.0))) * uMotion;
    col += vec3(0.55, 0.65, 1.0) * flash * exp(-dot(lf, lf) * 9.0) * cloud * nightAmt * 0.35;

    // haze on the disc, and the warm spill under the sun
    float rim = pow(1.0 - n.z, 5.0);
    col += vec3(0.16, 0.42, 1.0) * rim * (0.9 * lit + 0.22 * tw * g);
    col += vec3(1.0, 0.42, 0.12) * exp(d / 0.010) * g * tw * (1.0 - day) * 0.55;
  }

  // ---- the sun ----
  float ds = length(uv - S);
  float outside = smoothstep(-0.002, 0.004, d);
  float core = smoothstep(0.020, 0.011, ds);
  float bloom = 0.0011 / (ds * ds + 0.0004) * exp(-ds / 0.10);
  float glow = exp(-ds / 0.026) * 2.2 + exp(-ds / 0.070) * 0.16;
  float ang = atan(uv.y - S.y, uv.x - S.x);
  float spikes = pow(abs(cos(ang * 3.0 + 0.4)), 420.0) * exp(-ds / 0.050) * 0.5
               + pow(abs(cos(ang * 7.0 + 1.1)), 60.0) * exp(-ds / 0.020) * 0.3;
  vec3 sunCol = mix(vec3(1.0, 0.70, 0.40), vec3(1.0, 0.94, 0.84), smoothstep(0.0, 0.22, uAlt));
  vec3 haloCol = mix(sunCol, vec3(1.0, 0.74, 0.44), smoothstep(0.02, 0.12, ds));
  col += up * (sunCol * core * 8.0 * outside + haloCol * (bloom + glow) * (0.22 + 0.78 * outside) + sunCol * spikes * outside);

  // ---- exposure, tone, grain ----
  float expo = mix(1.25, 0.92, day);
  col = 1.0 - exp(-col * expo);
  col = pow(col, vec3(0.4545));
  col *= 1.0 - 0.22 * dot(uv, uv);
  col += (hash21(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) / 150.0;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

/* Sun altitude along the scroll: night, first light, sunrise, day. */
const KEYS = [
  [0.0, -0.36],
  [0.22, -0.19],
  [0.5, -0.04],
  [0.57, -0.014],
  [0.8, 0.12],
  [0.92, 0.36],
  [1.0, 0.44],
];
const STILLS = [0.04, 0.42, 0.7, 1.0];

function altitudeAt(p, portrait) {
  let alt = KEYS[KEYS.length - 1][1];
  for (let i = 1; i < KEYS.length; i++) {
    if (p <= KEYS[i][0]) {
      const [p0, a0] = KEYS[i - 1];
      const [p1, a1] = KEYS[i];
      const t = (p - p0) / (p1 - p0);
      alt = a0 + (a1 - a0) * t;
      break;
    }
  }
  // On tall screens the sun stays lower, clear of the text above it.
  return portrait && alt > 0 ? alt * 0.42 : alt;
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createSunrise(canvas, { reducedMotion = false } = {}) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  let program = null;
  let uniforms = null;

  const setup = () => {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    uniforms = {
      res: gl.getUniformLocation(program, 'uRes'),
      time: gl.getUniformLocation(program, 'uTime'),
      alt: gl.getUniformLocation(program, 'uAlt'),
      motion: gl.getUniformLocation(program, 'uMotion'),
    };
    return true;
  };
  if (!setup()) return null;

  const MAX_PIXELS = 2.6e6;
  let quality = Math.min(window.devicePixelRatio || 1, 1.5);
  let target = reducedMotion ? STILLS[0] : 0;
  let current = target;
  let active = false;
  let raf = 0;
  let lost = false;
  let slowFrames = 0;
  let lastFrame = 0;
  const t0 = performance.now();

  const resize = () => {
    const cssW = canvas.clientWidth || 1;
    const cssH = canvas.clientHeight || 1;
    let scale = quality;
    if (cssW * cssH * scale * scale > MAX_PIXELS) scale = Math.sqrt(MAX_PIXELS / (cssW * cssH));
    const w = Math.max(2, Math.round(cssW * scale));
    const h = Math.max(2, Math.round(cssH * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };

  const draw = (now) => {
    if (lost) return;
    resize();
    const portrait = canvas.width < canvas.height;
    gl.uniform2f(uniforms.res, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, reducedMotion ? 12.0 : (now - t0) / 1000);
    gl.uniform1f(uniforms.alt, altitudeAt(current, portrait));
    gl.uniform1f(uniforms.motion, reducedMotion ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const loop = (now) => {
    raf = 0;
    if (!active || lost) return;
    current += (target - current) * 0.12;
    if (Math.abs(target - current) < 0.0004) current = target;
    draw(now);

    // Ease off the resolution on machines that cannot keep up.
    if (lastFrame) {
      const dt = now - lastFrame;
      slowFrames = dt > 30 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 24 && quality > 0.6) {
        quality = Math.max(0.6, quality * 0.8);
        slowFrames = 0;
      }
    }
    lastFrame = now;
    raf = requestAnimationFrame(loop);
  };

  const start = () => {
    if (reducedMotion) { draw(performance.now()); return; }
    lastFrame = 0;
    if (!raf) raf = requestAnimationFrame(loop);
  };

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
    raf = 0;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = !setup();
    if (!lost && active) start();
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { if (reducedMotion || !active) draw(performance.now()); }).observe(canvas);
  }

  draw(performance.now());

  return {
    setProgress(p) {
      const clamped = Math.min(1, Math.max(0, p));
      if (reducedMotion) {
        // No continuous motion: four stills that follow the four captions.
        const still = STILLS[Math.min(3, Math.floor(clamped * 3 + 0.5))];
        if (still !== current) {
          current = still;
          target = still;
          draw(performance.now());
        }
        return;
      }
      target = clamped;
    },
    setActive(value) {
      active = Boolean(value);
      if (active) start();
      else { cancelAnimationFrame(raf); raf = 0; }
    },
  };
}

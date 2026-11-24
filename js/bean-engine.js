/**
 * bean-engine.js
 */
(() => {
"use strict";

const CONFIG = Object.freeze({
  countDesktop: 60,
  countMobile: 30,
  mobileBreakpoint: 768,
  baseSize: 34,
  dprCap: 2,
  resizeDebounce: 150,
  pathSamples: 400,
  layers: Object.freeze([
    Object.freeze({ key: "far", depth: 0.3, size: 0.56, alpha: 0.3, blur: 2 }),
    Object.freeze({ key: "mid", depth: 0.6, size: 0.8, alpha: 0.48, blur: 0.6 }),
    Object.freeze({ key: "near", depth: 1, size: 1.06, alpha: 0.78, blur: 0 }),
  ]),
});

const MODES = new Set(["fall", "drift", "path", "orbit", "sparse", "settle"]);

const TAU = Math.PI * 2;

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

const smoothstep = (edge0, edge1, v) => {
  const x = clamp((v - edge0) / (edge1 - edge0 || 1), 0, 1);
  return x * x * (3 - 2 * x);
};

/** Frame-rate independent exponential approach. */
const damp = (current, target, lambda, dt) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

/* --------------------------------------------------------------------------
   Procedural bean sprite
   -------------------------------------------------------------------------- */
function drawBean(ctx, width, height) {
  const w = width;
  const h = height;

  // Body — ellipse with the required 1 : 1.5 ratio.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU);

  const fill = ctx.createLinearGradient(-w * 0.5, -h * 0.5, w * 0.55, h * 0.6);
  fill.addColorStop(0, "#6b4527");
  fill.addColorStop(0.42, "#5A3A22");
  fill.addColorStop(1, "#2C1B12");
  ctx.fillStyle = fill;
  ctx.fill();

  // Warm rim from the shoulder highlight.
  ctx.lineWidth = Math.max(0.8, w * 0.03);
  ctx.strokeStyle = "rgba(139, 94, 60, 0.4)";
  ctx.stroke();

  // Soft shoulder highlight.
  ctx.beginPath();
  ctx.ellipse(
    -w * 0.17,
    -h * 0.19,
    w * 0.17,
    h * 0.12,
    -0.55,
    0,
    TAU
  );
  ctx.fillStyle = "rgba(255, 233, 204, 0.08)";
  ctx.fill();

  // S-curve crease.
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.44);
  ctx.bezierCurveTo(w * 0.24, -h * 0.18, -w * 0.24, h * 0.18, 0, h * 0.44);
  ctx.lineWidth = Math.max(1.2, w * 0.085);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(18, 9, 5, 0.74)";
  ctx.stroke();

  // Thin light edge along the crease to keep it from reading as a hole.
  ctx.beginPath();
  ctx.moveTo(w * 0.075, -h * 0.4);
  ctx.bezierCurveTo(w * 0.3, -h * 0.16, -w * 0.16, h * 0.16, w * 0.075, h * 0.4);
  ctx.lineWidth = Math.max(0.6, w * 0.025);
  ctx.strokeStyle = "rgba(139, 94, 60, 0.36)";
  ctx.stroke();

  ctx.restore();
}

/* --------------------------------------------------------------------------
   Bean
   -------------------------------------------------------------------------- */
class Bean {
  constructor(index) {
    this.index = index;

    // A 3 / 4 / 3 split across far / mid / near per ten beans.
    const bucket = index % 10;
    this.layerIndex = bucket < 3 ? 0 : bucket < 7 ? 1 : 2;
    this.layer = CONFIG.layers[this.layerIndex];
    this.depth = this.layer.depth;

    // Public spec fields.
    this.size = CONFIG.baseSize * this.layer.size;
    this.x = 0;
    this.y = 0;
    this.rotation = Math.random() * TAU;
    this.rotSpeed = (Math.random() - 0.5) * 0.55 * (0.5 + this.depth);
    this.swayPhase = Math.random() * TAU;
    this.mode = "fall";

    // Motion internals.
    this.vx = 0;
    this.vy = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.homeX = 0;
    this.homeY = 0;
    this.landX = 0;
    this.landY = 0;
    this.landed = false;
    this.landTimer = 0;
    this.restDuration = 9 + Math.random() * 8;
    this.restRotation = (Math.random() - 0.5) * 0.7;
    this.inCup = index % 5 === 0;
    this.swaySpeed = 0.7 + Math.random() * 0.9;
    this.swayAmp = 8 + Math.random() * 26;
    this.driftSpeed = 0.4 + Math.random() * 0.8;
    this.driftAmp = 18 + Math.random() * 42;
    this.pathOffset = Math.random();
    this.pathStation = (index + 0.5) / CONFIG.countDesktop;
    this.pathLateral = (Math.random() - 0.5) * 64;
    this.orbitPhase = Math.random() * TAU;
    this.orbitSpeed = 0.55 + Math.random() * 0.8;
    this.orbitRadius = 0.5 + Math.random() * 0.7;
    this.pileJitterX = Math.random() - 0.5;
    this.pileJitterY = Math.random();
    this.bobPhase = Math.random() * TAU;

    // Visibility.
    this.enabled = true;
    this.alpha = 1;
    this.alphaTarget = 1;
  }

  /** Initial placement: above the fold so fall mode has something to do. */
  init(width, height) {
    this.homeX = Math.random() * width;
    this.homeY = Math.random() * height;
    this.x = this.homeX;
    this.y = -20 - Math.random() * height * 0.9;
    this.vx = 0;
    this.vy = 0;
    this.landed = false;
    this.landTimer = 0;
  }

  /** Keep relative composition on resize. */
  rescale(sx, sy) {
    this.x *= sx;
    this.y *= sy;
    this.homeX *= sx;
    this.homeY *= sy;
    this.landX *= sx;
    this.landY *= sy;
    this.targetX *= sx;
    this.targetY *= sy;
  }
}

/* --------------------------------------------------------------------------
   Engine
   -------------------------------------------------------------------------- */
class BeanEngine {
  /**
   * @param {object} [options]
   * @param {import("./scroll-director.js").ScrollDirector|null} [options.director]
   * @param {(() => void)|null} [options.onFrame]
   */
  constructor({ director = null, onFrame = null } = {}) {
    this.canvas = document.getElementById("bean-canvas");
    if (!this.canvas) throw new Error("BeanEngine: #bean-canvas not found");

    this.ctx = this.canvas.getContext("2d", { alpha: true });
    if (!this.ctx) throw new Error("BeanEngine: Canvas 2D unavailable");

    this.director = director;
    this.onFrame = onFrame;

    this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.motionQuery.matches;

    this.mode = "fall";
    this.time = 0;
    this.scrollY = window.scrollY || 0;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.activeCount = 0;
    this.hidden = Boolean(document.hidden);

    this.lastTime = 0;
    this.raf = 0;
    this.running = false;
    this.resizeTimer = 0;

    /** @type {Array<{canvas: HTMLCanvasElement, w: number, h: number, layer: object}>} */
    this.sprites = [];
    this.pathSamples = null;

    // Scratch scalars for path sampling (no per-frame allocations).
    this._sx = 0;
    this._sy = 0;
    this._nx = 0;
    this._ny = 0;

    // Cached element references.
    this.cupEl = document.getElementById("hero-cup");
    this.menuGrid = document.getElementById("menu-grid");
    this.processPath = document.getElementById("process-path");
    this.processSection = document.getElementById("process");
    this._lastCssProgress = -1;

    /** @type {Map<Element, object>} */
    this._rectCache = new Map();

    // Per-frame mode context.
    this._head = 0;
    this._orbitCX = 0;
    this._orbitCY = 0;
    this._orbitRX = 0;
    this._orbitRY = 0;
    this._orbitGather = 0;
    this._orbitValid = false;
    this._pileLift = 0;
    this._fallCupX = 0;

    // Pool: created once, sorted far → near for correct draw order.
    this.beans = Array.from({ length: CONFIG.countDesktop }, (_, i) => new Bean(i));
    this.beans.sort((a, b) => a.layerIndex - b.layerIndex || a.index - b.index);

    this._tick = this._tick.bind(this);
    this._onScroll = this._onScroll.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onMotionPreference = this._onMotionPreference.bind(this);

    this._bindEvents();
    this.resize(true);
    this.setMode("fall", true);

    if (this.reducedMotion) {
      this._renderStatic();
    } else {
      this._start();
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Setup                                                                  */
  /* ---------------------------------------------------------------------- */

  _bindEvents() {
    // Passive scroll: store scrollY only. Drawing happens in rAF.
    window.addEventListener("scroll", this._onScroll, { passive: true });
    window.addEventListener("resize", this._onResize, { passive: true });
    document.addEventListener("visibilitychange", this._onVisibility);

    if (this.motionQuery.addEventListener) {
      this.motionQuery.addEventListener("change", this._onMotionPreference);
    } else if (this.motionQuery.addListener) {
      this.motionQuery.addListener(this._onMotionPreference);
    }
  }

  _onScroll() {
    this.scrollY = window.scrollY || 0;
  }

  _onResize() {
    if (this.resizeTimer) window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.resizeTimer = 0;
      this.resize(false);
    }, CONFIG.resizeDebounce);
  }

  _onVisibility() {
    this.hidden = Boolean(document.hidden);
    if (this.hidden) {
      this._stop();
    } else if (!this.reducedMotion) {
      this._start();
    }
  }

  _onMotionPreference(event) {
    this.reducedMotion = event.matches;

    if (this.reducedMotion) {
      this._renderStatic();
      return;
    }

    this.beans.forEach((bean) => {
      bean.alpha = bean.enabled ? 1 : 0;
    });
    this.setMode(this.mode, true);
    this._start();
  }

  /* ---------------------------------------------------------------------- */
  /* Sizing & sprites                                                       */
  /* ---------------------------------------------------------------------- */

  resize(initial) {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const oldWidth = this.w || width;
    const oldHeight = this.h || height;

    this.w = width;
    this.h = height;
    this.scrollY = window.scrollY || 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap);

    const backingWidth = Math.round(width * this.dpr);
    const backingHeight = Math.round(height * this.dpr);

    if (this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
    if (this.canvas.height !== backingHeight) this.canvas.height = backingHeight;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const sx = width / oldWidth;
    const sy = height / oldHeight;

    if (initial) {
      this.beans.forEach((bean) => bean.init(width, height));
    } else {
      this.beans.forEach((bean) => bean.rescale(sx, sy));
    }

    this._updateActiveCount(initial);
    this._buildSprites();
    this._buildPathSamples();

    if (this.mode === "fall") this._assignFallTargets();
    if (this.reducedMotion) this._renderStatic();
  }

  _updateActiveCount(initial) {
    const mobile = window.innerWidth < CONFIG.mobileBreakpoint;
    this.activeCount = mobile ? CONFIG.countMobile : CONFIG.countDesktop;

    this.beans.forEach((bean, i) => {
      bean.enabled = i < this.activeCount;
      if (initial) bean.alpha = bean.enabled ? 1 : 0;
    });

    this._syncAlphaTargets();
  }

  _buildSprites() {
    const dpr = this.dpr;

    this.sprites = CONFIG.layers.map((layer) => {
      const bodyW = CONFIG.baseSize * layer.size;
      const bodyH = bodyW * 1.5;
      const pad = Math.ceil(Math.max(10, layer.blur * 2 + 7));
      const cssW = bodyW + pad * 2;
      const cssH = bodyH + pad * 2;

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(cssW * dpr));
      canvas.height = Math.max(1, Math.ceil(cssH * dpr));

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.scale(dpr, dpr);
      ctx.translate(pad + bodyW / 2, pad + bodyH / 2);

      if (layer.blur > 0) {
        try {
          ctx.filter = `blur(${layer.blur}px)`;
        } catch {
          /* Filter is an enhancement; gradient still reads well without it. */
        }
      }

      drawBean(ctx, bodyW, bodyH);

      return { canvas, w: cssW, h: cssH, layer };
    }).filter(Boolean);
  }

  _buildPathSamples() {
    this.pathSamples = null;
    const path = this.processPath;
    if (!path) return;

    let length = 0;
    try {
      length = path.getTotalLength();
    } catch {
      return;
    }
    if (!length || !Number.isFinite(length)) return;

    const ctm = path.getScreenCTM();
    if (!ctm) return;

    const count = CONFIG.pathSamples;
    const xs = new Float32Array(count);
    const ys = new Float32Array(count);
    const nx = new Float32Array(count);
    const ny = new Float32Array(count);
    const scrollAtMeasure = window.scrollY || 0;

    for (let i = 0; i < count; i += 1) {
      const point = path.getPointAtLength((length * i) / (count - 1));
      xs[i] = ctm.a * point.x + ctm.c * point.y + ctm.e;
      // getScreenCTM is viewport-relative; convert to document space so
      // scrolling does not require rebuilding the table.
      ys[i] = ctm.b * point.x + ctm.d * point.y + ctm.f + scrollAtMeasure;
    }

    for (let i = 0; i < count; i += 1) {
      const a = Math.max(0, i - 1);
      const b = Math.min(count - 1, i + 1);
      const dx = xs[b] - xs[a];
      const dy = ys[b] - ys[a];
      const len = Math.hypot(dx, dy) || 1;
      nx[i] = -dy / len;
      ny[i] = dx / len;
    }

    this.pathSamples = { xs, ys, nx, ny, count };
  }

  _updateCssProgress() {
    if (!this.processSection) return;

    const value = clamp(this.director ? this.director.processProgress : 0, 0, 1);

    // Avoid a style write on every frame when the value is stable.
    if (Math.abs(value - this._lastCssProgress) < 0.002) return;
    this._lastCssProgress = value;
    this.processSection.style.setProperty(
      "--process-progress",
      value.toFixed(4)
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Modes                                                                  */
  /* ---------------------------------------------------------------------- */

  setMode(mode, force = false) {
    if (!MODES.has(mode)) return;
    if (!force && mode === this.mode) return;

    this.mode = mode;

    this.beans.forEach((bean) => {
      bean.mode = mode;
      bean.landed = false;
      bean.landTimer = 0;
      if (mode === "fall" && bean.vy > 90) bean.vy = 90;
    });

    if (mode === "fall") this._assignFallTargets();
    this._syncAlphaTargets();
    document.documentElement.dataset.beanMode = mode;
  }

  _syncAlphaTargets() {
    const mode = this.mode;

    this.beans.forEach((bean) => {
      let visible = bean.enabled;

      // Keep content-dense sections airy: fewer beans, arranged with intent.
      if (mode === "sparse") {
        visible = visible && bean.layerIndex < 2 && bean.index % 3 === 0;
      } else if (mode === "path") {
        visible = visible && (bean.index % 5 === 0 || bean.index % 5 === 2);
      } else if (mode === "settle") {
        visible = visible && bean.index % 2 === 0;
      }

      bean.alphaTarget = visible ? 1 : 0;
    });
  }

  _assignFallTargets() {
    let cupX = this.w * 0.74;
    let cupY = this.h * 0.58;
    let cupW = Math.min(this.w * 0.3, 430);

    if (this.cupEl) {
      const rect = this.cupEl.getBoundingClientRect();
      if (rect.width > 0) {
        cupX = rect.left + rect.width / 2;
        cupY = rect.top + rect.height / 2;
        cupW = rect.width;
      }
    }

    this._fallCupX = cupX;

    this.beans.forEach((bean) => {
      if (bean.inCup) {
        const side = bean.index % 8 === 0 ? -1 : 1;
        bean.landX = cupX + side * (cupW * 0.44 + 12 + bean.pileJitterY * 34);
        bean.landY = clamp(
          cupY + (bean.pileJitterY * 0.55 - 0.15) * cupW * 0.5,
          this.h * 0.32,
          this.h - 22
        );
      } else {
        bean.landX = bean.homeX;
        bean.landY = this.h * (0.55 + bean.pileJitterY * 0.38);
      }
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Loop                                                                   */
  /* ---------------------------------------------------------------------- */

  _start() {
    if (this.running || this.reducedMotion || this.hidden) return;
    this.running = true;
    this.lastTime = performance.now();
    this.raf = window.requestAnimationFrame(this._tick);
  }

  _stop() {
    this.running = false;
    if (this.raf) {
      window.cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  _tick(now) {
    this.raf = 0;
    if (!this.running) return;

    const dt = clamp((now - this.lastTime) / 1000, 0, 0.05);
    this.lastTime = now;
    this.time += dt;

    this._update(dt);
    this._draw();
    this._updateCssProgress();

    if (this.onFrame) this.onFrame();
    this.raf = window.requestAnimationFrame(this._tick);
  }

  _update(dt) {
    const t = this.time;
    const w = this.w;
    const h = this.h;
    const mode = this.mode;

    // Prepare per-frame context for anchored modes.
    this._head = 0;
    if (mode === "path") {
      const progress = this.director ? this.director.processProgress : 0;
      this._head = clamp(progress, 0, 1);
    }

    this._orbitValid = false;
    if (mode === "orbit") {
      const rect = this._readRect(this.menuGrid);
      if (rect) {
        this._orbitCX = rect.left + rect.width / 2;
        this._orbitCY = rect.top + rect.height / 2;
        this._orbitRX = Math.max(160, rect.width * 0.51);
        this._orbitRY = Math.max(140, rect.height * 0.44);
        const progress = this.director ? this.director.menuProgress : 0;
        this._orbitGather = smoothstep(0.45, 0.92, progress);
        this._orbitValid = true;
      }
    }

    this._pileLift = 0;
    if (mode === "settle") {
      const progress = this.director ? this.director.contactProgress : 0;
      this._pileLift = progress * 84;
    }

    const alphaLambda = 5;

    for (let i = 0; i < this.beans.length; i += 1) {
      const bean = this.beans[i];

      bean.alpha += (bean.alphaTarget - bean.alpha) * (1 - Math.exp(-alphaLambda * dt));
      if (bean.alpha < 0.002 && bean.alphaTarget === 0) continue;

      switch (mode) {
        case "fall": {
          const gravity = 60 + 95 * bean.depth;
          bean.vy = Math.min(bean.vy + gravity * dt, 640);
          bean.vx += Math.sin(t * 1.4 + bean.swayPhase) * 13 * bean.depth * dt;
          bean.vx *= Math.max(0, 1 - 0.9 * dt);
          bean.x += bean.vx * dt;
          bean.y += bean.vy * dt;
          bean.rotation += bean.rotSpeed * dt * (0.9 + bean.depth * 0.6);

          if (bean.x < -90) bean.x = w + 90;
          else if (bean.x > w + 90) bean.x = -90;

          if (bean.y >= bean.landY) {
            if (bean.vy > 48) {
              bean.y = bean.landY;
              bean.vy = -bean.vy * 0.16;
            } else {
              bean.vy = 0;
              bean.y = bean.landY;
              bean.landed = true;
              bean.vx *= Math.max(0, 1 - 4 * dt);
              bean.x = damp(bean.x, bean.landX, 2.4, dt);
              bean.rotation = damp(bean.rotation, bean.restRotation, 2, dt);
              bean.landTimer += dt;

              if (bean.landTimer > bean.restDuration) {
                // Respawn above the fold and fade back in; the reset is hidden
                // by alpha so the position never visibly snaps.
                bean.x = bean.inCup
                  ? this._fallCupX + (Math.random() - 0.5) * 120
                  : Math.random() * w;
                bean.y = -30 - Math.random() * h * 0.55;
                bean.vy = 0;
                bean.vx = (Math.random() - 0.5) * 26;
                bean.alpha = 0;
                bean.landed = false;
                bean.landTimer = 0;
                bean.restDuration = 9 + Math.random() * 8;
                bean.restRotation = (Math.random() - 0.5) * 0.7;
              }
            }
          } else {
            bean.landed = false;
            bean.landTimer = 0;
          }
          break;
        }

        case "drift": {
          const scrollWave =
            Math.sin(this.scrollY * 0.002 + bean.swayPhase) * 46 * bean.depth;
          const tx =
            bean.homeX +
            Math.sin(t * 0.18 * bean.driftSpeed + bean.swayPhase) *
              bean.driftAmp *
              (0.6 + bean.depth * 0.7);
          const ty =
            bean.homeY +
            scrollWave +
            Math.cos(t * 0.14 * bean.driftSpeed + bean.swayPhase) *
              (8 + bean.depth * 10);
          const k = 1 - Math.exp(-dt * 1.1);

          bean.x += (tx - bean.x) * k;
          bean.y += (ty - bean.y) * k;
          bean.rotation += bean.rotSpeed * dt * 0.5;
          break;
        }

        case "path": {
          // Each bean owns a station on the line. As the traced portion of
          // the path reaches that station, the bean fades in. This keeps a
          // constant, readable density instead of a clump at the head.
          const revealed = this._head >= bean.pathStation - 0.012;
          const baseVisible =
            bean.enabled && (bean.index % 5 === 0 || bean.index % 5 === 2);
          bean.alphaTarget = baseVisible && revealed ? 1 : 0;

          const sampleT =
            bean.pathStation + Math.sin(t * 0.22 + bean.bobPhase) * 0.006;

          if (this._samplePath(sampleT)) {
            const tx = this._sx + this._nx * bean.pathLateral;
            const ty =
              this._sy +
              this._ny * bean.pathLateral +
              Math.sin(t * 0.45 + bean.bobPhase) * 3;
            const k = 1 - Math.exp(-dt * 2.4);

            bean.x += (tx - bean.x) * k;
            bean.y += (ty - bean.y) * k;
            bean.rotation += bean.rotSpeed * dt * 0.45;
          } else {
            // Layout not ready: keep the field drifting rather than freezing.
            bean.x = damp(bean.x, bean.homeX, 1, dt);
            bean.y = damp(bean.y, bean.homeY, 1, dt);
            bean.rotation += bean.rotSpeed * dt * 0.5;
          }
          break;
        }

        case "orbit": {
          if (this._orbitValid) {
            const gatherScale = 1 - 0.82 * this._orbitGather;
            const angle =
              t * (0.16 + bean.depth * 0.12) * bean.orbitSpeed + bean.orbitPhase;
            const radiusMul = (0.55 + bean.orbitRadius * 0.7) * gatherScale;
            const tx =
              this._orbitCX + Math.cos(angle) * this._orbitRX * radiusMul;
            const ty =
              this._orbitCY + Math.sin(angle) * this._orbitRY * radiusMul;
            const k = 1 - Math.exp(-dt * 2.5);

            bean.x += (tx - bean.x) * k;
            bean.y += (ty - bean.y) * k;
            bean.rotation += bean.rotSpeed * dt * (0.7 + this._orbitGather);
          } else {
            bean.x = damp(bean.x, bean.homeX, 1, dt);
            bean.y = damp(bean.y, bean.homeY, 1, dt);
            bean.rotation += bean.rotSpeed * dt * 0.4;
          }
          break;
        }

        case "sparse": {
          const tx =
            bean.homeX +
            Math.sin(t * 0.08 * bean.driftSpeed + bean.swayPhase) * 18;
          const ty =
            bean.homeY +
            Math.cos(t * 0.07 + bean.swayPhase) * 14 +
            Math.sin(this.scrollY * 0.0012 + bean.swayPhase) * 9;
          const k = 1 - Math.exp(-dt * 0.6);

          bean.x += (tx - bean.x) * k;
          bean.y += (ty - bean.y) * k;
          bean.rotation += bean.rotSpeed * dt * 0.22;
          break;
        }

        case "settle": {
          const spread = w / Math.max(this.activeCount, 1);
          const tx =
            (bean.index + 0.5) * spread +
            bean.pileJitterX * spread * 1.15 +
            Math.sin(t * 0.5 + bean.bobPhase) * 0.6;
          const row = bean.index % 7;
          const ty =
            h -
            12 -
            row * (9 + bean.depth * 9) -
            bean.pileJitterY * 16 -
            this._pileLift;
          const k = 1 - Math.exp(-dt * 2.6);

          bean.x += (tx - bean.x) * k;
          bean.y += (ty - bean.y) * k;
          bean.rotation += bean.rotSpeed * dt * 0.25;
          break;
        }

        default:
          break;
      }
    }
  }

  _readRect(element) {
    if (!element) return null;

    let entry = this._rectCache.get(element);
    if (!entry) {
      entry = { left: 0, top: 0, width: 0, height: 0, scrollY: -1, w: -1, h: -1 };
      this._rectCache.set(element, entry);
    }

    if (entry.scrollY === this.scrollY && entry.w === this.w && entry.h === this.h) {
      return entry;
    }

    const rect = element.getBoundingClientRect();
    entry.left = rect.left;
    entry.top = rect.top;
    entry.width = rect.width;
    entry.height = rect.height;
    entry.scrollY = this.scrollY;
    entry.w = this.w;
    entry.h = this.h;
    return entry;
  }

  /** Writes the sampled point to _sx/_sy/_nx/_ny. No allocations. */
  _samplePath(t) {
    const samples = this.pathSamples;
    if (!samples) return false;

    const p = clamp(t, 0, 1) * (samples.count - 1);
    const i0 = Math.floor(p);
    const i1 = Math.min(i0 + 1, samples.count - 1);
    const f = p - i0;
    const inv = 1 - f;

    this._sx = samples.xs[i0] * inv + samples.xs[i1] * f;
    this._sy =
      samples.ys[i0] * inv + samples.ys[i1] * f - this.scrollY;
    this._nx = samples.nx[i0] * inv + samples.nx[i1] * f;
    this._ny = samples.ny[i0] * inv + samples.ny[i1] * f;
    return true;
  }

  /* ---------------------------------------------------------------------- */
  /* Drawing                                                                */
  /* ---------------------------------------------------------------------- */

  _draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    for (let i = 0; i < this.beans.length; i += 1) {
      const bean = this.beans[i];
      const sprite = this.sprites[bean.layerIndex];
      if (!sprite) continue;

      const alpha = bean.alpha * sprite.layer.alpha;
      if (alpha <= 0.01) continue;

      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(bean.x, bean.y);
      ctx.rotate(bean.rotation);
      ctx.drawImage(
        sprite.canvas,
        -sprite.w / 2,
        -sprite.h / 2,
        sprite.w,
        sprite.h
      );
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  /** A handful of deliberately placed beans when motion is reduced. */
  _renderStatic() {
    this._stop();

    if (!this.w || !this.h) return;

    const ctx = this.ctx;
    const visible = Math.min(this.activeCount || 16, 14);
    const stride = this.beans.length / visible;
    const chosen = new Set();

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    // Walk the depth-sorted pool with a stride so the still field mixes far,
    // mid and near sprites instead of drawing only the faint far layer.
    this.beans.forEach((bean, i) => {
      bean.alpha = 0;
      bean.mode = "sparse";
    });

    for (let j = 0; j < visible; j += 1) {
      const bean = this.beans[Math.floor(j * stride)];
      if (!bean || chosen.has(bean)) continue;
      chosen.add(bean);

      // Golden-ratio scatter — balanced without running any animation.
      bean.x = ((j * 0.61803398875 + 0.09) % 1) * this.w;
      bean.y = (((j * 0.38196601125 + 0.14) % 1) * 0.86 + 0.06) * this.h;
      bean.rotation = (j * 1.73) % TAU;
      bean.alpha = 1;
    }

    this._draw();
  }

  /* ---------------------------------------------------------------------- */
  /* Cleanup                                                                */
  /* ---------------------------------------------------------------------- */

  destroy() {
    this._stop();
    if (this.resizeTimer) window.clearTimeout(this.resizeTimer);
    window.removeEventListener("scroll", this._onScroll);
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("visibilitychange", this._onVisibility);

    if (this.motionQuery.removeEventListener) {
      this.motionQuery.removeEventListener("change", this._onMotionPreference);
    } else if (this.motionQuery.removeListener) {
      this.motionQuery.removeListener(this._onMotionPreference);
    }

    this.ctx.clearRect(0, 0, this.w, this.h);
  }
}

window.Ember = window.Ember || {};
window.Ember.BeanEngine = BeanEngine;
})();

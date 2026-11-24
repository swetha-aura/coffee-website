/**
 * scroll-director.js
 * Owns scroll interpretation: active section → bean mode, nav section,
 * and normalised progress values consumed by the bean engine.
 *
 * The scroll listener is passive and only stores scrollY. Nothing is drawn
 * here; progress is computed lazily from cached section offsets.

 */
(() => {
"use strict";

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

class ScrollDirector {
  /**
   * @param {object} [options]
   * @param {(mode: string) => void} [options.onModeChange]
   * @param {(sectionId: string) => void} [options.onSectionChange]
   */
  constructor({ onModeChange = null, onSectionChange = null } = {}) {
    this.onModeChange = onModeChange;
    this.onSectionChange = onSectionChange;

    this.sections = Array.from(document.querySelectorAll("[data-bean-mode]"));
    this.processEl = document.getElementById("process");
    this.menuEl = document.getElementById("menu");
    this.contactEl = document.getElementById("contact");
    this.footerEl = document.getElementById("footer");

    this.scrollY = window.scrollY || 0;
    this.viewportH = window.innerHeight || 0;
    this.activeSection = null;
    this.activeMode = null;

    /** @type {Map<Element, {top: number, height: number}>} */
    this.offsets = new Map();

    this._resizeTimer = 0;
    this._ticking = false;

    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);

    this.measure();
    this._buildObserver();

    window.addEventListener("scroll", this._onScroll, { passive: true });
    window.addEventListener("resize", this._onResize, { passive: true });
    window.addEventListener("load", this._onResize, { passive: true });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this.measure()).catch(() => {});
    }

    // Start with the first section; observers refine this immediately.
    if (this.sections.length) this._setActive(this.sections[0]);
  }

  /* ---------------------------------------------------------------------- */
  /* Scroll & resize                                                        */
  /* ---------------------------------------------------------------------- */

  _onScroll() {
    this.scrollY = window.scrollY || 0;
  }

  _onResize() {
    if (this._resizeTimer) window.clearTimeout(this._resizeTimer);
    this._resizeTimer = window.setTimeout(() => {
      this._resizeTimer = 0;
      this.measure();
    }, 150);
  }

  /** Caches document-space tops/heights so progress needs only scrollY. */
  measure() {
    this.viewportH = window.innerHeight || 0;
    this.scrollY = window.scrollY || 0;

    this.sections.forEach((el) => {
      const rect = el.getBoundingClientRect();
      this.offsets.set(el, {
        top: rect.top + this.scrollY,
        height: rect.height,
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Active section                                                         */
  /* ---------------------------------------------------------------------- */

  _buildObserver() {
    if (!("IntersectionObserver" in window)) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) this._setActive(entry.target);
        });
      },
      // A thin band across the middle of the viewport.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    this.sections.forEach((section) => this.observer.observe(section));
  }

  _setActive(section) {
    if (!section) return;

    const mode = section.dataset.beanMode;
    if (mode && mode !== this.activeMode) {
      this.activeMode = mode;
      document.documentElement.dataset.beanMode = mode;
      if (this.onModeChange) this.onModeChange(mode);
    }

    if (section === this.activeSection) return;
    this.activeSection = section;

    const navId = section.dataset.navSection || section.id;
    if (this.onSectionChange) this.onSectionChange(navId);
  }

  /* ---------------------------------------------------------------------- */
  /* Progress                                                               */
  /* ---------------------------------------------------------------------- */

  /**
   * 0 when the section top reaches 72% of the viewport,
   * 1 when the section bottom passes 28% of the viewport.
   */
  _progress(el) {
    if (!el) return 0;
    const offset = this.offsets.get(el);
    if (!offset) return 0;

    const start = offset.top - this.viewportH * 0.72;
    const end = offset.top + offset.height - this.viewportH * 0.28;
    const span = Math.max(end - start, 1);

    return clamp01((this.scrollY - start) / span);
  }

  get processProgress() {
    return this._progress(this.processEl);
  }

  get menuProgress() {
    return this._progress(this.menuEl);
  }

  get contactProgress() {
    return this._progress(this.contactEl);
  }

  /* ---------------------------------------------------------------------- */
  /* Cleanup                                                                */
  /* ---------------------------------------------------------------------- */

  destroy() {
    if (this.observer) this.observer.disconnect();
    if (this._resizeTimer) window.clearTimeout(this._resizeTimer);
    window.removeEventListener("scroll", this._onScroll);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("load", this._onResize);
  }
}

window.Ember = window.Ember || {};
window.Ember.ScrollDirector = ScrollDirector;
})();

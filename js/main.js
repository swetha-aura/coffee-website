/**
 * main.js
 * Application entry point. Wires the scroll director to the bean engine,
 * then boots progressive UI and content reveals.

 */
(() => {
  "use strict";

  const Ember = window.Ember || {};
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // UI and reveals do not depend on the canvas, so they boot first and keep
  // working even if a browser cannot provide a 2D context.
  let ui = { setActiveNav() {} };
  try {
    ui = Ember.initUI ? Ember.initUI() : ui;
    ui = ui || { setActiveNav() {} };
  } catch (error) {
    console.warn("UI init failed:", error);
  }

  try {
    if (Ember.initReveal) Ember.initReveal({ reducedMotion });
  } catch (error) {
    console.warn("Reveal init failed:", error);
  }

  let engine = null;

  let director = null;
  try {
    if (Ember.ScrollDirector) {
      director = new Ember.ScrollDirector({
        onModeChange: (mode) => {
          if (engine) engine.setMode(mode);
        },
        onSectionChange: (sectionId) => ui.setActiveNav(sectionId),
      });
    }
  } catch (error) {
    console.warn("Scroll director unavailable:", error);
  }

  const processSection = document.getElementById("process");

  try {
    if (Ember.BeanEngine) {
      engine = new Ember.BeanEngine({ director });

      // The director may already be on a later section (reload / restored scroll).
      if (director && director.activeMode) engine.setMode(director.activeMode);

      // Paint the initial path progress for reduced-motion users, where the
      // engine deliberately does not start its rAF loop.
      if (processSection && director) {
        processSection.style.setProperty(
          "--process-progress",
          director.processProgress.toFixed(4)
        );
      }
    }
  } catch (error) {
    // Canvas is decorative. Never let it take the page down.
    console.warn("Bean animation unavailable:", error);
  }

  // Tells the inline guard in index.html that the scripts are alive.
  window.__emberReady = true;
  document.documentElement.classList.add("ember-ready");
})();

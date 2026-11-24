/**
 * reveal.js
 * Staggered, one-shot reveals for [data-reveal] elements.
 * Groups marked [data-reveal-group] receive an automatic 120ms stagger.
 * Only opacity and transform are touched (see animations.css).
 */
(() => {
"use strict";

const STAGGER_MS = 120;
const MAX_STAGGER_STEPS = 8;

function initReveal({ reducedMotion = false } = {}) {
  const items = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!items.length) return { destroy() {} };

  assignStagger();

  if (reducedMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return { destroy() {} };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  items.forEach((el) => observer.observe(el));

  return {
    destroy() {
      observer.disconnect();
    },
  };
}

/** Adds --reveal-delay to members of each group, in document order. */
function assignStagger() {
  const groups = document.querySelectorAll("[data-reveal-group]");

  groups.forEach((group) => {
    const members = Array.from(group.querySelectorAll("[data-reveal]")).filter(
      (el) => el.closest("[data-reveal-group]") === group
    );

    members.forEach((el, index) => {
      const steps = Math.min(index, MAX_STAGGER_STEPS);
      el.style.setProperty("--reveal-delay", `${steps * STAGGER_MS}ms`);
    });
  });
}

window.Ember = window.Ember || {};
window.Ember.initReveal = initReveal;
})();

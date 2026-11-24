/**
 * ui.js
 * Navigation, active-link state, testimonial slider, form validation,
 * and gallery parallax. No libraries.
 */
(() => {
"use strict";

function initUI() {
  const setActiveNav = initNavigation();
  initSlider();
  initForm();
  initParallax();

  return { setActiveNav };
}

/* --------------------------------------------------------------------------
   1. Header + mobile navigation
   -------------------------------------------------------------------------- */
function initNavigation() {
  const header = document.getElementById("site-header");
  const nav = document.getElementById("primary-nav");
  const toggle = document.querySelector(".nav-toggle");
  const links = Array.from(document.querySelectorAll("[data-nav-link]"));
  const mobileQuery = window.matchMedia("(max-width: 1023px)");

  let open = false;
  let lastFocused = null;
  let ticking = false;

  /* -- Solid header on scroll ------------------------------------------- */
  const syncHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      syncHeader();
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  syncHeader();

  /* -- Overlay menu ------------------------------------------------------ */
  if (!nav || !toggle) {
    return (id) => applyActiveLink(links, id);
  }

  const navFocusables = () =>
    Array.from(
      nav.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);

  const setOpen = (nextOpen, { restoreFocus = true } = {}) => {
    if (nextOpen === open) return;
    open = nextOpen;

    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");

    if (open) {
      lastFocused = document.activeElement;
      nav.removeAttribute("inert");
      const first = navFocusables()[0];
      if (first) first.focus({ preventScroll: true });
    } else {
      if (mobileQuery.matches) nav.setAttribute("inert", "");
      if (restoreFocus) {
        const target = lastFocused instanceof HTMLElement ? lastFocused : toggle;
        if (target && document.contains(target)) {
          target.focus({ preventScroll: true });
        }
      }
      lastFocused = null;
    }
  };

  const syncNavMode = () => {
    if (mobileQuery.matches) {
      if (!open) nav.setAttribute("inert", "");
      toggle.hidden = false;
    } else {
      setOpen(false, { restoreFocus: false });
      nav.removeAttribute("inert");
      toggle.hidden = true;
    }
  };

  toggle.addEventListener("click", () => setOpen(!open));

  document.addEventListener("keydown", (event) => {
    if (!open) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key !== "Tab") return;

    // Focus trap: [toggle, ...nav links] cycles in both directions.
    const items = [toggle, ...navFocusables()].filter(
      (el) => el && el.offsetParent !== null
    );
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !items.includes(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Anchors close the overlay after the click, allowing native smooth scroll.
  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    if (mobileQuery.matches) {
      window.setTimeout(() => setOpen(false, { restoreFocus: false }), 0);
    }
  });

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener("change", syncNavMode);
  } else if (mobileQuery.addListener) {
    mobileQuery.addListener(syncNavMode);
  }

  syncNavMode();

  return (id) => applyActiveLink(links, id);
}

function applyActiveLink(links, id) {
  const target = id ? `#${id}` : "";
  links.forEach((link) => {
    if (target && link.getAttribute("href") === target) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

/* --------------------------------------------------------------------------
   2. Testimonial slider
   -------------------------------------------------------------------------- */
function initSlider() {
  const root = document.querySelector("[data-slider]");
  if (!root) return;

  const track = root.querySelector("[data-slider-track]");
  const viewport = root.querySelector(".slider__viewport");
  const slides = track ? Array.from(track.children) : [];
  const previous = root.querySelector("[data-slider-prev]");
  const next = root.querySelector("[data-slider-next]");
  const dotsWrap = root.querySelector("[data-slider-dots]");
  const count = root.querySelector("[data-slider-count]");
  const status = root.querySelector("[data-slider-status]");

  if (!track || !slides.length || !viewport) return;

  let index = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerActive = false;

  const dots = slides.map((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "slider__dot";
    dot.setAttribute("aria-label", `Show testimonial ${i + 1}`);
    dot.addEventListener("click", () => go(i));
    if (dotsWrap) dotsWrap.appendChild(dot);
    return dot;
  });

  const pad = (value) => String(value).padStart(2, "0");

  function go(nextIndex, { announce = true } = {}) {
    index = (nextIndex + slides.length) % slides.length;

    track.style.transform = `translate3d(-${index * 100}%, 0, 0)`;

    slides.forEach((slide, i) => {
      const current = i === index;
      slide.setAttribute("aria-hidden", current ? "false" : "true");
      if (current) slide.removeAttribute("inert");
      else slide.setAttribute("inert", "");
    });

    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });

    if (count) count.textContent = `${pad(index + 1)} / ${pad(slides.length)}`;

    if (status && announce) {
      const person = slides[index].querySelector(".slider__person strong");
      const name = person ? person.textContent.trim() : "";
      status.textContent = `Testimonial ${index + 1} of ${slides.length}${
        name ? `: ${name}` : ""
      }`;
    }
  }

  if (previous) previous.addEventListener("click", () => go(index - 1));
  if (next) next.addEventListener("click", () => go(index + 1));

  viewport.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      go(0);
    } else if (event.key === "End") {
      event.preventDefault();
      go(slides.length - 1);
    }
  });

  // Pointer swipe. Vertical scrolling remains native (touch-action: pan-y).
  viewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerActive = true;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
  });

  viewport.addEventListener("pointerup", (event) => {
    if (!pointerActive) return;
    pointerActive = false;

    const dx = event.clientX - pointerStartX;
    const dy = event.clientY - pointerStartY;

    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      go(index + (dx < 0 ? 1 : -1));
    }
  });

  viewport.addEventListener("pointercancel", () => {
    pointerActive = false;
  });

  go(0, { announce: false });
}

/* --------------------------------------------------------------------------
   3. Contact form
   -------------------------------------------------------------------------- */
function initForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const status = document.getElementById("form-status");
  const submit = form.querySelector("[data-submit]");
  const submitLabel = form.querySelector("[data-submit-label]");

  const fields = ["name", "email", "message", "consent"]
    .map((name) => form.elements.namedItem(name))
    .filter(Boolean);

  const touched = new Set();
  let sending = false;
  let completing = false;

  const errors = {
    name: "Please tell us your name (at least 2 characters).",
    email: "Enter a valid email address, like you@example.com.",
    message: "A little more detail helps — at least 10 characters.",
    consent: "Please confirm we may reply to your note.",
  };

  const messageFor = (field) => {
    const value =
      field.type === "checkbox" ? field.checked : field.value.trim();

    if (!value && field.required) return errors[field.name] || "This field is required.";

    if (field.name === "name" && value.length < 2) return errors.name;
    if (field.name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return errors.email;
    }
    if (field.name === "message" && value.length < 10) return errors.message;

    return "";
  };

  const setError = (field, message) => {
    const error = form.querySelector(`[data-error-for="${field.name}"]`);

    if (message) {
      field.setAttribute("aria-invalid", "true");
      if (error) error.textContent = message;
    } else {
      field.removeAttribute("aria-invalid");
      if (error) error.textContent = "";
    }

    return !message;
  };

  const validate = (field) => setError(field, messageFor(field));

  fields.forEach((field) => {
    field.addEventListener("blur", () => {
      if (completing) return;
      touched.add(field.name);
      validate(field);
    });

    const liveEvent = field.type === "checkbox" ? "change" : "input";
    field.addEventListener(liveEvent, () => {
      if (touched.has(field.name)) validate(field);
      if (status && status.classList.contains("is-visible")) {
        status.classList.remove("is-visible");
        status.textContent = "";
      }
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (sending) return;

    fields.forEach((field) => touched.add(field.name));

    const invalid = fields.filter((field) => !validate(field));

    if (invalid.length) {
      const first = invalid[0];
      first.focus({ preventScroll: false });
      return;
    }

    sending = true;
    const fallbackLabel = submitLabel ? submitLabel.textContent : "";

    if (submit) {
      submit.dataset.state = "loading";
      submit.disabled = true;
      submit.setAttribute("aria-disabled", "true");
    }
    if (submitLabel) submitLabel.textContent = "Sending…";
    if (status) {
      status.classList.remove("is-visible");
      status.textContent = "";
    }

    window.setTimeout(() => {
      completing = true;
      form.reset();
      fields.forEach((field) => {
        field.removeAttribute("aria-invalid");
        const error = form.querySelector(`[data-error-for="${field.name}"]`);
        if (error) error.textContent = "";
      });
      touched.clear();

      if (submit) {
        delete submit.dataset.state;
        submit.disabled = false;
        submit.removeAttribute("aria-disabled");
      }
      if (submitLabel) submitLabel.textContent = fallbackLabel || "Send note";

      if (status) {
        status.textContent =
          "Thank you — your note is in. We’ll reply within one working day.";
        status.classList.add("is-visible");
        status.focus({ preventScroll: true });
      }

      completing = false;
      sending = false;
    }, 500);
  });
}

/* --------------------------------------------------------------------------
   4. Gallery parallax
   -------------------------------------------------------------------------- */
function initParallax() {
  const items = Array.from(document.querySelectorAll("[data-parallax]"));
  if (!items.length) return;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const layers = items.map((el) => ({
    el,
    speed: Number.parseFloat(el.dataset.parallax) || 0,
  }));

  let frame = 0;
  let enabled = !motionQuery.matches;

  const clear = () => {
    layers.forEach(({ el }) => el.style.removeProperty("--parallax-y"));
  };

  const update = () => {
    frame = 0;
    if (!enabled) return;

    const viewportH = window.innerHeight;

    layers.forEach(({ el, speed }) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -160 || rect.top > viewportH + 160) return;

      const distance = rect.top + rect.height / 2 - viewportH / 2;
      const offset = Math.max(-16, Math.min(16, distance * speed));
      el.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
    });
  };

  const request = () => {
    if (!enabled || frame) return;
    frame = window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  window.addEventListener("load", request, { passive: true });

  const onMotionChange = (event) => {
    enabled = !event.matches;
    if (enabled) request();
    else {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      clear();
    }
  };

  if (motionQuery.addEventListener) {
    motionQuery.addEventListener("change", onMotionChange);
  } else if (motionQuery.addListener) {
    motionQuery.addListener(onMotionChange);
  }

  update();
}

window.Ember = window.Ember || {};
window.Ember.initUI = initUI;
})();

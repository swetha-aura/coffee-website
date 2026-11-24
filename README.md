# Ember & Bean

A production-style coffee portfolio landing page: one continuous scroll, one
canvas, sixty procedural coffee beans, and six behaviours that carry the bean
field from the first fold to the last.

No frameworks, no build step, no npm packages. HTML5, CSS3 and vanilla JavaScript.

---

## Quick start

Open `index.html` and you're done — double-click it or drag it into any
browser. The scripts are classic `defer` scripts, so everything (the bean
field, mobile menu, slider and form) runs identically from disk or over HTTP.

Serving over HTTP is still the recommended way to share the page, and every
static host works as-is:

```bash
# Python 3
python -m http.server 8000
```

```bash
# Node.js
npx serve .
```

Windows without Python or Node — paste this at a PowerShell prompt in the
project folder (one line):


Then open <http://localhost:8000/>. Stop the PowerShell server with `Ctrl+C`.

There is no install, compile or watch step. Edit a file and refresh.

---

## Project map

```
coffee-portfolio/
├── index.html               Semantic page: 7 sections + footer, 8 images
├── ASSETS_LICENSE.md        Per-asset source, licence and usage ledger
├── README.md                This file
├── css/
│   ├── base.css             Tokens, reset, typography, canvas layer, a11y
│   ├── layout.css           Section surfaces, grids and per-section composition
│   ├── components.css       Header/nav, buttons, cards, form, slider
│   └── animations.css       Reveals, steam, reduced-motion overrides
├── js/
│   ├── main.js              Entry point; wires director → engine → UI
│   ├── bean-engine.js       Canvas, sprites, six bean modes, rAF loop
│   ├── scroll-director.js   Scroll state, active section/mode, progress getters
│   ├── reveal.js            IntersectionObserver reveal stagger
│   └── ui.js                Nav, mobile panel, slider, form, gallery parallax
└── assets/
    ├── img/                 8 WebP + JPG pairs from Pexels
    ├── svg/                 Original icons, favicon, steam, process path
    └── fonts/               Reserved for self-hosted WOFF2 (empty by default)
```

---

## How it hangs together

1. `scroll-director.js` observes every `[data-bean-mode]` section with an
   `IntersectionObserver`. It publishes the active mode, the active nav section
   and three lazily-computed progress values (`processProgress`,
   `menuProgress`, `contactProgress`).
2. `bean-engine.js` owns a single fixed canvas and one pool of 60 beans. It
   pre-renders three depth sprites (far / mid / near) and runs one
   `requestAnimationFrame` loop. Its scroll listener is passive and only stores
   `scrollY`.
3. `ui.js` and `reveal.js` are independent of the canvas. If a browser cannot
   provide a 2D context, the page still works and the console gets a warning,
   not an exception.
4. The canvas is `z-index: 1`; content wrappers are `z-index: 2`. Sections
   deliberately do not create stacking contexts, so beans pass between section
   surfaces and content.

### Mode map

| Section | Surface | Mode | Behaviour |
| --- | --- | --- | --- |
| Hero | Espresso | `fall` | Gravity + sway, beans land around the cup and respawn |
| Story | Cream | `drift` | Slow horizontal float, scroll parallax |
| Process | Roast | `path` | Beans ride the sampled SVG path as the section scrolls |
| Menu | Cream | `orbit` | Elliptical ring around the card grid, gathers at the end |
| Gallery | Espresso | `sparse` | ~1 in 3 beans, far/mid layers only, quiet drift |
| Testimonials | Cream | `sparse` | Same quiet field as Gallery |
| Contact | Roast | `settle` | Beans stack into a growing pile along the bottom |
| Footer | Espresso | `settle` | Pile persists through the footer |

Mode changes carry current positions, rotation and velocity forward and ease
toward new targets, so the field never snaps.

### Reduced motion

With `prefers-reduced-motion: reduce`, the engine paints one static frame of 14
beans and never starts rAF or the scroll listener. CSS reveals and the steam
loop are disabled, all content is immediately visible, and the preference is
watched at runtime.

---

## Tweak guide

### 1. Bean count, size and performance

Everything numeric lives in the frozen `CONFIG` at the top of
`js/bean-engine.js`:

| Key | Default | Effect |
| --- | --- | --- |
| `countDesktop` | `60` | Pool size (and maximum beans drawn) |
| `countMobile` | `30` | Beans kept active below `mobileBreakpoint`; the rest fade out |
| `mobileBreakpoint` | `768` | CSS-pixel breakpoint for the mobile count |
| `baseSize` | `34` | Bean width in px at depth 1.0 |
| `dprCap` | `2` | Backing-store pixel ratio cap |
| `resizeDebounce` | `150` | Milliseconds before sprites/path are rebuilt |
| `pathSamples` | `400` | Points sampled from the process path at layout |
| `layers` | 3 objects | `depth`, `size`, `alpha`, `blur` per depth |

Rules of thumb:

- `countMobile` must be ≤ `countDesktop`. The pool is created once from
  `countDesktop`; mobile simply deactivates the tail.
- For low-end devices, try `countDesktop: 40`, `countMobile: 20`, or lower the
  far/mid/near alphas (`0.3` / `0.48` / `0.78`).
- Raising `dprCap` above `2` costs memory and fill rate for little visual gain.
- Changing `baseSize` changes bean dimensions only; sprite ratios stay 1:1.5.

### 2. Bean colours

Beans are drawn in code, so CSS tokens do **not** recolour them. Edit the
gradient stops in `drawBean()` (`js/bean-engine.js`):

- body gradient: `#6b4527` → `#5A3A22` → `#2C1B12`
- rim: `rgba(139, 94, 60, 0.4)` (`#8B5E3C` at 40%)
- shoulder highlight: `rgba(255, 233, 204, 0.08)`
- crease strokes: `rgba(20, 10, 6, 0.8)` plus a light right edge

Sprites are built from this function at load and on resize; no other file
needs to change.

### 3. UI colours

Tokens are declared once in `css/base.css` (`:root`):

| Token | Value | Use |
| --- | --- | --- |
| `--espresso` | `#1B120C` | Primary dark surface |
| `--roast` | `#2C1B12` | Alternate dark surface |
| `--crema` | `#D9B38C` | Secondary text/icons on dark |
| `--caramel` | `#C07F3D` | Decorative accents only |
| `--ember` | `#E2672B` | CTA fill, focus ring, highlights |
| `--cream` | `#F4E9DB` | Light surface |
| `--foam` | `#FFF8EF` | Primary text on dark |
| `--ink` | `#2B1B11` | Primary text on cream |
| `--ink-soft` | `#5B4434` | Secondary text on cream |
| `--ember-ink` | `#8C3F12` | Accent text/links on cream (AA-safe) |

If you change a surface or text colour, keep the pairings AA: use
`--ember-ink` (not `--caramel`) for small accent text on cream, and
`--espresso` text on `--ember` buttons, never `--foam` on ember.



### If you change one thing

Run through this quick loop after edits: reload at 390px and 1424px, scroll to
every section once, tab through the page, open the mobile menu, submit the form
empty and then valid, and toggle "reduce motion" in DevTools rendering
emulation. That covers the six modes, all reveals, the three interactive
components and the reduced-motion path.

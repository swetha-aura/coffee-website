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

```powershell
$H=New-Object Net.HttpListener; $H.Prefixes.Add('http://localhost:8000/'); $H.Start(); while($true){ $C=$H.GetContext(); $P=$C.Request.Url.LocalPath.TrimStart('/'); if($P -eq ''){$P='index.html'}; $F=Join-Path $PWD $P; if(Test-Path $F -PathType Leaf){ $E=[IO.Path]::GetExtension($F); $T=@{'.html'='text/html; charset=utf-8';'.css'='text/css';'.js'='text/javascript';'.svg'='image/svg+xml';'.webp'='image/webp';'.jpg'='image/jpeg';'.png'='image/png';'.woff2'='font/woff2'}[$E]; if($T){$C.Response.ContentType=$T}; $B=[IO.File]::ReadAllBytes($F); $C.Response.OutputStream.Write($B,0,$B.Length) } else { $C.Response.StatusCode=404 }; $C.Response.Close() }
```

Then open <http://localhost:8000/>. Stop the PowerShell server with `Ctrl+C`.

There is no install, compile or watch step. Edit a file and refresh.

---

## Project map

```
coffee-portfolio/
├── index.html               Semantic page: 7 sections + footer, 8 images
├── design.md                Normative design/build contract (sections 3–6)
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

### 4. Section → mode mapping

Mapping is declarative, in `index.html`:

```html
<section id="menu" data-bean-mode="orbit" ...>
```

Change the attribute to any of `fall`, `drift`, `path`, `orbit`, `sparse`,
`settle`. `scroll-director.js` picks it up automatically; no JS edit needed.
The engine's mode set is closed (`MODES` in `bean-engine.js`), so a brand-new
behaviour also needs a branch inside `_update()` and a tuning block of its own.

To keep the nav meaningful when two sections share a nav target, add
`data-nav-section="gallery"` (see Testimonials) or whichever link should stay
highlighted.

### 5. Per-mode tuning

Each behaviour is a `case` inside `_update()` in `js/bean-engine.js`, with
nearby helpers (`_assignFallTargets`, `_buildPathSamples`, `_readRect`):

- `fall` — gravity, terminal velocity, sway amplitude, respawn delay
- `drift` — drift amplitude, parallax factor, approach constant
- `path` — station spread, lateral offset, fade-in window
- `orbit` — ellipse radii as a fraction of the grid rect, gather window
- `sparse` — active ratio, speed multiplier, layer exclusions
- `settle` — pile row height, overlap, jitter, approach constant

All motion uses frame-rate-independent damping, so constants are in
per-second units and behave the same at 60 Hz and 144 Hz.

### 6. Copy, images and fonts

- Copy and alt text live in `index.html`.
- Images are `<picture>` with WebP first and JPG fallback. Keep explicit
  `width`/`height` to avoid layout shift, and update `ASSETS_LICENSE.md` for
  any replacement.
- Fonts come from Google Fonts in the `<head>` (Playfair Display 600/700,
  italic 600; Inter 400/500). For a fully offline build, put WOFF2 files in
  `assets/fonts/`, add `@font-face` rules, and remove the Google Fonts links.

---

## Accessibility

- One `h1`, landmark `header`/`nav`/`main`/`section`/`footer`, skip link to
  `#main`.
- Visible focus: 2px `--ember` ring with 3px offset on every interactive
  element.
- Minimum 44×44px targets for nav, buttons, slider controls and dots.
- Form errors use `aria-invalid`, `aria-describedby`, an inline message and a
  focus move to the first invalid field. Success is announced via
  `role="status"`.
- Testimonials slider: ←/→/Home/End, dots with `aria-current`, polite live
  region, swipe support.
- Mobile menu: `aria-expanded`, `inert` on the page behind it, Escape closes
  and returns focus, body scroll locks while open.
- Canvas is `aria-hidden="true"` and never focusable.
- No-JS fallback reveals all content (data-reveal hiding only applies when `js` is on `<html>`).

---

## Verification performed

Measured in headless Chrome 157 via the CDP harness, at 1424×805 DPR 1 and
390×844 DPR 2, plus width sweeps at 480 / 768 / 1024 / 1440. Both protocols
were exercised: the page served over HTTP **and** opened as `file:///` from
disk (61 fps bean loop, all six modes switch, nav/slider/form functional,
zero console errors in both):

- **axe-core 4.10.2** (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`):
  **0 violations**, 32 rules passed, 29 inapplicable. The `color-contrast`
  rule stays `incomplete` on elements whose backdrop is covered by decorative
  pseudo-elements, so axe cannot sample it; a separate computed-style sweep
  (alpha compositing through the ancestor chain) found **0 text-contrast
  failures** across the page.
- **Mode sequence:** `fall → drift → path → orbit → sparse → settle` observed
  at the matching sections; `--process-progress` advances from `0.0000` to
  `1.0000`; active nav follows the scroll.
- **Layout:** no horizontal overflow (`scrollWidth === clientWidth`) at 390,
  480, 768, 1024, 1424 and 1440. Gallery is 1 / 2 / 3 columns and menu is
  1 / 2 / 3 columns at the intended breakpoints. The hamburger appears below
  1024px and the desktop nav at 1024px and above.
- **Images:** 8/8 load (`naturalWidth > 0`), hero eager + `fetchpriority="high"`,
  the other 7 lazy. Total WebP payload ≈ 468 KB; CSS + JS ≈ 107 KB
  uncompressed, no libraries.
- **Reduced motion:** static frame painted, no animation loop started,
  54/54 reveal targets visible.
- **Interaction:** mobile menu opens/closes with correct ARIA and body lock;
  empty form submit flags four fields and focuses the first; valid submit
  announces success and clears; slider ArrowRight/End update slide, dots and
  live-region count.
- **Target sizes:** nav links, CTA, scroll cue, slider dots (44×44) and arrows
  (52×52) all meet the 44px contract. The consent label is a 44px-tall hit
  area; 18px checkbox artwork is centred inside it. Inline text links in the
  footer/address use their normal text metrics (WCAG inline-link exception).
- **Console:** no errors during load, scroll or interaction.

### Not measured

- **Lighthouse Performance ≥ 90 / Accessibility ≥ 95.** Lighthouse needs
  Node/npm, which is not available in the build environment. The checks above
  are manual proxies, not a Lighthouse score.
- **Cross-browser pass.** Verified only in Chromium. Safari/Firefox should be
  spot-checked (notably `inert`, `overflow: clip`, `backdrop-filter` and
  `text-wrap`).
- **Swipe gesture and CSS hover tilt** were verified by code inspection, not by
  synthetic pointer movement.

---

## Acceptance checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| Exact file structure (`index.html`, `design.md`, `ASSETS_LICENSE.md`, `README.md`, 4 CSS, 5 JS, asset folders) | **Pass** | File tree above |
| `design.md` written first and followed (sections 3–6 normative) | **Pass** | Tokens, scale, modes and section order match |
| Colour tokens exactly as specified | **Pass** | `css/base.css` `:root`; contrast-safe derived tokens added |
| Playfair Display + Inter via Google Fonts, fluid `clamp()` scale | **Pass** | `<head>` link; `--fs-14 … --fs-96` |
| 1200px max width; 480 / 768 / 1024 / 1440 breakpoints | **Pass** | `--max-width`; width sweep above |
| One fixed, DPR-aware canvas; `z-index` 1 above surfaces, behind content; `pointer-events: none` | **Pass** | `base.css` canvas layer; no section stacking contexts |
| Beans drawn in code: 1:1.5 ellipse, S-curve crease, `#5A3A22 → #2C1B12`, `#8B5E3C` highlight | **Pass** | `drawBean()` in `bean-engine.js` |
| 60 desktop / 30 mobile in a single config constant; pooled objects; pre-rendered depth sprites | **Pass** | `CONFIG`; 3 sprite canvases |
| Passive scroll listener storing only `scrollY`; single rAF delta-time loop; pause when hidden | **Pass** | `scroll-director.js`, `_tick()` / `_onVisibility()` |
| Six modes: `fall`, `drift`, `path`, `orbit`, `sparse`, `settle` | **Pass** | Mode sequence test |
| Smooth lerped mode transitions (never snap) | **Pass** | Velocity/position carry-over + exponential damping |
| All 7 sections + footer with specified content | **Pass** | `index.html` |
| Sticky navbar, smooth scroll, active links, hamburger | **Pass** | Scroll test, mobile menu test |
| Menu: 6 cards with hover tilt | **Pass** | CSS 3D transform; `:focus-within` parity |
| Gallery: masonry, 6 lazy WebP/JPG images, captions | **Pass** | CSS columns, `<picture>`, 7 lazy images total |
| Testimonials: custom keyboard slider | **Pass** | Arrow/Home/End + dots + live region |
| Contact form validation + footer | **Pass** | Empty/valid submit tests |
| Only Pexels/Pixabay/Unsplash/CC0/PD assets; no CC-BY/CC-BY-SA | **Pass** | `ASSETS_LICENSE.md` (Pexels License, no attribution) |
| Every asset recorded with source URL | **Pass** | `ASSETS_LICENSE.md` |
| WebP + JPG fallback, `width`/`height`, `alt`, lazy except hero | **Pass** | 8 pairs; 7 `loading="lazy"`, hero eager |
| Responsive at 480 / 768 / 1024 / 1440 | **Pass** | No overflow; columns and nav switch correctly |
| Lighthouse Performance ≥ 90 | **Not measured** | Lighthouse unavailable (no Node); see proxies |
| Lighthouse Accessibility ≥ 95 | **Not measured** | axe: 0 violations; contrast sweep: 0 failures |
| Keyboard accessible, visible focus, AA contrast | **Pass** | axe: 0 violations; contrast sweep: 0 failures; target-size audit; focus styles |
| `prefers-reduced-motion` respected | **Pass** | Static 14-bean frame, 54/54 content visible |
| No inline `style` attributes | **Pass** | None in `index.html`; JS sets only runtime custom properties |
| No console errors | **Pass** | Clean load, scroll and interaction |
| Works by double-clicking `index.html` | **Pass** | `file://` verified end-to-end in headless Chrome: 61 fps bean loop, all modes switch, nav/slider/form work, no console errors |

### If you change one thing

Run through this quick loop after edits: reload at 390px and 1424px, scroll to
every section once, tab through the page, open the mobile menu, submit the form
empty and then valid, and toggle "reduce motion" in DevTools rendering
emulation. That covers the six modes, all reveals, the three interactive
components and the reduced-motion path.

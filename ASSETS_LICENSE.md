# Asset Licences — Ember & Bean

_Last updated: 18 November 2026._

This project ships **only** assets that are free to use **without attribution**.
No CC-BY, CC-BY-SA, or other attribution-required assets are used.

---

## 1. Photography — Pexels License

All photographs were downloaded from **Pexels** (`images.pexels.com`) and are
governed by the [Pexels License](https://www.pexels.com/license/):

- Free to use, including commercial use.
- **No attribution required.**
- Do not sell unmodified copies, imply endorsement, or redistribute as a
  competing stock library.

Each image was downloaded twice from the Pexels CDN: a WebP (primary) and a JPG
(fallback), both width-limited and compressed by the CDN. No other edits beyond
the crops performed by CSS (`object-fit: cover`).

| File | Source (photo page) | License | Dimensions | Used in |
| --- | --- | --- | --- | --- |
| `assets/img/hero-latte.webp` / `.jpg` | https://www.pexels.com/photo/312418/ | Pexels License (no attribution) | 1200 × 1798 | Hero cup |
| `assets/img/story-roastery.webp` / `.jpg` | https://www.pexels.com/photo/894695/ | Pexels License (no attribution) | 1200 × 800 | Story |
| `assets/img/gallery-beans.webp` / `.jpg` | https://www.pexels.com/photo/585750/ | Pexels License (no attribution) | 900 × 600 | Gallery 1 |
| `assets/img/gallery-barista.webp` / `.jpg` | https://www.pexels.com/photo/373639/ | Pexels License (no attribution) | 900 × 600 | Gallery 2 |
| `assets/img/gallery-latte-art.webp` / `.jpg` | https://www.pexels.com/photo/302899/ | Pexels License (no attribution) | 900 × 601 | Gallery 3 |
| `assets/img/gallery-cafe.webp` / `.jpg` | https://www.pexels.com/photo/1002740/ | Pexels License (no attribution) | 1200 × 595 | Gallery 4 |
| `assets/img/gallery-table.webp` / `.jpg` | https://www.pexels.com/photo/851555/ | Pexels License (no attribution) | 900 × 600 | Gallery 5 |
| `assets/img/gallery-spread.webp` / `.jpg` | https://www.pexels.com/photo/2074130/ | Pexels License (no attribution) | 1200 × 800 | Gallery 6 |

> The Pexels photo pages may present a Cloudflare check to automated clients;
> the URLs above are the canonical public pages for each photo ID.

**Compliance notes**

- All images are rendered from the project domain (downloaded, not hot-linked).
- Alt text is authored in `index.html`, not scraped.
- Hero image is eager + `fetchpriority="high"`; every other image is lazy.
- Width and height attributes match the downloaded files.

---

## 2. Typefaces — SIL Open Font License 1.1

Loaded from Google Fonts. Both families are OFL 1.1; no attribution is required
in the rendered page, and the licence permits web embedding.

| Family | Weights / styles | Source | License |
| --- | --- | --- | --- |
| Playfair Display | 600, 700, italic 600 | https://fonts.google.com/specimen/Playfair+Display | SIL OFL 1.1 |
| Inter | 400, 500 | https://fonts.google.com/specimen/Inter | SIL OFL 1.1 |

If you need a fully offline build, download the WOFF2 files from Google Fonts and
self-host them in `assets/fonts/` (the folder is reserved for this).

---

## 3. Original artwork — created for this project

Everything below is **original work** produced as inline SVG, external SVG, or
canvas drawing. It carries the same licence as the project and needs no
attribution.

| File / system | Description | Technique |
| --- | --- | --- |
| `assets/svg/icons.svg` | Sprite: bean mark, 6 drink icons, arrows, star, pin, clock, phone, mail, social icons, leaf | Hand-authored SVG |
| `assets/svg/favicon.svg` | Espresso tile + ember bean favicon | Hand-authored SVG |
| `assets/svg/steam.svg` | Three steam wisps (source copy; live version is inline in the hero) | Hand-authored SVG |
| `assets/svg/process-path.svg` | Source copy of the curved process path | Hand-authored SVG |
| `js/bean-engine.js` | All coffee-bean sprites | Procedural Canvas 2D gradients + Bézier crease |
| Hero steam (inline) | Animated steam | Inline SVG + CSS keyframes |
| Process rail (inline) | Path sampled for bean travel and progress stroke | Inline SVG + JS |
| Contact map | Stylised street map with pin | Inline SVG |
| Testimonial avatars | Initial-based monograms | CSS |
| Grain/glows/gradients | Section atmosphere | CSS only |

---

## 4. Explicit exclusions

- No CC-BY, CC-BY-SA, CC-BY-ND, or "free for personal use" assets.
- No Google Images / Pinterest / random web results.
- No stock preview watermarks.
- No icon-font or animation library dependencies.
- No npm packages, build output, or third-party JavaScript.

If you replace any image, add the new file and its licence row here **before**
shipping. When in doubt, prefer Pexels / Unsplash / Pixabay / CC0 and record the
source URL.

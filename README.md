# Galent Website

Production-ready marketing website for **Galent** — engineering outcomes, not headcount.

Static HTML / CSS / JavaScript. No build step, no framework, no dependencies beyond Google Fonts.

## Pages

| Page | Route | Source |
|---|---|---|
| Home | `/index.html` | Hero · Problem · Outcomes · Galent Difference · Services · FDE · Industries · Ops · Cases · CTA |
| Platform | `/platform.html` | GalentAI · NeuroQL · RCM · Knowledge Graph · Context Graph |
| FDE | `/fde.html` | Forward-Deployed Engineering · 4 archetypes · operating model |
| About | `/about.html` | Story · principles · industries · careers |
| Knowledge Hub | `/knowledge-hub.html` | Blogs · whitepapers · videocasts (tabs + search) |
| Services × 8 | `/services/*.html` | Legacy Modernization, Brownfield & Greenfield, Quality Engineering, ITSM Transformation, SRE & Observability, Everything Ops, Data Transformation, Enterprise Platforms |

## Structure

```
src/
├── index.html                     # Home
├── platform.html
├── fde.html
├── about.html
├── knowledge-hub.html
├── css/design-system.css          # All tokens + components
├── js/
│   ├── animations.js              # Aurora · Orbital Compass · Signal · reveal · sticky nav · hamburger
│   └── cms.js                     # Knowledge Hub tabs + search filter
└── services/
    ├── legacy-modernisation.html
    ├── brownfield-greenfield.html
    ├── quality-engineering.html
    ├── itsm-transformation.html
    ├── sre-observability.html
    ├── everything-ops.html
    ├── data-transformation.html
    └── enterprise-platforms.html

assets/
└── images/logo.png                # Brand mark, transparent PNG
```

## Design system

Single source of truth: `src/css/design-system.css`.

**Brand palette**

| Token | Hex | RGB |
|---|---|---|
| `--brand-purple` | `#7B2CBF` | 123, 44, 191 |
| `--brand-green` | `#1ED197` | 30, 209, 151 |
| `--brand-orange` | `#FF5A1F` | 255, 90, 31 |
| `--on-surface` (ink) | `#121317` | 18, 19, 23 |
| `--surface` (page bg) | `#FFFFFF` | 255, 255, 255 |

**Typography:** Plus Jakarta Sans (300–700) + JetBrains Mono (400, 500) — both loaded from Google Fonts.

**Spacing:** 4px base scale (`--space-xs` 4px → `--space-4xl` 120px).

**Radii:** `--radius-sm` 4px · `--radius-md` 16px · `--radius-lg` 36px · `--radius-full` 9999px.

## Animations

Dependency-free Canvas2D, retina-aware, ~60fps. Each function takes a `<canvas>` element and returns its cleanup (`cancelAnimationFrame`).

- `Galent.aurora(canvas)` — drifting brand-colour radial blobs (hero backdrop)
- `Galent.compass(canvas)` — Orbital "GalentAI core" with 6 phase nodes
- `Galent.signal(canvas)` / `Galent.spectrum(canvas)` — 64-bar phase-shifted spectrum
- `Galent.persistentReveal()` — IntersectionObserver fade-in on `[data-reveal]`
- `Galent.stickyNav(id)` — scroll border + mobile hamburger toggle

## Running locally

No build needed. Open `src/index.html` directly in a browser.

For a proper local server experience:

```bash
# Python 3
python -m http.server 8000

# Node
npx http-server src -p 8000

# then open http://localhost:8000
```

## Deploying

Drag-drop the `src/` folder to:
- [Netlify Drop](https://app.netlify.com/drop)
- [Vercel](https://vercel.com/new)

Or push to GitHub and enable Pages on the `main` branch (Settings → Pages → root: `/src`).

## Accessibility

- All images have alt text
- All buttons have visible labels or `aria-label`
- `:focus-visible` 2px purple ring on all interactive elements
- Tab/Enter/Space keyboard navigation supported on tabs and buttons
- Touch targets ≥ 44px
- WCAG AA colour contrast (ink on surface = 17.7:1)

## Status

✅ Phases 1–6 complete · ready for handoff.

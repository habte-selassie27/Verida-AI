# FRONTEND_DESIGN.md — Verida AI Dataset Marketplace

> **Theme:** Cyber Luxury / AI Marketplace  
> **Stack:** React 19 + Vite + TypeScript + TailwindCSS v4  
> **Fonts:** Space Grotesk (headings) · Inter (body)

---

## 1. Design Philosophy

The goal is **elegant, not AI-generated**. Every decision must pass this test:

> *Would a senior designer at Linear or Stripe make this choice specifically for an AI data marketplace — or is it a generic dark-theme default?*

Three defaults to actively avoid:
- Cream/beige background + terracotta accent (Claude/warm AI look)
- Acid-green single accent on near-black (generic Web3)
- Broadsheet hairline-rule layouts (editorial template)

The Verida identity sits at the intersection of **crypto infrastructure seriousness** and **AI research elegance** — premium spacing, disciplined type, one signature glow system, nothing else.

---

## 2. Color Tokens

```css
:root {
  /* Backgrounds */
  --bg:         #050505;          /* page root */
  --card:       #101014;          /* primary card surface */
  --card-alt:   #0d0d11;          /* secondary card / gradient end */

  /* Brand */
  --pink:       #FF2E93;          /* primary accent — buttons, glows, borders */
  --pink-lt:    #FF65C3;          /* gradient end / lighter highlight */
  --purple:     #8B5CF6;          /* secondary accent — tags, purple glow */
  --cyan:       #00E5FF;          /* tertiary accent — prices, verified badges */

  /* Text */
  --text:       #F5F5F7;          /* primary text */
  --muted:      #9CA3AF;          /* secondary / labels */

  /* Structural */
  --border:     rgba(255,255,255,.07);   /* default border */
  --border-h:   rgba(255,46,147,.35);   /* hover / active border */

  /* Glow variants (for box-shadow / filter) */
  --glow-pk:    rgba(255,46,147,.45);
  --glow-pu:    rgba(139,92,246,.35);
  --glow-cy:    rgba(0,229,255,.25);

  /* Radius */
  --r:          16px;
  --r-sm:       10px;
  --r-lg:       24px;
}
```

### Usage rules

| Token | Use it for | Never use it for |
|---|---|---|
| `--pink` | Primary buttons, active states, key glows | Body text, large fills |
| `--purple` | Tags, secondary glows, timeline accents | Navigation, CTAs |
| `--cyan` | Prices, verified labels, data metrics | Headings, backgrounds |
| `--muted` | Labels, captions, secondary copy | Anything interactive |
| `--border` | All resting card borders | Borders that need emphasis |
| `--border-h` | Hover borders, focused inputs | Default state |

---

## 3. Background System

The background is layered — **never a flat color**.

### Layer stack (bottom → top)

```
1. #050505 solid fill                     (body background)
2. Radial gradient overlays × 4           (ambient light)
3. Grid pattern overlay                   (very subtle)
4. Floating blur orbs × 3                (depth)
5. Content
```

### Radial gradient overlays

```css
background:
  radial-gradient(circle at 20%  5%,  rgba(255,46,147,.10) 0%, transparent 42%),
  radial-gradient(circle at 80% 15%,  rgba(139,92,246,.09) 0%, transparent 45%),
  radial-gradient(circle at 10% 80%,  rgba(0,229,255,.07)  0%, transparent 40%),
  radial-gradient(circle at 90% 70%,  rgba(255,46,147,.06) 0%, transparent 38%);
```

### Grid overlay

```css
background-image:
  linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
background-size: 60px 60px;
```

### Floating orbs

Three `position: fixed` divs, `pointer-events: none`, `z-index: 0`:

| Orb | Size | Position | Color | Blur |
|---|---|---|---|---|
| Pink | 600×600px | top:-120px left:-150px | `rgba(255,46,147,.10)` | 180px |
| Purple | 500×500px | top:30% right:-120px | `rgba(139,92,246,.09)` | 180px |
| Cyan | 400×400px | bottom:10% left:20% | `rgba(0,229,255,.07)` | 180px |

---

## 4. Typography

### Font pairing

```
Display / Headings  →  Space Grotesk  (wght: 600, 700)
Body / UI           →  Inter           (wght: 400, 500, 600)
```

### Type scale

| Role | Font | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| Hero H1 | Space Grotesk | `clamp(42px,7vw,80px)` | 700 | -2px |
| Section H2 | Space Grotesk | `clamp(28px,4vw,44px)` | 700 | -1px |
| Card H3 | Space Grotesk | 18px | 600 | -0.3px |
| Body | Inter | 15–16px | 400 | normal |
| Caption / Label | Inter | 11–13px | 500–600 | +0.06–0.12em |
| Data / Price | Space Grotesk | 16–42px | 700 | -0.3px |

### Section labels (eyebrows)

```css
.section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--pink);
}
/* Decorative left rule */
.section-label::before {
  content: '';
  width: 20px;
  height: 1px;
  background: var(--pink);
}
```

---

## 5. Navigation

**Glass morphism sticky bar.**

```css
nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 64px;
  background: rgba(5,5,5,.65);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(255,255,255,.05);
  z-index: 100;
}
```

### Structure

```
[Logo mark]  Verida AI    Marketplace  Categories  Pricing  Developers    [Connect Wallet]
```

### Logo mark

```css
.logo-mark {
  width: 34px; height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #FF2E93, #8B5CF6);
}
```

### Nav links

```css
color: var(--muted);
font-size: 14px;
font-weight: 500;
transition: color .2s;
/* hover → color: var(--text) */
```

### Connect Wallet button

```css
background: transparent;
border: 1px solid var(--border-h);
color: var(--pink-lt);
padding: 9px 20px;
border-radius: 12px;
font-size: 13px;
font-weight: 600;
/* hover → background: rgba(255,46,147,.08); box-shadow: 0 0 20px rgba(255,46,147,.2) */
```

---

## 6. Buttons

### Primary

```css
.btn-primary {
  background: linear-gradient(135deg, #FF2E93, #FF65C3);
  color: #fff;
  border: none;
  padding: 14px 32px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 0 28px rgba(255,46,147,.30);
  transition: all .25s;
}
.btn-primary:hover {
  transform: scale(1.04);
  box-shadow: 0 0 50px rgba(255,46,147,.55);
}
```

### Secondary

```css
.btn-secondary {
  background: transparent;
  border: 1px solid #FF2E93;
  color: #FF65C3;
  padding: 14px 32px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 600;
  transition: all .25s;
}
.btn-secondary:hover {
  background: rgba(255,46,147,.08);
  box-shadow: 0 0 30px rgba(255,46,147,.20);
  transform: scale(1.03);
}
```

### Small / Utility (nav, wallet)

```css
padding: 9px 20px;
border-radius: 12px;
font-size: 13px;
```

---

## 7. Cards

### Feature cards

```css
.feat-card {
  background: linear-gradient(180deg, #111114, #09090b);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 20px;
  padding: 32px;
  transition: all .3s;
}
.feat-card:hover {
  transform: translateY(-8px);
  border-color: rgba(255,46,147,.20);
  box-shadow: 0 0 50px rgba(255,46,147,.12);
}
```

**Icon container:**

```css
.feat-icon {
  width: 48px; height: 48px;
  border-radius: 14px;
  background: rgba(255,46,147,.10);
  border: 1px solid rgba(255,46,147,.20);
}
```

### Category cards

```css
.cat-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px 20px;
  transition: all .3s;
  position: relative;
  overflow: hidden;
}
/* Pink top-border line — hidden at rest, visible on hover */
.cat-card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--pink), var(--purple));
  opacity: 0;
  transition: opacity .3s;
}
/* Bottom pink radial shadow */
.cat-card::after {
  content: '';
  position: absolute; bottom: -40px; left: 50%; transform: translateX(-50%);
  width: 120px; height: 80px;
  background: var(--pink);
  filter: blur(40px);
  opacity: 0;
  transition: opacity .3s;
}
.cat-card:hover {
  border-color: rgba(255,46,147,.25);
  transform: translateY(-4px);
}
.cat-card:hover::before,
.cat-card:hover::after { opacity: 1; }
```

### Dataset marketplace cards

```css
.ds-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  transition: all .3s;
  position: relative;
}
.ds-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 0 50px rgba(255,46,147,.12);
  border-color: rgba(255,46,147,.20);
}
/* Image zooms on hover */
.ds-img-inner { transition: transform .4s ease; }
.ds-card:hover .ds-img-inner { transform: scale(1.08); }

/* Action button fades in on hover */
.ds-btn {
  position: absolute;
  opacity: 0;
  transition: opacity .25s;
  background: linear-gradient(135deg, var(--pink), var(--pink-lt));
}
.ds-card:hover .ds-btn { opacity: 1; }
```

**Verified badge:**

```css
background: rgba(0,229,255,.12);
border: 1px solid rgba(0,229,255,.30);
color: var(--cyan);
border-radius: 8px;
padding: 4px 10px;
font-size: 11px;
font-weight: 600;
```

**Tag (category pill):**

```css
background: rgba(139,92,246,.10);
border: 1px solid rgba(139,92,246,.20);
color: var(--purple);
border-radius: 6px;
padding: 3px 10px;
font-size: 11px;
font-weight: 600;
```

### Stat cards

```css
.stat-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: all .3s;
}
/* Bottom glow orb */
.stat-card::after {
  content: '';
  position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%);
  width: 120px; height: 80px;
  background: var(--pink);
  filter: blur(35px);
  opacity: .12;
}
.stat-card:hover {
  border-color: rgba(255,46,147,.20);
  transform: translateY(-4px);
  box-shadow: 0 0 40px rgba(255,46,147,.10);
}
```

---

## 8. Hero Section

**Layout:** Centered, full-viewport, content stacked vertically over particle canvas.

```
┌─────────────────────────────────────────────┐
│          [● Shelby Protocol × Verida AI]     │  ← badge
│                                             │
│     Verifiable                              │
│     AI Datasets.                            │  ← h1 (gradient on last line)
│     Provenance you can trust.               │
│                                             │
│     Every dataset anchored to Aptos...      │  ← subtitle (18px, --muted)
│                                             │
│   [ Browse Marketplace → ]  [ Upload ]      │  ← CTAs
│                                             │
│   15,284       94,201       16       97%    │  ← stat row
│   Datasets    Requests   Nodes    Quality   │
│                                             │
│ ·  ·   ·    ·  ·    ·   ·    ·  ·    ·    │  ← particle canvas
└─────────────────────────────────────────────┘
```

### Hero badge

```css
display: inline-flex;
align-items: center;
gap: 8px;
background: rgba(255,46,147,.08);
border: 1px solid rgba(255,46,147,.20);
border-radius: 100px;
padding: 7px 16px;
font-size: 12px;
font-weight: 600;
letter-spacing: .08em;
text-transform: uppercase;
color: var(--pink-lt);
```

Pulsing dot:

```css
width: 6px; height: 6px;
border-radius: 50%;
background: var(--pink);
box-shadow: 0 0 8px var(--pink);
animation: pulse 2s infinite;
```

### Gradient headline

```css
.grad {
  background: linear-gradient(135deg, #FF2E93, #FF65C3, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Particle network canvas

- 80 particles, colors: `#FF2E93`, `#FF65C3`, `#8B5CF6`, `#00E5FF`
- Connection lines drawn between particles `< 120px` apart, `opacity` proportional to distance
- Each particle has a soft radial glow at `5× radius`
- Particles wrap at canvas edges (no bounce)
- Speed: `±0.35` px/frame — very slow drift

---

## 9. Section Layout

### Full page structure

```
┌──────────────────────────────────────┐
│  Sticky Glass Navbar (64px)          │
├──────────────────────────────────────┤
│  HERO (100vh)                        │
│  Headline + CTA + Particle canvas    │
├──────────────────────────────────────┤
│  Trusted By (logo strip)             │
│  border-top + border-bottom          │
├──────────────────────────────────────┤
│  Features (3×2 cards)  pt:100px      │
├──────────────────────────────────────┤
│  Categories (4×2 cards) pt:80px      │
├──────────────────────────────────────┤
│  Trending Datasets (3 cards) pt:80px │
├──────────────────────────────────────┤
│  How It Works (numbered timeline)    │
├──────────────────────────────────────┤
│  Statistics (4 glowing cards)        │
├──────────────────────────────────────┤
│  Testimonials (3 cards)              │
├──────────────────────────────────────┤
│  CTA Banner (gradient border box)    │
├──────────────────────────────────────┤
│  Footer (glass dark)                 │
└──────────────────────────────────────┘
```

### Container

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
}
```

### Section padding rhythm

| Section | Top | Bottom |
|---|---|---|
| Features | 100px | 100px |
| Categories | 80px | 80px |
| Datasets | 80px | 80px |
| How It Works | 100px | 100px |
| Stats | 80px | 80px |
| Testimonials | 80px | 80px |
| CTA Banner | 80px | 80px |

---

## 10. Animations

### Scroll reveal (IntersectionObserver)

```css
.reveal {
  opacity: 0;
  transform: translateY(32px);
  transition: opacity .6s ease, transform .6s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
/* Stagger delays */
.reveal-delay-1 { transition-delay: .1s; }
.reveal-delay-2 { transition-delay: .2s; }
.reveal-delay-3 { transition-delay: .3s; }
.reveal-delay-4 { transition-delay: .4s; }
```

Fire at `threshold: 0.12`.

### Hero entrance (CSS)

All hero children animate on load via `animation: fadeUp`:

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Stagger via animation-delay: .1s increments */
```

### Counter animation (JS)

Stat numbers count up from 0 when they scroll into view. Easing: `1 - (1-t)³` (ease-out cubic). Duration: 1800ms.

### Hover micro-interactions

| Element | Transform | Shadow |
|---|---|---|
| Feature card | `translateY(-8px)` | `0 0 50px rgba(255,46,147,.12)` |
| Category card | `translateY(-4px)` | border-color change |
| Dataset card | `translateY(-6px)` | `0 0 50px rgba(255,46,147,.12)` |
| Stat card | `translateY(-4px)` | `0 0 40px rgba(255,46,147,.10)` |
| Primary button | `scale(1.04)` | `0 0 50px rgba(255,46,147,.55)` |
| Secondary button | `scale(1.03)` | `0 0 30px rgba(255,46,147,.20)` |
| Dataset image | `scale(1.08)` on inner img | — |
| Dataset button | `opacity: 0 → 1` | — |

All transitions: `all .25s–.3s ease`.

### Pulse (badge dot)

```css
@keyframes pulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50%      { opacity: .5; transform: scale(.85); }
}
animation: pulse 2s infinite;
```

---

## 11. Grid Systems

| Section | Columns | Gap |
|---|---|---|
| Features | 3 | 20px |
| Categories | 4 | 16px |
| Datasets | 3 | 20px |
| Stats | 4 | 20px |
| Testimonials | 3 | 20px |

All grids collapse to 2-col at `≤900px` and 1-col at `≤600px`.

---

## 12. How It Works — Timeline

```css
.timeline {
  position: relative;
  max-width: 760px;
  margin: 0 auto;
}
/* Vertical line */
.timeline::before {
  content: '';
  position: absolute;
  left: 27px; top: 0; bottom: 0; width: 1px;
  background: linear-gradient(180deg,
    transparent, var(--pink), var(--purple), transparent);
}
/* Number nodes */
.tl-num {
  width: 54px; height: 54px;
  border-radius: 50%;
  background: var(--card);
  border: 1px solid rgba(255,46,147,.25);
  color: var(--pink);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px; font-weight: 700;
  position: relative; z-index: 1;
}
```

Steps: Upload → AI Analysis → Anchor on Aptos → Earn. Steps are an actual sequence so numbering is appropriate here.

---

## 13. CTA Banner

```css
.cta-inner {
  background: linear-gradient(135deg,
    rgba(255,46,147,.08), rgba(139,92,246,.08));
  border: 1px solid rgba(255,46,147,.15);
  border-radius: 28px;
  padding: 72px 48px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
/* Top radial glow */
.cta-inner::before {
  content: '';
  position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
  width: 400px; height: 300px;
  background: radial-gradient(circle, rgba(255,46,147,.15), transparent 65%);
  pointer-events: none;
}
```

---

## 14. Footer

```css
footer {
  background: rgba(5,5,5,.95);
  border-top: 1px solid var(--border);
  padding: 56px 0 32px;
}
```

Structure:

```
┌─────────────────────────────────────────────┐
│  [V] Verida AI     Product  Developers  Community │
│  Tagline           Marketplace  Docs  Discord     │
│                    Upload       API   Twitter     │
│                    Pricing      SDK   Telegram    │
│                    Dashboard    GitHub  Blog      │
├─────────────────────────────────────────────┤
│  © 2025 Verida AI · Built on Shelby Protocol   [X][Hex][Tri][Chat] │
└─────────────────────────────────────────────┘
```

---

## 15. Responsive Breakpoints

```css
/* Tablet */
@media (max-width: 900px) {
  .features-grid  { grid-template-columns: repeat(2, 1fr); }
  .cat-grid       { grid-template-columns: repeat(2, 1fr); }
  .ds-grid        { grid-template-columns: repeat(2, 1fr); }
  .stats-grid     { grid-template-columns: repeat(2, 1fr); }
  .testi-grid     { grid-template-columns: 1fr; }
  .footer-top     { flex-direction: column; }
  .hero-stats     { gap: 28px; }
}

/* Mobile */
@media (max-width: 600px) {
  .features-grid,
  .ds-grid,
  .stats-grid,
  .cat-grid       { grid-template-columns: 1fr; }
  .hero-stats     { flex-wrap: wrap; gap: 24px; }
  .nav-links      { display: none; }
}
```

---

## 16. React / TailwindCSS v4 Implementation Notes

### Tailwind custom tokens

Add to your `tailwind.config.ts` or CSS `@theme`:

```css
@theme {
  --color-pink:     #FF2E93;
  --color-pink-lt:  #FF65C3;
  --color-purple:   #8B5CF6;
  --color-cyan:     #00E5FF;
  --color-card:     #101014;
  --color-muted:    #9CA3AF;

  --font-display:   'Space Grotesk', sans-serif;
  --font-body:      'Inter', sans-serif;

  --radius-card:    16px;
  --radius-btn:     16px;
}
```

### Framer Motion — recommended variants

```ts
// Fade up (hero children, scroll reveals)
export const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: .6, ease: [.22,1,.36,1] } }
}

// Stagger container
export const stagger = {
  visible: { transition: { staggerChildren: .1 } }
}

// Card hover
export const cardHover = {
  rest:  { y: 0 },
  hover: { y: -8, transition: { duration: .25 } }
}

// Button glow pulse
export const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 28px rgba(255,46,147,.30)',
      '0 0 50px rgba(255,46,147,.55)',
      '0 0 28px rgba(255,46,147,.30)',
    ],
    transition: { duration: 2, repeat: Infinity }
  }
}
```

### Component file structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── Trusted.tsx
│   │   ├── Features.tsx
│   │   ├── Categories.tsx
│   │   ├── Datasets.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Stats.tsx
│   │   ├── Testimonials.tsx
│   │   └── CTABanner.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── DatasetCard.tsx
│   │   ├── CategoryCard.tsx
│   │   ├── StatCard.tsx
│   │   └── SectionLabel.tsx
│   └── canvas/
│       └── ParticleNetwork.tsx   ← canvas ref + useEffect
├── styles/
│   └── globals.css               ← tokens, bg layers, orbs
└── pages/
    └── index.tsx
```

---

## 17. What Makes This Non-Generic

These are the deliberate choices that push past the AI-generated default:

1. **Three-color glow system** — pink + purple + cyan used at specific roles, not interchangeably. Cyan is reserved exclusively for data/price/verified. Purple only for tags and timeline. Pink owns all interactivity.

2. **Category cards with dual pseudo-element reveal** — the top border gradient *and* bottom radial shadow both emerge on hover, not just a border-color change.

3. **Particle canvas with topology lines** — connections drawn based on proximity, not random wires. The visual reads as a data network, directly relevant to the product.

4. **Counter animation on stat entry** — numbers count up via ease-out cubic when scrolled into view. This is a deliberate functional moment, not just decoration.

5. **Dataset card action button** — fades in only on hover, so the resting state is clean and the card reads as information-first, not action-first.

6. **Timeline gradient line** — `transparent → pink → purple → transparent` gives the process flow a visual energy that vanilla dividers don't have, without being decorative.

7. **Type restraint** — Space Grotesk used only for headings and data numbers. All UI copy, labels, and body text stay in Inter. The personality comes through in deliberate moments, not everywhere.

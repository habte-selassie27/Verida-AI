# DESIGN.md

## 1. UI Design System

Toolkit for creating and maintaining scalable UI design systems with tokens, responsive rules, accessibility and developer handoff docs.

**Views:** 20.8k | **Uses:** 1.5k | **Updated:** July 1, 2026
**Author:** davila7 | **Source:** davila7/claude-code-templates

**Keywords:** design-system, ui-design, responsive, accessibility, components, css, documentation

### Capabilities

- Design token generation (colors, typography, spacing)
- Component system architecture
- Responsive design calculations
- Accessibility compliance
- Developer handoff documentation

### Key Script: `design_token_generator.py`

Generates complete design system tokens from brand colors.

```
Usage: python scripts/design_token_generator.py [brand_color] [style] [format]
Styles: modern, classic, playful
Formats: json, css, scss
```

**Features:**
- Complete color palette generation
- Modular typography scale
- 8pt spacing grid system
- Shadow and animation tokens
- Responsive breakpoints
- Multiple export formats

### Token Reference

| Property | Value |
|----------|-------|
| name | ui-design-system |
| description | UI design system toolkit for Senior UI Designer including design token generation, component documentation, responsive design calculations, and developer handoff tools. Use for creating design systems, maintaining visual consistency, and facilitating design-dev collaboration. |

---

## 2. High-Agency Frontend Skill

A senior-level UI/UX engineering guide for architecting premium digital interfaces using strict component architecture, motion physics, and anti-bias design rules.

**Views:** 690 | **Uses:** 106 | **Updated:** July 1, 2026
**Author:** Leonxlnx | **Source:** Leonxlnx/taste-skill

**Keywords:** ui-design, ux-design, design-system, react, tailwind, animation, best-practices, responsive

### 1. Active Baseline Configuration

```
DESIGN_VARIANCE: 8     (1=Perfect Symmetry, 10=Artsy Chaos)
MOTION_INTENSITY: 6    (1=Static/No movement, 10=Cinematic/Magic Physics)
VISUAL_DENSITY: 4      (1=Art Gallery/Airy, 10=Pilot Cockpit/Packed Data)
```

The standard baseline for all generations is strictly set to these values (8, 6, 4). Do not ask the user to edit this file. Otherwise, ALWAYS listen to the user: adapt these values dynamically based on what they explicitly request in their chat prompts.

### 2. Default Architecture & Conventions

**Dependency Verification [Mandatory]:** Before importing ANY 3rd party library (e.g., framer-motion, lucide-react, zustand), check `package.json`. If the package is missing, output the installation command before providing the code. Never assume a library exists.

**Framework & Interactivity:** React or Next.js. Default to Server Components (RSC).

- **RSC Safety:** Global state works ONLY in Client Components. In Next.js, wrap providers in a "use client" component.
- **Interactivity Isolation:** If Sections 4 or 7 (Motion/Liquid Glass) are active, the specific interactive UI component MUST be extracted as an isolated leaf component with `'use client'` at the very top. Server Components must exclusively render static layouts.
- **State Management:** Use `local useState/useReducer` for isolated UI. Use global state strictly for deep prop-drilling avoidance.

**Styling Policy:** Use Tailwind CSS (v3/v4) for 90% of styling.

- **Tailwind Version Lock:** Check `package.json` first. Do not use v4 syntax in v3 projects.
- **v4 Config Guard:** For v4, do NOT use `tailwindcss` plugin in `postcss.config.js`. Use `@tailwindcss/postcss` or the Vite plugin.

**Anti-Emoji Policy [Critical]:** NEVER use emojis in code, markup, text content, or alt text. Replace with high-quality icons (Radix, Phosphor) or clean SVG primitives.

**Responsiveness & Spacing:**
- Standardize breakpoints (`sm`, `md`, `lg`, `xl`)
- Contain page layouts using `max-w-[1400px] mx-auto` or `max-w-7xl`
- **Viewport Stability [Critical]:** NEVER use `h-screen` for full-height Hero sections. ALWAYS use `min-h-[100dvh]` to prevent catastrophic layout jumping on mobile browsers (iOS Safari).

**Grid over Flex-Math:** NEVER use complex flexbox percentage math (`w-[calc(33%-1rem)]`). ALWAYS use CSS Grid (`grid grid-cols-1 md:grid-cols-3 gap-6`) for reliable structures.

**Icons:** Use `@phosphor-icons/react` or `@radix-ui/react-icons`. Standardize `strokeWidth` globally (e.g., exclusively use 1.5 or 2.0).

### 3. Design Engineering Directives (Bias Correction)

**Rule 1: Deterministic Typography**
- Display/Headlines: Default to `text-4xl md:text-6xl tracking-tighter leading-none`
- Anti-Slop: Discourage Inter for "Premium" or "Creative" vibes. Force unique character using Geist, Outfit, Cabinet Grotesk, or Satoshi.
- Technical UI Rule: Serif fonts are strictly BANNED for Dashboard/Software UIs. Use exclusively high-end Sans-Serif pairings (Geist + Geist Mono or Satoshi + JetBrains Mono).
- Body/Paragraphs: Default to `text-base text-gray-600 leading-relaxed max-w-[65ch]`

**Rule 2: Color Calibration**
- Constraint: Max 1 Accent Color. Saturation < 80%.
- The Lilac Ban: The "AI Purple/Blue" aesthetic is strictly BANNED. No purple button glows, no neon gradients. Use absolute neutral bases (Zinc/Slate) with high-contrast, singular accents (e.g., Emerald, Electric Blue, or Deep Rose).
- Color Consistency: Stick to one palette for the entire output. Do not fluctuate between warm and cool grays within the same project.

**Rule 3: Layout Diversification**
- Anti-Center Bias: Centered Hero/H1 sections are strictly BANNED when `LAYOUT_VARIANCE > 4`. Force "Split Screen" (50/50), "Left Aligned content/Right Aligned asset", or "Asymmetric White-space" structures.

**Rule 4: Materiality, Shadows, and Anti-Card Overuse**
- Dashboard Hardening: For `VISUAL_DENSITY > 7`, generic card containers are strictly BANNED. Use logic-grouping via `border-t`, `divide-y`, or purely negative space.
- Use cards ONLY when elevation communicates hierarchy. When a shadow is used, tint it to the background hue.

**Rule 5: Interactive UI States**
Mandatory generation of full interaction cycles:
- **Loading:** Skeletal loaders matching layout sizes (avoid generic circular spinners)
- **Empty States:** Beautifully composed empty states indicating how to populate data
- **Error States:** Clear, inline error reporting (e.g., forms)
- **Tactile Feedback:** On `:active`, use `-translate-y-[1px]` or `scale-[0.98]` to simulate a physical push

**Rule 6: Data & Form Patterns**
- Label MUST sit above input. Helper text is optional but should exist in markup. Error text below input. Use a standard `gap-2` for input blocks.

### 4. Creative Proactivity (Anti-Slop Implementation)

**"Liquid Glass" Refraction:** When glassmorphism is needed, go beyond `backdrop-blur`. Add a 1px inner border (`border-white/10`) and a subtle inner shadow (`shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]`).

**Magnetic Micro-physics (If `MOTION_INTENSITY > 5`):** Buttons that pull slightly toward the mouse cursor. Use EXCLUSIVELY Framer Motion's `useMotionValue` and `useTransform` outside the React render cycle.

**Perpetual Micro-Interactions:** When `MOTION_INTENSITY > 5`, embed continuous, infinite micro-animations (Pulse, Typewriter, Float, Shimmer, Carousel) in standard components. Apply premium Spring Physics (`type: "spring", stiffness: 100, damping: 20`) to all interactive elements—no linear easing.

**Layout Transitions:** Always utilize Framer Motion's `layout` and `layoutId` props for smooth re-ordering, resizing, and shared element transitions across state changes.

**Staggered Orchestration:** Use `staggerChildren` (Framer) or CSS cascade (`animation-delay: calc(var(--index) * 100ms)`) to create sequential waterfall reveals. The Parent (variants) and Children MUST reside in the identical Client Component tree.

### 5. Performance Guardrails

- **DOM Cost:** Apply grain/noise filters exclusively to fixed, `pointer-events-none` pseudo-elements and NEVER to scrolling containers.
- **Hardware Acceleration:** Never animate `top`, `left`, `width`, or `height`. Animate exclusively via `transform` and `opacity`.
- **Z-Index Restraint:** NEVER spam arbitrary `z-50` or `z-10` unprompted. Use z-indexes strictly for systemic layer contexts.

### 6. Technical Reference (Dial Definitions)

**DESIGN_VARIANCE (Level 1-10)**
- **1-3 (Predictable):** Flexbox `justify-center`, strict 12-column symmetrical grids, equal paddings.
- **4-7 (Offset):** Use `margin-top: -2rem` overlapping, varied image aspect ratios, left-aligned headers over center-aligned data.
- **8-10 (Asymmetric):** Masonry layouts, CSS Grid with fractional units, massive empty zones (`padding-left: 20vw`).
- **Mobile Override:** For levels 4-10, any asymmetric layout above `md:` MUST aggressively fall back to a strict, single-column layout on viewports < 768px.

**MOTION_INTENSITY (Level 1-10)**
- **1-3 (Static):** No automatic animations. CSS `:hover` and `:active` states only.
- **4-7 (Fluid CSS):** Use `transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1)`. Use `animation-delay` cascades for load-ins.
- **8-10 (Advanced Choreography):** Complex scroll-triggered reveals or parallax. Use Framer Motion hooks. NEVER use `window.addEventListener('scroll')`.

**VISUAL_DENSITY (Level 1-10)**
- **1-3 (Art Gallery Mode):** Lots of white space. Huge section gaps. Everything feels very expensive and clean.
- **4-7 (Daily App Mode):** Normal spacing for standard web apps.
- **8-10 (Cockpit Mode):** Tiny paddings. No card boxes; just 1px lines to separate data. Everything is packed. Mandatory: Use Monospace (`font-mono`) for all numbers.

### 7. AI Tells (Forbidden Patterns)

**Visual & CSS:**
- NO Neon/Outer Glows
- NO Pure Black (`#000000`). Use Off-Black, Zinc-950, or Charcoal.
- NO Oversaturated Accents
- NO Excessive Gradient Text
- NO Custom Mouse Cursors

**Typography:**
- NO Inter Font. Use Geist, Outfit, Cabinet Grotesk, or Satoshi.
- NO Oversized H1s. Control hierarchy with weight and color.
- Serif Constraints: Use Serif fonts ONLY for creative/editorial designs. NEVER on clean Dashboards.

**Layout & Spacing:**
- Ensure padding and margins are mathematically perfect.
- NO 3-Column Card Layouts. Use 2-column Zig-Zag, asymmetric grid, or horizontal scrolling instead.

**Content & Data:**
- NO Generic Names ("John Doe", "Sarah Chan", "Jack Su")
- NO Generic Avatars (standard SVG "egg" or Lucide user icons)
- NO Fake Numbers (avoid 99.99%, 50%, basic phone numbers)
- NO Startup Slop Names ("Acme", "Nexus", "SmartFlow")
- NO Filler Words (avoid "Elevate", "Seamless", "Unleash", "Next-Gen")

**External Resources:**
- NO Broken Unsplash Links. Use `https://picsum.photos/seed/{random_string}/800/600` or SVG UI Avatars.
- shadcn/ui Customization: NEVER in generic default state. Customize radii, colors, and shadows.

### 8. The Creative Arsenal (High-End Inspiration)

**Hero Paradigm:** Stop doing centered text over a dark image. Try asymmetric Hero sections with text cleanly aligned to the left or right.

**Navigation & Menus:**
- Mac OS Dock Magnification
- Magnetic Button
- Gooey Menu
- Dynamic Island
- Contextual Radial Menu
- Floating Speed Dial
- Mega Menu Reveal

**Layout & Grids:**
- Bento Grid (asymmetric, tile-based grouping)
- Masonry Layout (e.g., Pinterest)
- Chroma Grid
- Split Screen Scroll
- Curtain Reveal

**Cards & Containers:**
- Parallax Tilt Card
- Spotlight Border Card
- Glassmorphism Panel
- Holographic Foil Card
- Tinder Swipe Stack
- Morphing Modal

**Scroll Animations:**
- Sticky Scroll Stack
- Horizontal Scroll Hijack
- Locomotive Scroll Sequence
- Zoom Parallax
- Scroll Progress Path
- Liquid Swipe Transition

**Galleries & Media:**
- Dome Gallery
- Coverflow Carousel
- Drag-to-Pan Grid
- Accordion Image Slider
- Hover Image Trail
- Glitch Effect Image

**Typography & Text:**
- Kinetic Marquee
- Text Mask Reveal
- Text Scramble Effect
- Circular Text Path
- Gradient Stroke Animation
- Kinetic Typography Grid

**Micro-Interactions & Effects:**
- Particle Explosion Button
- Liquid Pull-to-Refresh
- Skeleton Shimmer
- Directional Hover Aware Button
- Ripple Click Effect
- Animated SVG Line Drawing
- Mesh Gradient Background
- Lens Blur Depth

### 9. The "Motion-Engine" Bento Paradigm

**A. Core Design Philosophy:**
- Aesthetic: High-end, minimal, and functional
- Palette: Background `#f9fafb`. Cards pure white (`#ffffff`) with 1px border `border-slate-200/50`
- Surfaces: Use `rounded-[2.5rem]` for all major containers. Apply "diffusion shadow" (`shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]`)
- Typography: Strict Geist, Satoshi, or Cabinet Grotesk. Use subtle `tracking-tight` for headers
- Labels: Titles and descriptions placed outside and below cards
- Pixel-Perfection: Use generous `p-8` or `p-10` padding inside cards

**B. The Animation Engine Specs (Perpetual Motion):**
- Spring Physics: No linear easing. Use `type: "spring", stiffness: 100, damping: 20`
- Layout Transitions: Heavily utilize `layout` and `layoutId` props
- Infinite Loops: Every card must have an "Active State" that loops infinitely
- Performance: Wrap dynamic lists in `<AnimatePresence>`. Any perpetual motion MUST be `React.memo`'d and isolated in its own microscopic Client Component

**C. The 5-Card Archetypes:**
- **The Intelligent List:** Vertical stack with infinite auto-sorting loop using `layoutId`
- **The Command Input:** Search/AI bar with multi-step Typewriter Effect
- **The Live Status:** Scheduling interface with "breathing" status indicators and pop-up notification badges
- **The Wide Data Stream:** Horizontal "Infinite Carousel" with seamless loop (`x: ["0%", "-100%"]`)
- **The Contextual UI (Focus Mode):** Document view with staggered highlight and floating action toolbar

### 10. Final Pre-Flight Check

- [ ] Is global state used appropriately to avoid deep prop-drilling rather than arbitrarily?
- [ ] Is mobile layout collapse (`w-full, px-4, max-w-7xl mx-auto`) guaranteed for high-variance designs?
- [ ] Do full-height sections safely use `min-h-[100dvh]` instead of the bugged `h-screen`?
- [ ] Do `useEffect` animations contain strict cleanup functions?
- [ ] Are empty, loading, and error states provided?
- [ ] Are cards omitted in favor of spacing where possible?
- [ ] Did you strictly isolate CPU-heavy perpetual animations in their own Client Components?

---

## 3. Design Engineering

Expert principles for UI polish, component craft, and animation decisions focused on performance and perceived speed.

**Views:** 270 | **Uses:** 10 | **Updated:** July 1, 2026
**Author:** emilkowalski | **Source:** emilkowalski/skill

**Keywords:** ui-design, ux-design, animation, motion, best-practices, components, css, performance

### Core Philosophy

**Taste is trained, not innate.** Good taste is not personal preference. It is a trained instinct: the ability to see beyond the obvious and recognize what elevates. Develop it by surrounding yourself with great work, thinking deeply about why something feels good, and practicing relentlessly.

**Unseen details compound.** Most details users never consciously notice. That is the point. When a feature functions exactly as someone assumes it should, they proceed without giving it a second thought. That is the goal.

> "All those unseen details combine to produce something that's just stunning, like a thousand barely audible voices all singing in tune." — Paul Graham

**Beauty is leverage.** People select tools based on the overall experience, not just functionality. Good defaults and good animations are real differentiators.

### Review Format (Required)

When reviewing UI code, use a markdown table with Before/After columns:

| Before | After | Why |
|--------|-------|-----|
| `transition: all 300ms` | `transition: transform 200ms ease-out` | Specify exact properties; avoid `all` |
| `transform: scale(0)` | `transform: scale(0.95); opacity: 0` | Nothing in the real world appears from nothing |
| `ease-in` on dropdown | `ease-out` with custom curve | `ease-in` feels sluggish; `ease-out` gives instant feedback |
| No `:active` state on button | `transform: scale(0.97)` on `:active` | Buttons must feel responsive to press |
| `transform-origin: center` on popover | `transform-origin: var(--radix-popover-content-transform-origin)` | Popovers should scale from their trigger |

### The Animation Decision Framework

**1. Should this animate at all?**

| Frequency | Decision |
|-----------|----------|
| 100+ times/day (keyboard shortcuts, command palette) | No animation. Ever. |
| Tens of times/day (hover effects, list navigation) | Remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare/first-time (onboarding, feedback forms) | Can add delight |

Never animate keyboard-initiated actions.

**2. What is the purpose?**
Valid purposes: Spatial consistency, State indication, Explanation, Feedback, Preventing jarring changes.

**3. What easing should it use?**
- Element entering or exiting → `ease-out`
- Moving/morphing on screen → `ease-in-out`
- Hover/color change → `ease`
- Constant motion (marquee, progress bar) → `linear`

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Never use `ease-in` for UI animations. It starts slow, making the interface feel sluggish.

**4. How fast should it be?**

| Element | Duration |
|---------|----------|
| Button press feedback | 100-160ms |
| Tooltips, small popovers | 125-200ms |
| Dropdowns, selects | 150-250ms |
| Modals, drawers | 200-500ms |
| Marketing/explanatory | Can be longer |

Rule: UI animations should stay under 300ms.

### Spring Animations

Springs feel more natural than duration-based animations because they simulate real physics.

**Configuration:**
```js
// Apple's approach (recommended)
{ type: "spring", duration: 0.5, bounce: 0.2 }

// Traditional physics
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

Keep bounce subtle (0.1-0.3). Avoid bounce in most UI contexts. Use it for drag-to-dismiss and playful interactions.

**Interruptibility advantage:** Springs maintain velocity when interrupted. CSS animations and keyframes restart from zero.

### Component Building Principles

**Buttons must feel responsive:**
```css
.button {
  transition: transform 160ms ease-out;
}
.button:active {
  transform: scale(0.97);
}
```

**Never animate from `scale(0)`:** Start from `scale(0.95)` or higher, combined with opacity.

**Make popovers origin-aware:** Use `transform-origin: var(--radix-popover-content-transform-origin)` for Radix UI. Exception: modals keep `transform-origin: center`.

**Tooltips: skip delay on subsequent hovers:**
```css
.tooltip[data-instant] {
  transition-duration: 0ms;
}
```

**Use CSS transitions over keyframes for interruptible UI.** Transitions can be interrupted and retargeted mid-animation. Keyframes restart from zero.

**Use blur to mask imperfect transitions:** Add subtle `filter: blur(2px)` during crossfade transitions. Keep blur under 20px.

**Animate enter states with `@starting-style`:**
```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 400ms ease, transform 400ms ease;
  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

### CSS Transform Mastery

- `translateY` with percentages: Use `translateY(100%)` to move an element by its own height
- `scale()` scales children too
- 3D transforms: `rotateX()`, `rotateY()` with `transform-style: preserve-3d` for depth
- `transform-origin`: Set to match where the trigger lives

### `clip-path` for Animation

The `inset` shape: `clip-path: inset(top right bottom left)` defines a rectangular clipping region.

**Patterns:**
- **Tabs with perfect color transitions:** Duplicate the tab list, clip the copy so only the active tab is visible
- **Hold-to-delete pattern:** `clip-path: inset(0 100% 0 0)` on a colored overlay, transition to `inset(0 0 0 0)` over 2s on `:active`
- **Image reveals on scroll:** Start with `clip-path: inset(0 0 100% 0)`, animate to `inset(0 0 0 0)`
- **Comparison sliders:** Overlay two images, clip the top one with `clip-path: inset(0 50% 0 0)`

### Gesture and Drag Interactions

- **Momentum-based dismissal:** Calculate velocity (`dragDistance / elapsedTime`). If velocity exceeds ~0.11, dismiss regardless of distance.
- **Damping at boundaries:** Apply damping when user drags past natural boundary
- **Pointer capture for drag:** Set element to capture all pointer events once dragging starts
- **Multi-touch protection:** Ignore additional touch points after initial drag begins
- **Friction instead of hard stops:** Allow over-drag with increasing friction

### Performance Rules

- Only animate `transform` and `opacity`
- CSS variables are inheritable—update `transform` directly on the element instead
- Framer Motion shorthand properties (`x`, `y`, `scale`) are NOT hardware-accelerated. Use full `transform` string under load.
- CSS animations beat JS under load (off main thread)
- Use WAAPI for programmatic CSS animations

```js
element.animate([
  { clipPath: 'inset(0 0 100% 0)' },
  { clipPath: 'inset(0 0 0 0)' }
], {
  duration: 1000,
  fill: 'forwards',
  easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
});
```

### Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  .element {
    animation: fade 0.2s ease;
    /* No transform-based motion */
  }
}

@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: scale(1.05);
  }
}
```

### The Sonner Principles

- Developer experience is key. No hooks, no context, no complex setup.
- Good defaults matter more than options.
- Naming creates identity.
- Handle edge cases invisibly.
- Use transitions, not keyframes, for dynamic UI.
- Build a great documentation site.
- Cohesion matters—match motion to mood.

### Asymmetric Enter/Exit Timing

Pressing should be slow when deliberate (hold-to-delete: 2s linear), but release should always be snappy (200ms ease-out).

### Stagger Animations

Keep stagger delays short (30-80ms between items). Never block interaction while stagger animations are playing.

### Debugging Animations

- Slow motion testing: temporarily increase duration to 2-5x
- Frame-by-frame inspection in Chrome DevTools
- Test on real devices for touch interactions
- Review your work the next day

### Review Checklist

| Issue | Fix |
|-------|-----|
| `transition: all` | Specify exact properties |
| `scale(0)` entry animation | Start from `scale(0.95)` with `opacity: 0` |
| `ease-in` on UI element | Switch to `ease-out` or custom curve |
| `transform-origin: center` on popover | Set to trigger location |
| Animation on keyboard action | Remove animation entirely |
| Duration > 300ms on UI element | Reduce to 150-250ms |
| Hover animation without media query | Add `@media (hover: hover) and (pointer: fine)` |
| Keyframes on rapidly-triggered element | Use CSS transitions |
| Framer Motion `x`/`y` props under load | Use `transform: "translateX()"` |
| Same enter/exit transition speed | Make exit faster than enter (e.g., enter 2s, exit 200ms) |
| Elements all appear at once | Add stagger delay (30-80ms) |

---

## 4. Interaction Design

Design and implement purposeful UI motion, microinteractions, and feedback patterns to enhance usability and user delight.

**Views:** 4.9k | **Uses:** 476 | **Updated:** July 1, 2026
**Author:** wshobson | **Source:** wshobson/agents

**Keywords:** ux-design, ui-design, animation, micro-interactions, transitions, best-practices, javascript, css

### Core Principles

**1. Purposeful Motion:**
- **Feedback:** Confirm user actions occurred
- **Orientation:** Show where elements come from/go to
- **Focus:** Direct attention to important changes
- **Continuity:** Maintain context during transitions

**2. Timing Guidelines:**

| Duration | Use Case |
|----------|----------|
| 100-150ms | Micro-feedback (hovers, clicks) |
| 200-300ms | Small transitions (toggles, dropdowns) |
| 300-500ms | Medium transitions (modals, page changes) |
| 500ms+ | Complex choreographed animations |

**3. Easing Functions:**
```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in: cubic-bezier(0.55, 0, 1, 0.45);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Quick Start: Button Microinteraction

```jsx
import { motion } from "framer-motion";

export function InteractiveButton({ children, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      {children}
    </motion.button>
  );
}
```

### Interaction Patterns

**1. Loading States:**

```jsx
function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-48 bg-gray-200 rounded-lg" />
      <div className="mt-4 h-4 bg-gray-200 rounded w-3/4" />
      <div className="mt-2 h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}
```

```jsx
function ProgressBar({ progress }) {
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-blue-600"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ ease: "easeOut" }}
      />
    </div>
  );
}
```

**2. State Transitions:**
```jsx
function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <motion.span
        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow"
        animate={{ x: checked ? 24 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
```

**3. Page Transitions:**
```jsx
import { AnimatePresence, motion } from "framer-motion";

function PageTransition({ children, key }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**4. Feedback Patterns (Ripple Effect):**
```jsx
function RippleButton({ children, onClick }) {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ripple = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: Date.now(),
    };
    setRipples((prev) => [...prev, ripple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
    }, 600);
    onClick?.(e);
  };

  return (
    <button onClick={handleClick} className="relative overflow-hidden">
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full animate-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </button>
  );
}
```

**5. Gesture Interactions (Swipe to Dismiss):**
```jsx
function SwipeCard({ children, onDismiss }) {
  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100) {
          onDismiss();
        }
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </motion.div>
  );
}
```

### CSS Animation Patterns

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-fadeIn { animation: fadeIn 0.3s ease-out; }
.animate-pulse { animation: pulse 2s ease-in-out infinite; }
.animate-spin { animation: spin 1s linear infinite; }
```

### Accessibility Considerations

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Best Practices

- Performance First: Use `transform` and `opacity` for smooth 60fps
- Reduce Motion Support: Always respect `prefers-reduced-motion`
- Consistent Timing: Use a timing scale across the app
- Natural Physics: Prefer spring animations over linear
- Interruptible: Allow users to cancel long animations
- Progressive Enhancement: Work without JS animations
- Test on Devices: Performance varies significantly

### Common Issues

- Janky Animations: Avoid animating `width`, `height`, `top`, `left`
- Over-animation: Too much motion causes fatigue
- Blocking Interactions: Never prevent user input during animations
- Memory Leaks: Clean up animation listeners on unmount
- Flash of Content: Use `will-change` sparingly

---

## 5. Responsive Design

Master modern responsive design techniques using container queries, fluid typography, CSS Grid, and mobile-first strategies for adaptive interfaces.

**Views:** 2k | **Uses:** 230 | **Updated:** July 1, 2026
**Author:** wshobson | **Source:** wshobson/agents

**Keywords:** responsive, mobile-first, layout, css, web-design, ux-design, best-practices

### Core Capabilities

1. **Container Queries** — Component-level responsiveness independent of viewport
2. **Fluid Typography & Spacing** — CSS `clamp()` for fluid scaling
3. **Layout Patterns** — CSS Grid for 2D, Flexbox for 1D
4. **Breakpoint Strategy** — Mobile-first media queries, content-based breakpoints

### Quick Reference: Modern Breakpoint Scale

```css
/* Mobile-first breakpoints */
@media (min-width: 640px)  { /* sm: Landscape phones, small tablets */ }
@media (min-width: 768px)  { /* md: Tablets */ }
@media (min-width: 1024px) { /* lg: Laptops, small desktops */ }
@media (min-width: 1280px) { /* xl: Desktops */ }
@media (min-width: 1536px) { /* 2xl: Large desktops */ }
```

### Pattern 1: Container Queries

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 1rem;
  }
}

@container card (min-width: 600px) {
  .card-title { font-size: 1.5rem; }
}

/* Container query units */
.card-title {
  font-size: clamp(1rem, 5cqi, 2rem);
}
```

```jsx
function ResponsiveCard({ title, image, description }) {
  return (
    <div className="@container">
      <article className="flex flex-col @md:flex-row @md:gap-4">
        <img
          src={image}
          alt=""
          className="w-full @md:w-48 @lg:w-64 aspect-video @md:aspect-square object-cover"
        />
        <div className="p-4 @md:p-0">
          <h2 className="text-lg @md:text-xl @lg:text-2xl font-semibold">{title}</h2>
          <p className="mt-2 text-muted-foreground @md:line-clamp-3">{description}</p>
        </div>
      </article>
    </div>
  );
}
```

### Pattern 2: Fluid Typography

```css
:root {
  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
  --text-xl: clamp(1.25rem, 1rem + 1.25vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 1.25rem + 1.25vw, 2rem);
  --text-3xl: clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem);
  --text-4xl: clamp(2.25rem, 1.75rem + 2.5vw, 3.5rem);
}
```

```js
function fluidValue(minSize, maxSize, minWidth = 320, maxWidth = 1280) {
  const slope = (maxSize - minSize) / (maxWidth - minWidth);
  const yAxisIntersection = -minWidth * slope + minSize;
  return `clamp(${minSize}rem, ${yAxisIntersection.toFixed(4)}rem + ${(slope * 100).toFixed(4)}vw, ${maxSize}rem)`;
}
```

### Pattern 3: CSS Grid Responsive Layout

```css
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 1.5rem;
}
```

```jsx
function ProductGrid({ products }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Pattern 4: Responsive Navigation

```jsx
function ResponsiveNav({ items }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="relative">
      <button
        className="lg:hidden p-2"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="nav-menu"
      >
        <span className="sr-only">Toggle navigation</span>
        {isOpen ? <X /> : <Menu />}
      </button>

      <ul
        id="nav-menu"
        className={`absolute top-full left-0 right-0 bg-background border-b flex flex-col lg:static lg:flex lg:flex-row lg:border-0 lg:bg-transparent ${isOpen ? "flex" : "hidden"} lg:flex`}
      >
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href} className="block px-4 py-3 lg:px-3 lg:py-2 hover:bg-muted lg:hover:bg-transparent lg:hover:text-primary">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Pattern 5: Responsive Images

```html
<picture>
  <source media="(min-width: 1024px)" srcSet="/hero-wide.webp" type="image/webp" />
  <source media="(min-width: 768px)" srcSet="/hero-medium.webp" type="image/webp" />
  <source srcSet="/hero-mobile.webp" type="image/webp" />
  <img src="/hero-mobile.jpg" alt="Hero image description" class="w-full h-auto" loading="eager" fetchpriority="high" />
</picture>
```

### Pattern 6: Responsive Tables

```jsx
function ResponsiveDataTable({ data, columns }) {
  return (
    <>
      {/* Desktop table */}
      <table className="hidden md:table w-full">{/* ... */}</table>
      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {data.map((row, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between">
                <span className="font-medium text-muted-foreground">{col.label}</span>
                <span>{row[col.key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
```

### Viewport Units

```css
.full-height-dynamic { height: 100dvh; }  /* Accounts for mobile browser UI */
.min-full-height { min-height: 100svh; }
.max-full-height { max-height: 100lvh; }
```

### Best Practices

- Mobile-First: Start with mobile styles, enhance for larger screens
- Content Breakpoints: Set breakpoints based on content, not devices
- Fluid Over Fixed: Use fluid values for typography and spacing
- Container Queries: Use for component-level responsiveness
- Test Real Devices: Simulators don't catch all issues
- Touch Targets: Maintain 44x44px minimum on mobile

### Common Issues

- Horizontal Overflow: Content breaking out of viewport
- Fixed Widths: Using `px` instead of relative units
- Viewport Height: `100vh` issues on mobile browsers
- Font Size: Text too small on mobile
- Touch Targets: Buttons too small to tap accurately

---

## 6. Taste Skill

A framework of portable agent skills to upgrade AI-built interfaces with high-end typography, motion, and layout instead of boilerplate code.

**Views:** 213 | **Uses:** 13 | **Updated:** July 1, 2026
**Author:** Leonxlnx | **Source:** Leonxlnx/taste-skill

**Keywords:** web-design, ui-design, ux-design, animation, ai, best-practices, visual-design, typography

> The Anti-Slop Frontend Framework for AI Agents

### Available Skills

| Skill | Install Name | Description |
|-------|-------------|-------------|
| taste-skill | design-taste-frontend | v2 (experimental) - substantial rewrite. Reads the brief, infers design language, tunes three dials (VARIANCE / MOTION / DENSITY). |
| taste-skill-v1 | design-taste-frontend-v1 | Original v1 preserved for projects depending on exact behavior. |
| gpt-tasteskill | gpt-taste | Stricter variant for GPT/Codex: higher layout variance, stronger GSAP direction, aggressive anti-slop. |
| image-to-code-skill | image-to-code | Image-first pipeline: generate site references, analyze, then implement. |
| redesign-skill | redesign-existing-projects | Audit the UI first, then fix layout, spacing, hierarchy, styling. |
| soft-skill | high-end-visual-design | Polished, calm, expensive UI with softer contrast, whitespace, premium fonts, spring motion. |
| output-skill | full-output-enforcement | Full output enforcement — no placeholder comments. |
| minimalist-skill | minimalist-ui | Editorial product UI (Notion/Linear vibes), restrained palette, crisp structure. |
| brutalist-skill | industrial-brutalist-ui | Hard mechanical language: Swiss type, sharp contrast, experimental layout. |
| stitch-skill | stitch-design-taste | Google Stitch-compatible rules, including optional DESIGN.md export format. |

### Image Generation Skills

| Skill | Install Name | Description |
|-------|-------------|-------------|
| imagegen-frontend-web | imagegen-frontend-web | Website comps: hero, landing, multi-section with strong typography, spacing, anti-slop art direction. |
| imagegen-frontend-mobile | imagegen-frontend-mobile | Mobile screens and flows: iOS/Android/cross-platform, mockups, readable type, coherent sets. |
| brandkit | brandkit | Brand-kit boards: logo directions, palettes, type, identity applications across categories. |

### Which One to Use?

- Start with **taste-skill** for the safest general default (v2 experimental)
- Use **gpt-taste** for stricter GPT/Codex-oriented rules
- Use **image-to-code-skill** for image → analyze → code workflows
- Use **redesign-skill** to improve existing codebases
- Add **soft-skill**, **minimalist-skill**, or **brutalist-skill** when visual direction is already chosen
- Add **output-skill** if the agent keeps truncating output

### Settings (taste-skill only)

Numbers are 1-10 dials:
- `DESIGN_VARIANCE`: Layout experimentation (lower: centered/clean, higher: asymmetric/modern)
- `MOTION_INTENSITY`: Animation depth (lower: hover, higher: scroll/magnetic)
- `VISUAL_DENSITY`: Information per viewport (lower: spacious, higher: dense dashboards)

---

## 7. GSAP Web Animation Skill

Guide to implementing and debugging professional GSAP-based web animations, timelines, and ScrollTrigger interactions.

**Views:** 4.1k | **Uses:** 423 | **Updated:** July 1, 2026
**Author:** MengTo | **Source:** MengTo/Skills

**Keywords:** animation, motion, micro-interactions, scroll-effects, javascript, react, performance, best-practices

### When to Use

- High-quality UI/motion design: entrances, micro-interactions, page transitions
- Timeline-based sequences (vs. scattered CSS transitions)
- Scroll-driven storytelling (with ScrollTrigger)
- Complex easing, staggering, orchestration across many elements

### Key Concepts & APIs

**Tweens:**
```js
gsap.to(targets, vars)
gsap.from(targets, vars)
gsap.fromTo(targets, fromVars, toVars)
```

**Timelines:**
```js
const tl = gsap.timeline({ defaults, repeat, yoyo, paused });
tl.to(...).from(...).addLabel('x').add(() => ...)
// Position parameter: absolute 1.2, relative "+=0.5", overlap "-=0.3", label "intro"
```

**Eases:** `"power2.out"`, `"expo.inOut"`, `"elastic.out(1, 0.3)"`

**Staggers:** `stagger: 0.05` or `{ each, from: "start|center|end|random", grid }`

**Performance-friendly properties:** Prefer transforms (`x`, `y`, `scale`, `rotation`) and opacity (`autoAlpha`)

**ScrollTrigger (plugin):**
```js
gsap.registerPlugin(ScrollTrigger);

// Inline
gsap.to(".box", { scrollTrigger: ".box", x: 500 });

// Advanced
gsap.to(".box", {
  scrollTrigger: { trigger, start, end, scrub, pin, snap, markers },
  x: 500
});

// Standalone
ScrollTrigger.create({ trigger, start, end, onUpdate, onToggle });
```

### Common Pitfalls (and Fixes)

| Pitfall | Fix |
|---------|-----|
| Animating layout properties (`top`/`left`/`width`/`height`) — jank | Use transforms, add `will-change: transform`, avoid forced reflow |
| ScrollTrigger "not firing" | Ensure trigger exists, has height, and check scroll container (nested scrolling needs config) |
| Not cleaning up in SPA/React | Use `gsap.context()` and revert on unmount; kill triggers if needed |
| FOUC / measuring before fonts/images load | Initialize after layout is stable; run `ScrollTrigger.refresh()` after images load |

### Quick Recipes

**1. Hero Entrance (Stagger):**
```js
gsap.from(".hero [data-anim]", {
  y: 24,
  autoAlpha: 0,
  duration: 0.8,
  ease: "power2.out",
  stagger: 0.06,
});
```

**2. Sequenced Timeline:**
```js
const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 0.6 } });
tl.from(".nav", { y: -20, autoAlpha: 0 })
  .from(".hero-title", { y: 30, autoAlpha: 0 }, "-=0.2")
  .from(".hero-cta", { scale: 0.95, autoAlpha: 0 }, "-=0.2");
```

**3. Scroll-Scrub Pinned Section:**
```js
gsap.registerPlugin(ScrollTrigger);

gsap.timeline({
  scrollTrigger: {
    trigger: ".story",
    start: "top top",
    end: "+=800",
    scrub: 1,
    pin: true,
  },
}).to(".story .panel", { xPercent: -200 });
```

### React/Next.js Patterns

```jsx
import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

function ScrollSection() {
  const ref = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(ref.current, {
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
          end: "top 20%",
          scrub: true,
        },
        y: 50,
        opacity: 0,
        duration: 1,
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return <div ref={ref}>Content</div>;
}
```

---

## 8. UI Audit and Quality Review

A systematic quality review framework covering accessibility, interaction, typography, and layout with a self-improvement protocol for design evolution.

**Views:** 102 | **Uses:** 14 | **Updated:** July 1, 2026
**Author:** Big Yoshi

**Keywords:** ui-design, accessibility, ux-design, best-practices, components, typography, layout, performance

### When to Use

Final-pass quality review before shipping — concrete, actionable findings across accessibility, interaction, forms, typography, navigation, layout, performance, and motion.

### Priority Order

**CRITICAL** — Accessibility (semantic HTML, keyboard nav), form validation, missing labels
**HIGH** — Typography readability, navigation clarity, layout visual hierarchy, load states, motion accessibility
**MEDIUM** — Copy clarity and microcopy tone

### Workflow

1. Identify changed/new surfaces to audit
2. Run CRITICAL checks (accessibility, keyboard, forms) first
3. Run HIGH checks (typography, navigation, layout, performance, motion)
4. Run MEDIUM checks (content, microcopy)
5. Report findings grouped by file with priority, description, and fix

### Reporting Format

```
[CRITICAL] src/components/Modal.tsx:12
Issue: Dialog has no aria-labelledby — screen readers won't announce the title
Fix: Add aria-labelledby="modal-title" to <dialog>, id="modal-title" to <h2>

✓ src/components/Button.tsx — pass
```

### Re-verification

After fixes are applied, re-audit touched files to confirm resolution. Mark as resolved only when re-audit passes.

### Self-Improvement Protocol

After completing any design task, apply this lightweight loop:

**After Each Task:**
- **What worked?** — Note any design decision that produced a noticeably good result
- **What felt generic?** — Note any default you reached for reflexively that could have been more intentional
- **What did the user respond to?** — If the user said "yes, exactly that" or iterated positively on something specific, that's signal

**Persistent Preferences:**
When the user expresses a preference (explicit or implicit), log it as a standing directive:
- "I don't like being rigid with design" → Always enter creative-agency mode
- "Award-winning / viral" → Default to distinctive over safe
- Artistic latitude given → Commit to a strong POV; state it briefly; execute without hedging

**Anti-Drift Check:**
Before any creative decision, ask: "Would a skilled human designer be proud of this choice, or is this what a template would produce?" If it's the latter, make a different choice.

**Evolution Principle:**
Skills in this catalog are starting points. If a pattern produces consistently weak results in practice, adapt the approach. If a technique from another skill produces notably better output when combined, apply it proactively across all design work — don't wait to be asked.

---

## Workflow Summary

Think of it as this pipeline:

```
Foundation         → 1. UI Design System
Architecture       → 2. High-Agency Frontend Skill
Implementation     → 3. Design Engineering
UX Layer           → 4. Interaction Design
                   → 5. Responsive Design
Visual Polish      → 6. Taste Skill
                   → 7. GSAP Web Animation Skill
Final Validation   → 8. UI Audit and Quality Review
```

**System → Architecture → UX → Visuals → Motion → QA**

This ordering gives the best results in agentic coding because each layer builds on the previous one. Placing Taste or GSAP too early tends to produce pretty but structurally weak UI.

# UI.md - Verida AI: Complete Interface Specification
# The definitive pixel-level, interaction-level, state-level UI build guide.
# Drop this file in your project root. Every frontend decision is made here.
# Nothing is left to interpretation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 0 - DESIGN PHILOSOPHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONCEPT: "Scientific Instrument meets Financial Terminal"
══════════════════════════════════════════════════════════
Verida AI is not a social platform. It is not a consumer app.
It is a trust infrastructure layer for serious AI teams.
The UI communicates: precision, cryptographic depth, and verifiable truth.

Think: Bloomberg Terminal (data density, monospace values, live updates)
      x Linear (clean dark surfaces, clear hierarchy, fast interactions)
      x Etherscan (on-chain proof visibility, hash displays, explorer links)

ONE SENTENCE TEST - every screen must pass:
"This is where serious AI teams go to trust their training data."

WHAT THIS MEANS FOR EVERY DESIGN DECISION:
  ✓ Data density is good. Dense ≠ cluttered.
  ✓ Monospace fonts for all cryptographic values - always.
  ✓ Every hash, every address, every ID must be visible and copyable.
  ✓ Teal is trust. It appears when data is verified. Not decoratively.
  ✓ Red is a real signal. Only use it when data is genuinely tampered.
  ✓ Empty screens feel broken. Every empty state has a clear CTA.
  ✓ Loading never blocks. Skeletons fill every async gap.
  ✓ Mobile is second-class but functional. Desktop is primary.
  ✓ Animations are purposeful. Progress bar, verify animation, receipt reveal.
  ✓ No gradients. No glass morphism. No floating orbs. This is not web3 hype.

AESTHETIC DIRECTION: Dark Scientific Terminal
  Background: near-black navy (#070b14 - the void of deep space)
  Surfaces: charcoal panels, barely elevated from background
  Text: cool slate whites and grays
  Accent: electric teal - exactly one accent color, used with discipline
  Status: semantic green/red/amber for verification states only
  Grid: subtle dot/line grid visible on hero and full-bleed sections
  Typography: DM Sans (clean, humanist, readable) + Space Mono (data, hashes)

WHAT MAKES VERIDA VISUALLY UNIQUE FROM OTHER WEB3 APPS:
  1. Monospace hash displays are FIRST-CLASS UI elements, not afterthoughts
  2. The ProvenanceTree is a centerpiece - timeline of cryptographic proof
  3. IntegrityBadge is the most important UI element on every dataset page
  4. Upload progress shows Shelby Protocol stages (Clay encoding, chunk dist.)
  5. Every dataset card shows its merkleRoot snippet - trust is visible


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 - DESIGN TOKEN SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1.1 COLOR TOKENS - Full System
═══════════════════════════════
Paste verbatim into apps/web/app/globals.css inside :root {}

/* --- BACKGROUND LAYERS --- */
/* Rule: never skip a layer. bg-void to bg-base to bg-surface to bg-raised */
--bg-void:          #070b14;  /* true page background - the "space" */
--bg-base:          #0a0e1a;  /* primary surface - navbar, page content area */
--bg-surface:       #111827;  /* cards, panels, sidebars, table rows */
--bg-raised:        #1a2236;  /* elevated: dropdowns, modals, tooltips, inputs */
--bg-overlay:       #1e293b;  /* hover states, selected rows, active items */
--bg-scrim:         rgba(7, 11, 20, 0.85); /* modal backdrop / dimming layer */

/* --- BORDER SYSTEM --- */
/* 3 levels: use tertiary by default, step up on hover/focus/active */
--border-dim:       rgba(255,255,255,0.04);  /* barely visible - section dividers */
--border-subtle:    rgba(255,255,255,0.07);  /* default card border */
--border-mid:       rgba(255,255,255,0.12);  /* hover border */
--border-strong:    rgba(255,255,255,0.20);  /* focused/active element border */
--border-teal:      rgba(0, 212, 200, 0.40); /* teal-accented borders */
--border-danger:    rgba(239, 68,  68,  0.40);
--border-warning:   rgba(245, 158, 11,  0.40);
--border-success:   rgba(34,  197, 94,  0.40);

/* --- ACCENT - ELECTRIC TEAL --- */
/* Used ONLY for: verified state, active selection, primary CTA */
/* Never use for decorative purposes. Teal = trust = verified. */
--teal-100:         #ccfaf8;  /* lightest - text on dark teal bg */
--teal-200:         #99f4f0;
--teal-300:         #5de8e2;
--teal-400:         #00d4c8;  /* PRIMARY TEAL - most used */
--teal-500:         #00b5a8;  /* hover state of primary teal */
--teal-600:         #008f86;  /* active/pressed state */
--teal-700:         #006b64;  /* dark teal - borders on teal bg */
--teal-glow-xs:     rgba(0, 212, 200, 0.05);  /* barely visible bg tint */
--teal-glow-sm:     rgba(0, 212, 200, 0.08);  /* subtle bg tint for hover */
--teal-glow-md:     rgba(0, 212, 200, 0.12);  /* clear teal tint */
--teal-glow-lg:     rgba(0, 212, 200, 0.18);  /* strong teal tint - selected */

/* --- SEMANTIC STATUS COLORS --- */
/* danger = TAMPERED or ERROR. Not "warning". Datasets are wrong, not risky. */
--danger-400:       #ef4444;
--danger-300:       #f87171;
--danger-200:       #fca5a5;
--danger-bg-sm:     rgba(239, 68,  68,  0.08);
--danger-bg-md:     rgba(239, 68,  68,  0.14);
--danger-bg-lg:     rgba(239, 68,  68,  0.20);
--danger-border:    rgba(239, 68,  68,  0.35);

--warning-400:      #f59e0b;
--warning-300:      #fbbf24;
--warning-200:      #fcd34d;
--warning-bg-sm:    rgba(245, 158, 11,  0.08);
--warning-bg-md:    rgba(245, 158, 11,  0.14);
--warning-border:   rgba(245, 158, 11,  0.35);

--success-400:      #22c55e;
--success-300:      #4ade80;
--success-200:      #86efac;
--success-bg-sm:    rgba(34,  197, 94,  0.08);
--success-bg-md:    rgba(34,  197, 94,  0.14);
--success-border:   rgba(34,  197, 94,  0.35);

--info-400:         #3b82f6;
--info-300:         #60a5fa;
--info-bg-sm:       rgba(59,  130, 246, 0.08);
--info-bg-md:       rgba(59,  130, 246, 0.14);
--info-border:      rgba(59,  130, 246, 0.35);

/* --- TEXT SYSTEM --- */
--text-primary:     #f1f5f9;   /* headings, labels, primary content */
--text-secondary:   #94a3b8;   /* body copy, descriptions */
--text-tertiary:    #64748b;   /* metadata, timestamps, helper text */
--text-quaternary:  #475569;   /* placeholders, very subtle labels */
--text-disabled:    #2d3748;   /* disabled inputs, greyed-out states */
--text-teal:        #00d4c8;   /* teal text - links, active states, accent */
--text-teal-muted:  #5de8e2;   /* softer teal - less prominent teal text */
--text-danger:      #f87171;   /* error messages, tampered state */
--text-warning:     #fbbf24;   /* warning messages, pending state */
--text-success:     #4ade80;   /* verified state, success messages */
--text-info:        #60a5fa;   /* informational text */

/* --- SPECIAL --- */
--grid-line:        rgba(255,255,255,0.03); /* hero background grid lines */
--shimmer-base:     rgba(255,255,255,0.04); /* skeleton base */
--shimmer-shine:    rgba(255,255,255,0.08); /* skeleton shimmer highlight */

1.2 TYPOGRAPHY SYSTEM - Full Spec
══════════════════════════════════

FONT LOADING (add to <head> in layout.tsx):
  Google Fonts URL:
  https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap

FONT ROLES:
  DM Sans   -> All UI text: headings, body, labels, buttons, nav, descriptions
              Weights used: 300 (light captions), 400 (body), 500 (emphasis/headings)
  Space Mono -> ONLY cryptographic values: addresses, hashes, IDs, version numbers,
              latency numbers, byte counts, timestamps in data tables
              Weights used: 400 (standard), 700 (emphasized hash in large display)

  CRITICAL RULE: Never use Space Mono for UI labels, button text, or descriptions.
  Never use DM Sans for addresses, merkleRoots, txHashes, blobIds, or contentHashes.
  The visual contrast between the two fonts IS the design language.

TYPE SCALE:
  --text-10:  10px / 1.4  DM Sans 400  -> micro labels, version tags
  --text-11:  11px / 1.5  DM Sans 400  -> badges, very small metadata
  --text-12:  12px / 1.5  DM Sans 400  -> small body, card metadata
  --text-13:  13px / 1.6  DM Sans 400  -> standard body, form labels
  --text-14:  14px / 1.6  DM Sans 400  -> base body (html default)
  --text-15:  15px / 1.6  DM Sans 500  -> emphasized body, subheadings
  --text-17:  17px / 1.5  DM Sans 500  -> card titles, section headings
  --text-20:  20px / 1.4  DM Sans 500  -> page subheadings, modal titles
  --text-24:  24px / 1.3  DM Sans 500  -> stat numbers, medium headings
  --text-30:  30px / 1.2  DM Sans 500  -> page headings (H1 on inner pages)
  --text-38:  38px / 1.15 DM Sans 400  -> hero heading line 1 (normal weight!)
  --text-48:  48px / 1.1  DM Sans 300  -> large hero numbers (light weight)

  MONO SCALE:
  --mono-10:  10px / 1.4  Space Mono 400 -> tiny hash snippets
  --mono-11:  11px / 1.5  Space Mono 400 -> standard hash display
  --mono-12:  12px / 1.5  Space Mono 400 -> address display
  --mono-13:  13px / 1.6  Space Mono 400 -> larger data values
  --mono-14:  14px / 1.5  Space Mono 400 -> countdown timer
  --mono-16:  16px / 1.4  Space Mono 700 -> large stat (e.g. upload progress %)
  --mono-24:  24px / 1.2  Space Mono 700 -> hero data display (latency, etc.)

LETTER SPACING:
  Normal text:    default (0)
  Uppercase labels:  0.08em (always use with text-transform: uppercase)
  Mono hashes:    0.01em  (slight tracking improves readability)
  Large mono:     -0.01em (compensate for wide mono at large sizes)

LINE HEIGHT:
  Tight (headings):   1.2
  Normal (body):      1.6
  Loose (long copy):  1.75

1.3 SPACING SYSTEM
═══════════════════
Base unit: 4px. Every spacing value is a multiple of 4.

--sp-1:   4px    (micro gaps: icon-to-label, badge internal padding)
--sp-2:   8px    (tight: form element internal, badge padding)
--sp-3:   12px   (compact: card internal gap, form group gap)
--sp-4:   16px   (standard: card padding, section gap)
--sp-5:   20px   (medium: larger card padding)
--sp-6:   24px   (section: between major blocks on a page)
--sp-8:   32px   (large: between sections)
--sp-10:  40px   (xlarge: hero section padding)
--sp-12:  48px   (2xl: section top/bottom padding)
--sp-16:  64px   (3xl: major section gaps)
--sp-20:  80px   (4xl: hero padding)

1.4 BORDER RADIUS
═════════════════
--r-sm:    4px    (small elements: badges, chips, small buttons)
--r-md:    6px    (standard: inputs, dropdowns, table badges)
--r-lg:    10px   (cards, panels, modal containers)
--r-xl:    14px   (large cards, modals)
--r-2xl:   20px   (hero elements, drop zone)
--r-full:  9999px (pills, tags, circular elements)

1.5 Z-INDEX SYSTEM
══════════════════
--z-base:        0    (standard flow)
--z-raised:      10   (sticky table headers)
--z-sticky:      50   (filter bar, sticky sidebars)
--z-navbar:      100  (navbar - above all page content)
--z-dropdown:    200  (dropdowns, select menus)
--z-tooltip:     300  (tooltips - above dropdowns)
--z-modal-back:  400  (modal backdrop scrim)
--z-modal:       500  (modal container)
--z-toast:       600  (toast notifications - always on top)

1.6 SHADOW SYSTEM
═════════════════
No decorative shadows. Only functional elevation shadows:

--shadow-sm:   0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
               /* subtle: dropdown, tooltip */
--shadow-md:   0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3);
               /* modal, elevated panel */
--shadow-teal: 0 0 0 3px rgba(0,212,200,0.25);
               /* focus ring on teal-accented elements */
--shadow-input-focus: 0 0 0 2px rgba(0,212,200,0.35);
               /* focus ring on all focusable inputs */

1.7 GRID BACKGROUND PATTERN
════════════════════════════
Used on: hero section, full-bleed landing sections.
NOT used on: cards, panels, data-dense areas.

CSS implementation:
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 48px 48px;
  background-position: center center;

Dot variant (alternative for hero):
  background-image: radial-gradient(
    circle, rgba(255,255,255,0.06) 1px, transparent 1px
  );
  background-size: 24px 24px;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 - GLOBAL COMPONENT PRIMITIVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2.1 BUTTON SYSTEM - Every Variant
═══════════════════════════════════

PRIMARY BUTTON (btn-primary):
  Use for: main CTAs, form submits, purchase actions
  Background:      var(--teal-400)        #00d4c8
  Text color:      #000000 (true black - maximum contrast on teal)
  Font:            DM Sans 13px / 500
  Height:          36px
  Padding:         0 16px
  Border-radius:   var(--r-md) = 6px
  Border:          none
  Letter-spacing:  -0.01em

  HOVER:
    Background: var(--teal-500) #00b5a8
    Transition: background 120ms ease

  ACTIVE / PRESSED:
    Background: var(--teal-600) #008f86
    Transform:  scale(0.98)
    Transition: transform 80ms ease

  DISABLED:
    Background: rgba(0,212,200,0.2)
    Color:      rgba(0,0,0,0.4)
    Cursor:     not-allowed
    No hover effect

  LOADING STATE:
    Shows spinner (12px, spinning border) replacing text
    Background stays teal
    Cursor: wait

  LARGE VARIANT (+4px height, +4px padding):
    Height: 44px, padding: 0 20px, font-size: 14px

  ICON LEFT:
    Gap between icon and text: 6px
    Icon size: 16px, vertically centered

GHOST BUTTON (btn-ghost):
  Use for: secondary actions, cancel, back
  Background:     transparent
  Text color:     var(--text-secondary)
  Border:         0.5px solid var(--border-subtle)
  Font:           DM Sans 13px / 400
  Height:         36px
  Padding:        0 14px
  Border-radius:  var(--r-md)

  HOVER:
    Background:   var(--bg-raised)
    Text color:   var(--text-primary)
    Border-color: var(--border-mid)
    Transition:   all 120ms ease

  ACTIVE:
    Background:   var(--bg-overlay)
    Transform:    scale(0.98)

  DISABLED:
    Opacity: 0.4, cursor: not-allowed

DANGER GHOST (btn-danger):
  Same as ghost but:
  Text color:     var(--text-danger)
  Border-color:   var(--danger-border)
  HOVER: bg var(--danger-bg-sm), border var(--danger-border)

TEAL OUTLINE (btn-teal-outline):
  Use for: Verify Integrity button, secondary teal actions
  Background:     transparent
  Text:           var(--text-teal)
  Border:         0.5px solid var(--border-teal)
  HOVER: bg var(--teal-glow-sm)

ICON BUTTON (btn-icon):
  Use for: copy, close, expand, action menu
  Size:           32x32px (sm: 28x28px, lg: 40x40px)
  Background:     transparent
  Border-radius:  var(--r-md)
  Icon:           18px, var(--text-tertiary)
  HOVER: bg var(--bg-raised), icon color var(--text-secondary)
  ACTIVE: scale(0.92)

BUTTON GROUP:
  Two buttons side by side with shared border
  Middle border replaced by 0.5px divider
  Use for: Download | Stream groupings

2.2 INPUT SYSTEM - All Form Elements
══════════════════════════════════════

TEXT INPUT:
  Background:     var(--bg-raised)
  Border:         0.5px solid var(--border-subtle)
  Border-radius:  var(--r-md)
  Height:         36px
  Padding:        0 12px
  Font:           DM Sans 13px / 400
  Color:          var(--text-primary)
  Placeholder:    var(--text-quaternary)

  FOCUS:
    Border: 0.5px solid var(--teal-400)
    Box-shadow: var(--shadow-input-focus)
    Outline: none

  ERROR:
    Border: 0.5px solid var(--danger-400)
    Box-shadow: 0 0 0 2px rgba(239,68,68,0.25)

  VALID (after user types):
    Border: 0.5px solid var(--success-border)
    Optional: small green checkmark right-icon

  DISABLED:
    Background: rgba(255,255,255,0.02)
    Color: var(--text-disabled)
    Cursor: not-allowed

  WITH LEFT ICON:
    Padding-left: 36px
    Icon: absolute positioned, 16px, var(--text-tertiary), left: 10px, vertically centered

  WITH RIGHT ICON (clear button, eye toggle):
    Padding-right: 36px
    Icon: absolute positioned, 16px, right: 10px

TEXTAREA:
  Same as text input
  Padding: 10px 12px (top/bottom too)
  Min-height: 80px, resize: vertical
  Max-height: 240px
  Scrollbar: styled (4px width, --bg-raised track, --border-mid thumb)

LABEL:
  Font: DM Sans 12px / 500
  Color: var(--text-secondary)
  Margin-bottom: 6px
  Display: block

  REQUIRED INDICATOR:
    Append after label text: " *"
    Color: var(--text-danger) for the asterisk only

ERROR MESSAGE (below input):
  Font: DM Sans 12px / 400
  Color: var(--text-danger)
  Margin-top: 4px
  Display: flex, align-items: center, gap: 4px
  Left icon: ti-alert-circle 12px

HELPER TEXT (below input, non-error):
  Font: DM Sans 11px / 400
  Color: var(--text-tertiary)
  Margin-top: 4px

SELECT / DROPDOWN:
  Same styling as text input
  Right arrow icon: ti-chevron-down, 14px, var(--text-tertiary)
  On open: arrow rotates 180deg (CSS transition 150ms)
  Dropdown panel:
    Background: var(--bg-raised)
    Border: 0.5px solid var(--border-mid)
    Border-radius: var(--r-lg)
    Box-shadow: var(--shadow-md)
    Max-height: 240px, overflow-y: auto
    Z-index: var(--z-dropdown)

  OPTION:
    Height: 34px, padding: 0 12px
    Font: 13px, color: var(--text-secondary)
    HOVER: bg var(--bg-overlay), color: var(--text-primary)
    SELECTED: bg var(--teal-glow-md), color: var(--text-teal),
              right checkmark: ti-check 14px

CHECKBOX:
  Size: 16x16px
  Border: 0.5px solid var(--border-mid)
  Border-radius: var(--r-sm) = 4px
  Background: var(--bg-raised)
  CHECKED: bg var(--teal-400), border: none, white checkmark SVG
  FOCUS: box-shadow var(--shadow-teal)
  Label: 13px, var(--text-secondary), margin-left: 8px, cursor: pointer

RADIO:
  Same as checkbox but:
  Border-radius: 50% (full circle)
  CHECKED: bg var(--teal-400), inner white circle 6px diameter

TOGGLE SWITCH:
  Track: 36px x 20px, border-radius: 10px
  OFF state: bg var(--bg-overlay), border 0.5px var(--border-mid)
  ON state: bg var(--teal-400)
  Thumb: 14x14px circle, white, offset 3px from edge
  Transition: all 200ms ease
  Label: 13px, DM Sans, var(--text-secondary), margin-left: 10px

RANGE SLIDER:
  Track height: 4px, border-radius: 2px
  OFF track: var(--bg-overlay)
  FILLED track: var(--teal-400)
  Thumb: 16x16px circle, bg var(--teal-400), border: 2px solid #000
  THUMB HOVER: box-shadow var(--shadow-teal)
  Value display: font-mono 12px, below slider

2.3 CARD SYSTEM
════════════════

BASE CARD:
  Background:    var(--bg-surface)
  Border:        0.5px solid var(--border-subtle)
  Border-radius: var(--r-lg) = 10px
  Padding:       16px 18px
  Overflow:      hidden

  HOVER (interactive cards only):
    Border-color: var(--border-mid)
    Transition:   border-color 150ms ease
    Cursor:       pointer

  SELECTED:
    Border:       1px solid var(--teal-400)
    Background:   var(--bg-surface) (unchanged)

  ACTIVE ACCENT (left border highlight):
    Border-left:  2px solid var(--teal-400)
    Padding-left: 16px (compensate for extra border width)

  DANGER STATE:
    Border:       0.5px solid var(--danger-border)
    Background:   var(--danger-bg-sm) mixed with surface

  RAISED CARD (for modals, elevated panels):
    Background:   var(--bg-raised)
    Border:       0.5px solid var(--border-mid)
    Box-shadow:   var(--shadow-md)

METRIC CARD (stats/numbers):
  Background:    var(--bg-surface)
  Border:        0.5px solid var(--border-subtle)
  Border-radius: var(--r-lg)
  Padding:       18px 20px
  No hover state (non-interactive)

  Internal layout:
    LABEL: 11px / DM Sans 500 / uppercase / letter-spacing 0.07em / --text-tertiary
    VALUE: 26px / DM Sans 500 / --text-primary / margin-top: 6px
    TREND: 11px badge (optional) - "--success" or "--danger" with arrow icon
    ICON:  Tabler icon 18px, --text-tertiary, absolute top-right of card

2.4 BADGE / TAG SYSTEM
═══════════════════════

BASE BADGE:
  Display: inline-flex, align-items: center, gap: 4px
  Font: DM Sans 11px / 500
  Padding: 2px 8px
  Border-radius: var(--r-full)
  Border: 0.5px solid

BADGE VARIANTS:
  .badge-verified:
    Background: var(--success-bg-sm)
    Color:      var(--success-300)
    Border:     var(--success-border)
    Icon:       ti-shield-check 12px

  .badge-tampered:
    Background: var(--danger-bg-md)
    Color:      var(--danger-300)
    Border:     var(--danger-border)
    Icon:       ti-alert-triangle 12px

  .badge-pending:
    Background: var(--warning-bg-sm)
    Color:      var(--warning-300)
    Border:     var(--warning-border)
    Icon:       ti-clock 12px

  .badge-free:
    Background: var(--teal-glow-sm)
    Color:      var(--teal-300)
    Border:     var(--border-teal)
    Icon:       ti-gift 12px

  .badge-paid:
    Background: var(--info-bg-sm)
    Color:      var(--info-300)
    Border:     var(--info-border)
    Icon:       ti-coins 12px

  .badge-subscription:
    Background: rgba(139,92,246,0.10)
    Color:      #c4b5fd
    Border:     rgba(139,92,246,0.35)
    Icon:       ti-refresh 12px

  .badge-version (e.g. "v3"):
    Background: var(--bg-raised)
    Color:      var(--text-tertiary)
    Border:     var(--border-subtle)
    Font:       Space Mono 11px / 400

  .badge-network (e.g. "shelbynet"):
    Background: var(--teal-glow-sm)
    Color:      var(--teal-400)
    Border:     var(--border-teal)
    Font:       Space Mono 11px / 400
    Padding:    3px 8px

TAG PILL (dataset tags - clickable/filterable):
  Inactive:
    Background: var(--bg-raised)
    Color:      var(--text-tertiary)
    Border:     0.5px solid var(--border-subtle)
    Font:       DM Sans 11px / 400
    Padding:    3px 10px
    Border-radius: var(--r-full)
    HOVER: bg var(--bg-overlay), color var(--text-secondary), border-color var(--border-mid)
    Transition: all 120ms ease

  Active (selected for filtering):
    Background: var(--teal-glow-md)
    Color:      var(--teal-400)
    Border:     0.5px solid var(--border-teal)
    HOVER: bg var(--teal-glow-lg)

2.5 ADDRESS / HASH DISPLAY - The Most Important Primitive
══════════════════════════════════════════════════════════
This component appears on EVERY page that shows dataset data.
Get this right once - it's reused dozens of times.

RULE: Cryptographic values ALWAYS use Space Mono. ALWAYS truncated inline.
      ALWAYS have a copy-to-clipboard action. txHash/merkleRoot ALWAYS have
      an Aptos explorer link.

ADDRESS DISPLAY (Aptos wallet addresses):
  Format:     0x[6 chars]...[4 chars]
              Example: 0x4f3b8a...c21e
  Font:       Space Mono 12px / 400
  Color:      var(--text-secondary)
  Letter-spacing: 0.02em

  COPY TRIGGER:
    On hover of the address span: show copy icon (ti-copy 12px, var(--text-tertiary))
    Icon appears with opacity transition 150ms
    On click: copy full address to clipboard
    On copy success: icon becomes ti-check (--success-300), 1.5s then reverts

  FULL ADDRESS TOOLTIP:
    On hover: tooltip appears above showing full 66-char address
    Tooltip: bg var(--bg-raised), border var(--border-mid), padding 6px 10px,
             border-radius var(--r-md), font-mono 10px

MERKLE ROOT DISPLAY:
  Format:     0x[12 chars]...
              Example: 0xabc1def234...
  Font:       Space Mono 11px / 400
  Color:      var(--text-tertiary)
  Letter-spacing: 0.01em
  After value: [copy icon] [Aptos link]

  APTOS EXPLORER LINK:
    Text: "Aptos" or just the icon
    Color: var(--text-teal)
    Font: DM Sans 11px (not mono - it's a UI link, not a data value)
    href: https://explorer.aptoslabs.com/txn/[fullHash]?network=testnet
    Opens in new tab

TX HASH DISPLAY:
  Same as merkleRoot
  Always shows Aptos link

BLOB ID DISPLAY:
  Format:     [first 12 chars]...
              Example: blob_01jxk4...
  Font:       Space Mono 11px / 400
  Color:      var(--text-tertiary)
  Copy icon only (no Aptos link)

CONTENT HASH DISPLAY:
  Format:     sha256:[first 8 chars]...
              Example: sha256:a1b2c3d4...
  Font:       Space Mono 11px / 400
  Color:      var(--text-tertiary)
  "sha256:" prefix in var(--text-quaternary) for visual separation

IMPLEMENTATION (React component):
  Props:
    value: string         // full cryptographic value
    type: 'address' | 'merkleRoot' | 'txHash' | 'blobId' | 'contentHash'
    showAptosLink?: boolean  // default: true for merkleRoot + txHash
    showCopyIcon?: boolean   // default: true for all types
    className?: string

  Truncation logic:
    address:     value.slice(0,8) + '...' + value.slice(-4)
    merkleRoot:  value.slice(0,14) + '...'
    txHash:      value.slice(0,14) + '...'
    blobId:      value.slice(0,12) + '...'
    contentHash: 'sha256:' + value.slice(0,8) + '...'

2.6 TOOLTIP SYSTEM
═══════════════════
Appears on: address hover, hash hover, badge hover, icon buttons

Structure: [content inside a floating panel]
Background: var(--bg-raised)
Border: 0.5px solid var(--border-mid)
Border-radius: var(--r-md)
Padding: 6px 10px
Font: DM Sans 11px / 400 (or mono for data values)
Color: var(--text-secondary)
Box-shadow: var(--shadow-sm)
Z-index: var(--z-tooltip)
Max-width: 280px

Arrow: small 6px triangle pointing toward trigger element
Appear: fade in, translateY(-2px), 150ms ease
Disappear: fade out, 100ms ease
Delay before appearing: 400ms (prevent tooltip flicker on mouse movement)

TOOLTIP WITH MONO VALUE (for hash/address full display):
  Font: Space Mono 10px
  Letter-spacing: 0.01em
  Word-break: break-all
  Color: var(--text-primary)

2.7 SKELETON LOADING SYSTEM
════════════════════════════
Every async component has a skeleton that fills its exact dimensions.
No spinners in the middle of content areas (only in buttons and full-page loads).

SKELETON BASE:
  Background: var(--shimmer-base)
  Border-radius: matches the element it replaces
  Position: relative
  Overflow: hidden

SHIMMER ANIMATION:
  Pseudo-element ::after:
    Background: linear-gradient(
      90deg,
      transparent 0%,
      var(--shimmer-shine) 50%,
      transparent 100%
    )
    Width: 100%, Height: 100%
    Position: absolute, top: 0, left: -100%
    Animation: shimmer 1.8s ease-in-out infinite

  @keyframes shimmer {
    0%   { left: -100% }
    100% { left: 200%  }
  }

SKELETON VARIANTS:
  .skel-text-sm:  height: 10px, width varies (e.g., 60%), border-radius 4px
  .skel-text-md:  height: 12px, border-radius 4px
  .skel-text-lg:  height: 16px, border-radius 4px
  .skel-title:    height: 20px, width: 40-70%, border-radius 4px
  .skel-badge:    height: 20px, width: 56px, border-radius 9999px
  .skel-avatar:   circle, size matches real avatar
  .skel-card:     height matches card, full width, border-radius 10px
  .skel-chart:    height: 200px, width: 100%, border-radius 10px
  .skel-icon:     width/height same as real icon, border-radius 4px

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 - GLOBAL LAYOUT SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3.1 NAVBAR - Full Spec
════════════════════════

DIMENSIONS:
  Height:        52px (exactly - don't change this)
  Width:         100vw
  Position:      sticky top: 0
  Z-index:       var(--z-navbar) = 100
  Background:    var(--bg-base)
  Border-bottom: 0.5px solid var(--border-subtle)
  Backdrop: none (no blur - this is a data platform, not consumer app)

INTERNAL LAYOUT:
  Max-width: 1280px, centered, padding: 0 24px
  Display: flex, align-items: center, justify-content: space-between

LEFT SECTION (logo + wordmark):
  LOGO MARK:
    "V" character in Space Mono 16px / 700
    Color: var(--teal-400)
    Width: 28px, height: 28px, background: var(--teal-glow-md)
    Border: 0.5px solid var(--border-teal)
    Border-radius: var(--r-md)
    Display: inline-flex, align-items: center, justify-content: center

  WORDMARK (beside logo):
    "VERIDA" - Space Mono 13px / 700 / --text-primary / letter-spacing: 0.12em
    Gap between logo mark and wordmark: 8px

  TAGLINE (below wordmark, hidden on mobile):
    "AI Dataset Marketplace" - DM Sans 10px / 400 / --text-tertiary

CENTER SECTION (navigation links) - Desktop only:
  Display: flex, gap: 4px
  Links: Marketplace | Upload | Dashboard

  EACH LINK:
    Font: DM Sans 13px / 400
    Padding: 6px 12px
    Border-radius: var(--r-md)
    Color: var(--text-secondary)
    Text-decoration: none
    Transition: all 120ms

    HOVER:
      Background: var(--bg-raised)
      Color: var(--text-primary)

    ACTIVE PAGE:
      Color: var(--text-teal)
      Background: var(--teal-glow-sm)
      Font-weight: 500

RIGHT SECTION:
  Display: flex, align-items: center, gap: 10px

  NETWORK BADGE:
    Content: "shelbynet"
    Font: Space Mono 10px / 400
    Color: var(--teal-400)
    Background: var(--teal-glow-xs)
    Border: 0.5px solid var(--border-teal)
    Padding: 3px 8px
    Border-radius: var(--r-full)
    The "" dot: color var(--teal-400), font-size 8px, blinks every 3s
    Blinking: CSS animation opacity 1 to 0.3 to 1 over 3s (subtle, not flashy)
    HIDDEN on mobile (too small)

  WALLET BUTTON:
    NOT CONNECTED STATE:
      "Connect Wallet" - btn-ghost style
      Width: auto, min-width: 120px
      Icon left: ti-wallet 14px

    CONNECTED STATE:
      Shows: green dot (6px circle, --success-400) + truncated address
      Address: Space Mono 11px, 0x[4]...[4] format (shorter than data display)
      Padding: 6px 12px
      Background: var(--bg-raised)
      Border: 0.5px solid var(--border-subtle)
      Border-radius: var(--r-md)
      Right: ti-chevron-down 12px, var(--text-tertiary)
      HOVER: border-color var(--border-mid)
      CLICK: opens wallet dropdown

    WALLET DROPDOWN:
      Background: var(--bg-raised)
      Border: 0.5px solid var(--border-mid)
      Border-radius: var(--r-lg)
      Box-shadow: var(--shadow-md)
      Padding: 6px
      Min-width: 200px
      Items:
        Full address (mono, copyable)
        [Divider]
        My Dashboard
        My Datasets
        Settings
        [Divider]
        Disconnect Wallet (--danger color)

MOBILE NAVBAR:
  Logo mark + wordmark only (no tagline, no center nav)
  Right: wallet button (icon only: ti-wallet) + hamburger ti-menu-2

  MOBILE MENU (slide-in from right, full height):
    Width: 280px
    Background: var(--bg-surface)
    Border-left: 0.5px solid var(--border-subtle)
    Overlay: var(--bg-scrim) covering rest of page
    Items: Marketplace | Upload | Dashboard | Profile | Settings | Disconnect
    Font: DM Sans 15px / 500
    Padding: 20px 16px per item
    Close button top-right: ti-x

3.2 FOOTER - Full Spec
════════════════════════

HEIGHT: auto (content-driven)
BACKGROUND: var(--bg-base)
BORDER-TOP: 0.5px solid var(--border-subtle)
PADDING: 32px 24px 24px

LAYOUT: 3 columns (desktop), stacked (mobile)

COLUMN 1 - Brand:
  Logo mark + VERIDA wordmark (same as navbar)
  Tagline: "Trust-first AI data infrastructure" - 13px, --text-tertiary

COLUMN 2 - Links (two sub-columns):
  Product: Marketplace, Upload Dataset, Dashboard, Pricing
  Developer: API Reference, Documentation, GitHub, Discord

COLUMN 3 - Built on:
  "Built on Shelby Protocol" pill (teal style)
  "Powered by Aptos L1" - small text
  "Decentralized hot storage by Aptos Labs x Jump Crypto" - 11px text-tertiary

BOTTOM BAR:
  "(c) 2025 Verida AI. Open source." - 11px text-tertiary
  Privacy Policy | Terms of Service
  Network status: / Shelby Network: Operational / : Shelby: Degraded / x: Shelby: Unavailable

3.3 PAGE LAYOUT SYSTEM
════════════════════════

OUTER CONTAINER: 100vw, bg-void, min-height 100vh
INNER CONTENT: max-width 1280px, margin 0 auto, padding 0 24px (desktop), 0 16px (tablet), 0 12px (mobile)

FULL-BLEED SECTIONS: width 100vw, inner content still max-width centered
TWO-COLUMN: 65/35 desktop, 60/40 tablet, single column mobile
SIDEBAR: 260px fixed + flex-1, sidebar sticky top 68px

SECTION SPACING: hero to content 48px, between sections 32px, cards in grid 12px, list items 8px

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4 - PAGE SPECIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 01: LANDING / MARKETPLACE
Route: / | Priority: P0 | Flow: Public
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HERO SECTION
Height: auto (min 340px, no forced full-viewport)
Background:
  var(--bg-void) base
  + CSS grid pattern: 48px grid, var(--grid-line)
  + Radial gradient: center 600px circle, rgba(0,212,200,0.04) to transparent

LAYOUT: flex row, align-items: center
Left text block: max-width 620px, flex: 1
Right stats panel: width 320px, flex-shrink: 0, hidden below 1024px

LEFT TEXT BLOCK:
  EYEBROW TAG: "Shelby Protocol x Verida AI" pill badge
    bg teal-glow-xs, border border-teal, color teal-400, Space Mono 10px
    Pulsing teal dot (6px, animation 2s infinite)

  HEADING LINE 1: "Verifiable AI Datasets." DM Sans 38px / 400, text-primary
  HEADING LINE 2: "Provenance you can trust." DM Sans 38px / 400, text-tertiary

  BODY: "Every dataset anchored to Aptos. Every upload cryptographically proven.
         Every access metered and permanently auditable."
    DM Sans 15px / 400, text-secondary, max-width 480px, line-height 1.75

  CTA ROW: [Browse Datasets] btn-primary large + [Upload a Dataset] btn-ghost large

  TRUST STRIP: 3 items with check icons
    "Clay erasure-coded storage" / "Immutable provenance chain" / "Pay-per-access streaming"

RIGHT STATS PANEL:
  bg-surface, border border-subtle, radius xl, padding 20px
  "Live Network Stats" header + "LIVE" badge
  2x2 stats grid: Total Datasets / Verified / Total Accesses / On Shelby (X.X TB)
  Network footer: shelbynet, latency ms avg, uptime%
  Count-up animation on render (800ms)
  TanStack Query refetchInterval: 30000

FILTER / SEARCH BAR
Position: sticky, top: 52px, z-index: var(--z-sticky)
Background: var(--bg-base), height 52px, border-bottom border-subtle

SEARCH INPUT: 300px (expands to 360px on focus), 34px height, radius md
  Left: ti-search icon, Clear button appears when text typed

TAG PILLS STRIP: horizontal scroll, top 8 tags by frequency
  nlp, cv, medical, tabular, audio, financial, multimodal, code

RIGHT DROPDOWNS: Access Type (All/Free/Paid/Subscription) + Sort (Latest/Most Accessed/Largest/Verified Only)
FILTER ICON: mobile only, opens bottom sheet

DATASET GRID
3 columns desktop, 2 tablet, 1 mobile, gap 12px, margin-top 24px

LOADING STATE: 6 skeleton cards immediately
ERROR STATE: full-width danger card with retry
EMPTY STATE: centered icon + "No datasets found" + clear filters button
INFINITE SCROLL: fetch 20 more at 300px from bottom, skeleton row between loads

DATASET CARD - Complete Spec
The most important component in the app.

CARD SHELL: bg-surface, border border-subtle, radius lg, padding 14px 16px, cursor pointer
  HOVER: border-mid, slightly lighter bg
  ACTIVE: teal-400 border flash then navigates

INTEGRITY BADGE: absolute top-right, compact variant (icon only)

SECTION 1 - HEADER:
  Category icon: 34x34px, radius md, colored by type
    nlp: bg rgba(59,130,246,0.12) ti-message #60a5fa
    cv: bg rgba(245,158,11,0.12) ti-photo #fbbf24
    tabular: bg rgba(34,197,94,0.12) ti-table #4ade80
    audio: bg rgba(0,212,200,0.12) ti-waveform #00d4c8
    medical: bg rgba(239,68,68,0.12) ti-stethoscope #f87171
    code: bg rgba(139,92,246,0.12) ti-code #c4b5fd
    financial: bg rgba(245,158,11,0.12) ti-trending-up #fbbf24
    multimodal: bg rgba(99,102,241,0.12) ti-layers #a5b4fc
    default: bg-raised ti-database text-tertiary
  Title: DM Sans 14px/500, max 2 lines clamp
  Publisher: truncated address 0x[4]...[4], Space Mono 10px

SECTION 2 - TAGS: max 3 pills, "+N more" if more, gap 4px

SECTION 3 - DESCRIPTION: DM Sans 12px/400, max 2 lines clamp, line-height 1.55

SECTION 4 - STATUS BAR: flex space-between
  Left: access badge + size badge (Space Mono 10px)
  Right: "1.2k accesses" with ti-download icon

SECTION 5 - SHELBY FOOTER: border-top dim, padding-top 8px
  Left: "merkle: " label + value in Space Mono 10px
  Right: "Aptos" link, hidden until card hover (opacity transition 150ms)

TAMPERED VARIANT: left border 2px danger-400, danger bg tint, "TAMPERED" label
COMPACT VARIANT: no description/footer, ~130px height, for sidebars

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 02: DATASET DETAIL
Route: /dataset/[id] | Priority: P0 | Flow: Public
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BREADCRUMB: "Marketplace / [Dataset Name]" DM Sans 12px, text-tertiary
Separator " / " in text-quaternary, Marketplace is link

DATASET HEADER PANEL: bg-surface, border border-subtle, radius xl, padding 24px

ROW 1: Category icon 44x44 + Title block + Right actions
  Title: 24px DM Sans 500, text-primary
  Sub-row: version badge "v3" + "Published by" + publisher address (Space Mono, teal-400) + upload timestamp
  Right: IntegrityBadge lg + [Verify Integrity] btn-teal-outline + action menu (Share, Report, Add to collection, Copy blobId)

ROW 2: Metadata chips (inline-flex, gap 16px)
  ti-database size / ti-file format / ti-table rows / ti-lock license
  ti-cloud "Stored on Shelby Protocol" (teal-400) / ti-currency-dollar price / ti-refresh accesses

TWO-COLUMN BODY: Left 65% tabs, Right 35% sticky panel

TAB BAR: flex gap 2px, bg-surface, border border-subtle
  Tabs: Overview | Versions (count) | Provenance (count) | Access
  Active tab: text-teal, bottom border 2px teal-400
  Count badge: bg-raised, text-tertiary, Space Mono 10px

TAB PANEL: bg-surface, border border-subtle (no top border), radius bottom, padding 20px

OVERVIEW TAB:
  DESCRIPTION: DM Sans 14px/400, text-secondary, line-height 1.75, max-width 640px
    If >400 chars: truncated with "Show full description" toggle
  TAGS: clickable pills, navigates to marketplace?tag=[tag]
  TECHNICAL METADATA TABLE:
    bg-raised, radius md, overflow hidden
    40% label / 60% value columns
    Header: "Technical Details" 11px uppercase
    Rows: License, Access Type, Price, Format, File Size (tooltip: exact bytes), Rows, Columns
      Content Hash [AddressDisplay type=contentHash]
      Shelby blobId [AddressDisplay type=blobId]
      merkleRoot [AddressDisplay type=merkleRoot showAptosLink=true]
      Uploaded, Last Verified [IntegrityBadge compact], Chunk Count "16 chunks (Clay 10+6)"
    "Clay erasure code" row has info tooltip explaining Shelby encoding
  DATA PREVIEW (first 5 rows): Space Mono 11px table, max 8 columns

VERSIONS TAB:
  "Version History" + [Add New Version] btn-ghost (owner only)
  Active version: left border 2px teal-400, bg teal-glow-xs
    Version badge + "Current Version" + timestamp
    Size, chunks, merkleRoot with Aptos link, changelog
    Actions: [Verify This Version] [Stream/Download]
  Previous versions: dimmer bg-raised, same structure
  Comparison view toggle: side-by-side merkle roots, size diff

PROVENANCE TAB:
  "Provenance Chain - [n] events" + [Export JSON] [Export CSV]
  Chain Integrity mini card: "Chain integrity: INTACT" (teal) or "BROKEN" (danger)
  ProvenanceTree component (Section 5.2)

ACCESS TAB:
  Conditional by access_type:
  FREE: teal card "Freely accessible" + [Stream Dataset] + [Download ZIP]
  PAY_PER_ACCESS: "0.05 APT" price + state machine (5 states)
    State A - No wallet: wallet list (Petra / Martian / Pontem)
    State B - Connected, no session: wallet status + [Get Access - 0.05 APT]
    State C - Pending: step indicators + spinner
    State D - Active: session card with countdown (SessionCountdown component)
    State E - Expired: warning + [Renew Access]

STICKY RIGHT PANEL:
  Position sticky top 72px, width 100%, flex column gap 12px
  PANEL 1 - Quick Stats: 3 stats row (accesses / downloads / unique accessors)
  PANEL 2 - Publisher Card: avatar 40px, name, address, [View Profile]
  PANEL 3 - Integrity Card: large badge, last checked time, merkleRoot, [Verify Now]
  PANEL 4 - Related Datasets: 3 compact DatasetCards

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 03: UPLOAD WIZARD
Route: /upload | Priority: P0 | Flow: Auth required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAGE HEADER: "Upload Dataset" 24px DM Sans 500
  Subtext: "Your dataset will be stored on Shelby Protocol with an immutable provenance chain."

STEP INDICATOR: max-width 600px, centered, margin-bottom 32px
  4 steps: File -> Metadata -> Pricing -> Review

  Circle: 32x32px, border-radius 50%, flex center
    UPCOMING: bg-raised, border border-subtle, DM Sans 13px/500 text-tertiary
    ACTIVE: bg teal-400, black text, pulsating ring (box-shadow 0 0 0 4px teal-glow-md)
    COMPLETE: success-bg-md, border success-border, ti-check icon success-300
  Connector line: flex-1, 1px height, border-subtle (upcoming) or teal-400 (complete)

WIZARD CONTENT: max-width 700px, bg-surface, border border-subtle, radius xl, padding 28px 32px, margin 0 auto

STEP 1 - FILE DROP:
  DROP ZONE: height 240px, border 2px dashed border-mid, radius 2xl, bg-raised
    IDLE: ti-cloud-upload 44px text-tertiary, "Drop your dataset here", "or click to browse" teal
      Supported formats: CSV, JSON, Parquet, ZIP, HDF5, Pickle
      Max file size: 10 GB
    DRAG OVER: teal border + bg + scale(1.02), all text teal
    FILE SELECTED: replaced by FilePreviewCard
      File info: type icon + name + size (Space Mono 12px)
      Content hash row: ti-fingerprint + "Content hash:" + [AddressDisplay type=contentHash]
        Computing: spinner + "Computing SHA-256..."
      "x Remove file" link in danger color
  BOTTOM: [Next: Add Metadata] btn-primary (disabled until file selected + hash computed)

STEP 2 - METADATA:
  Two-column: 60/40
  LEFT: Dataset Name (3-120 chars), Description (20-2000 chars, 5 row textarea)
    Tags (max 10, type to search/enter to add, suggestions popup)
    License (select: MIT, Apache 2.0, CC BY 4.0, CC BY-NC, CC BY-NC-ND, GPL 3.0, Custom)
  RIGHT: Access Type radio card group
    FREE: ti-gift, "Free Access - Anyone can stream and download for free", "Best for public research"
    PAY_PER_ACCESS: ti-coins, "Pay Per Access - Users pay in APT per 24-hour session"
    SUBSCRIPTION: ti-refresh, "Subscription - Monthly unlimited access"
    Selected: border 1px teal-400, bg teal-glow-xs

STEP 3 - PRICING:
  Auto-skip if free (300ms fade transition)
  Price input: Space Mono 16px, 140px width, + APT label + USD estimate
  Session duration: 24 hours (fixed, info only)
  Earnings estimator card with 3 scenarios (10/100/500 accesses per month)
  "Verida takes 0% platform fee" note

STEP 4 - REVIEW + SUBMIT:
  Summary cards: File / Metadata / Access & Pricing / Storage
  Each has heading + [Edit] link
  Storage: "Will be stored on Shelby Protocol (shelbynet)", expected chunks 16, nodes 16+
  Disclosure text + [Upload & Publish Dataset] btn-primary large full-width

UPLOAD PROGRESS (replaces submit button):
  8px progress bar, teal fill, shimmer overlay, width transition 300ms
  Percentage: Space Mono 16px/700 teal, right-aligned
  Stage indicator with 5 sequential stages:
    "Hashing file content..." / "Uploading to Shelby RPC..." / "Clay erasure encoding..."
    / "Distributing to 16 SP nodes..." / "Anchoring to Aptos L1..."
  5 stage bullets filling as stages complete
  Collapsible technical detail: jobId, chunks X/16, node IDs
  Cancel button: "Cancel upload" 12px danger

COMPLETE - RECEIPT MODAL:
  Full overlay (bg-scrim), modal max-width 480px, bg-surface, border success-border
  Large teal checkmark animation (SVG stroke-dashoffset 400ms + spring scale)
  "Dataset Published" 20px DM Sans 500
  Receipt table: blobId, merkleRoot (Aptos link), txHash (Aptos link), Uploaded, Chunks 16
  "Your provenance receipt is permanently recorded on Aptos L1."
  [View Dataset] btn-primary + [Upload Another] btn-ghost

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 04: PUBLISHER DASHBOARD
Route: /dashboard | Priority: P1 | Flow: Auth
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HEADER: "Dashboard" 24px/500 + subtext (address + member since) + [Upload Dataset] btn-primary

STATS ROW: 4 equal MetricCards
  Total Datasets (ti-database) / Total Accesses (ti-download) / Shelby Storage (ti-cloud, Space Mono 24px value) / Verified Datasets (ti-shield-check, fraction format)
  Each with trend indicator (+3 this month etc)

ACCESSES CHART: Recharts AreaChart, height 200px, teal gradient fill
  Period selector: 7d | 30d | 90d
  Tooltip: date + access count

DATASET TABLE: full-width with sortable columns
  Columns: NAME 40% (link + version badge), STATUS 12% (IntegrityBadge), ACCESS 10%, SIZE 8% (Space Mono), ACCESSES 10%, UPLOADED 10%, ACTIONS 10%
  Rows: 48px height, border-bottom border-dim, hover bg-overlay
  Actions menu: View, Verify, Add Version, Share, Delete (danger)
  Pagination: "Showing 1-20 of 47" + numbered buttons
  Empty: centered icon + "No datasets published yet" + [Upload Your First Dataset]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 05: PUBLISHER PROFILE
Route: /profile/[address] | Priority: P1 | Flow: Public
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TWO COLUMN: Left 280px sticky + Right flex-1, gap 24px

LEFT - PROFILE CARD: bg-surface, border border-subtle, radius xl, padding 20px
  Avatar: 60x60px circle, bg-raised, initials centered, border 0.5px border-mid
  Username: DM Sans 17px/500 centered
  Address: [AddressDisplay type=address centered]
  Verified badge (if verified): "Verified Publisher" success pill
  Bio: DM Sans 13px/400, max 4 lines, "No bio added." if empty
  Divider + 3 stats row: Datasets / Accesses / Member Since
  [Edit Profile] btn-ghost full-width (owner only)

RIGHT - DATASET SECTION:
  Header: "Datasets by [username]" + Access type tabs (All/Free/Paid/Subscription)
  Grid: 2 columns DatasetCard
  Empty: "No public datasets yet" / [Upload Your First Dataset] if owner

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 06: ACCESS & PAYMENT
Route: /dataset/[id]/access or modal | Priority: P0 | Flow: Auth
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Centered card, max-width 460px, margin 48px auto
Dataset context card (compact, read-only, opacity 0.8)

PRICE BLOCK: "0.05 APT" Space Mono 30px/700, "per session" 13px, "24 hours access" 12px, "USD" 11px

5-STATE MACHINE:
  A - NOT CONNECTED: wallet list (Petra/Martian/Pontem, each with install badge)
  B - CONNECTED NO SESSION: wallet status row + [Get Access - 0.05 APT] 48px btn-primary
  C - PROCESSING: step indicators (3 steps with spinners, sequential activation)
  D - ACTIVE: session card with countdown + [Stream Dataset]
  E - EXPIRED: warning card + [Renew Access]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 07: PROVENANCE EXPLORER
Route: /dataset/[id]/provenance | Priority: P1 | Flow: Public
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chain Integrity Summary Bar: full-width 56px card, INTACT (success-bg) or BROKEN (danger-bg)
  Left: dot + "Chain Integrity: INTACT/BROKEN", Right: "[n] events verified" + [Validate Chain]
Filter bar: pill row (All/Upload/Verification/Tamper/Access/Version Added)
Export: [Export JSON] + [Export CSV] both btn-ghost
Full ProvenanceTree (Section 5.2)
Version tabs: v1 | v2 | v3 | All versions (compact pills)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 08: SEARCH & DISCOVERY
Route: /marketplace/search | Priority: P1 | Flow: Public
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LAYOUT: 260px sidebar + flex-1 content, gap 24px

LEFT SIDEBAR (sticky top 72px): bg-surface, border border-subtle, radius lg, padding 14px
  Header: "Filters" + [Clear all] link
  7 collapsible sections:
    Access Type (checkbox: Free/Paid/Subscription with counts)
    Tags (12 pill checkboxes, "Show all [n]" toggle)
    License (checkbox: MIT/Apache/CC BY/CC BY-NC/GPL)
    File Size (double-handle range slider, Space Mono labels)
    Publisher Verified (single toggle)
    Date Uploaded (radio: 7d/30d/90d/All)
    Format (checkbox: CSV/JSON/Parquet/ZIP/HDF5/Other)

RIGHT CONTENT:
  Results header: "[n] datasets" + Sort dropdown
  Active filters strip: removable teal pills + [Clear all]
  Results grid: 2 columns DatasetCard
  Pagination: numbered center bottom

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 09: UPLOAD NEW VERSION
Route: /dataset/[id]/version/new | Priority: P1 | Flow: Auth (owner)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HEADER: "Add New Version" + dataset badge + "Currently version 2" badge
VERSION HISTORY (collapsible): compact list of existing versions with merkle roots
CHANGELOG textarea + FILE DROP ZONE (same as upload wizard)
VERSION PREVIEW: side-by-side comparison card (Previous v2 vs New v3)
  Columns: merkle root, size (+0.3 GB), status (Verified vs Pending)
  Different merkle roots = good (proves new content)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 10: INTEGRITY VERIFY RESULT
Route: /dataset/[id]/verify or modal | Priority: P1 | Flow: Public
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Max-width 480px centered card, 4 states:

IN PROGRESS: spinning ring border (0.8s infinite) with ti-shield center
  "Verifying integrity..." + "Querying Shelby Protocol nodes..." + blobId

VERIFIED: scale-in animation (0.3 -> 1.1 -> 1.0, 400ms)
  ti-shield-check in success circle + "Integrity Verified" success-300
  Result table: Expected merkleRoot MATCH, Verified at, Node ID, Aptos tx
  [View commitment on Aptos] btn-teal-outline + [Verify Again] btn-ghost

TAMPERED: shake animation (translateX shake, 400ms)
  ti-alert-triangle in danger circle + "Integrity Check Failed"
  Warning card: "Do not use this dataset..."
  Result: merkleRoot MISMATCH, Action: TAMPER_DETECTED event logged

UNAVAILABLE: ti-cloud-off in warning circle
  "Shelby storage provider nodes could not be reached"
  [Retry Verification] btn-primary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 11: SETTINGS
Route: /settings | Priority: P2 | Flow: Auth required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TWO COLUMN: 200px nav sidebar + content area

LEFT NAV: Profile / API Keys / Notifications / Wallet / Danger Zone
  Each: 36px height, icon + label DM Sans 13px
  Active: bg teal-glow-sm, text-teal, radius md
  Inactive: text-secondary, hover text-primary

RIGHT SECTIONS:
  PROFILE: avatar upload (60px circle + camera overlay on hover), username input, bio textarea, [Save Changes]
  API KEYS: description card, keys table (Name/Created/Last Used/Permissions/Actions), [Generate New API Key]
    New key modal: key visible once, monospace input, [Copy Key], "Store this key securely"
  WALLET: current address (full copyable), status "Connected", network "Aptos Testnet (shelbynet)", [Disconnect]
  NOTIFICATIONS: 4 toggle rows (upload/verify/session/new access), [Save Preferences]
  DANGER ZONE: red-bordered card, "Delete Account", requires typing DELETE to confirm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 12: CONNECT WALLET
Route: /connect (modal) | Priority: P0 | Flow: Entry point
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODAL: max-width 420px, bg-surface, border border-mid, radius xl, shadow-md, padding 24px
  Close button top-right: ti-x

HEADER: logo + "VERIDA" centered, "Connect Wallet" 20px, subtext

WALLET OPTIONS: Petra / Martian / Pontem (same spec as Access Page)
  Each: 50px, bg-raised, border border-subtle, radius md, logo + name + "Installed"/"Install"

CONNECTING: spinner + "Connecting to [Wallet]..." + "Opening wallet..."
SIGNATURE: "Message to sign" card + "This signature costs no gas" + [Sign Message]
CONNECTED: teal checkmark + "Connected!" + auto-close 1.5s or [Continue]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 13: ERROR PAGES
Routes: /404, /403, /500, /503 | Priority: P2 | Flow: System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Layout: centered vertical flex, min-height calc(100vh - 52px - 80px), max-width 480px
Each: error code (Space Mono 64px/700 decorative), icon 52px, heading 22px, description 14px, CTAs

404: ti-database-off text-tertiary, "Dataset not found", [Browse Marketplace] btn-primary
403: ti-lock warning-400, "Access Required", [Get Access] btn-primary
500: ti-server-off danger-400, "Something went wrong", Error ID, [Try Again], [Contact Support]
503: ti-cloud-off warning-400, "Shelby Network Unavailable", [View Shelby Status], [Refresh]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 14: ADMIN / DEBUG PANEL
Route: /admin | Priority: P2 | Flow: Admin only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Terminal aesthetic: #050810 bg, Space Mono data, DM Sans UI labels, teal accent for live states
"VERIDA ADMIN" header + network pill + DB status + auto-refresh toggle

2x2 GRID:
  PANEL 1 - BullMQ Queue: active/failed/completed jobs, live job feed table (jobId/type/status/duration)
  PANEL 2 - Shelby Ops Log: last 50 SDK calls, timestamp/method/blobId/latency/result, auto-scroll
  PANEL 3 - Redis Cache: hit rate %, key breakdown by prefix, memory MB
  PANEL 4 - DB Stats: datasets/versions/provenance_chain/access_sessions counts, DB size, last migration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5 - COMPONENT LIBRARY (detailed specs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5.1 INTEGRITYBADGE - All Variants
════════════════════════════════════

Props:
  status: 'verified' | 'tampered' | 'pending' | 'unavailable'
  size: 'xs' | 'sm' | 'md' | 'lg'
  checkedAt?: Date
  merkleRoot?: string
  showLabel?: boolean   (default: true for md/lg, false for xs/sm)
  animated?: boolean    (default: true)

XS VARIANT (12px, icon only - for data tables):
  Just an 8px colored dot: verified (success-400), tampered (danger-400), pending (warning-400)
  Tooltip: full status + timestamp on hover

SM VARIANT (icon + no text - for card top-right):
  Height: 22px, padding: 3px 7px, icon 12px, no text

MD VARIANT (icon + label - standard):
  Height: 26px, padding: 4px 10px, icon 13px + text 11px
  Text: "Verified" / "Tampered" / "Pending" / "Unavailable"

LG VARIANT (icon + bold text - detail page):
  Height: 36px, padding: 6px 14px, icon 18px + text 13px DM Sans 500
  Optional line 2: "Checked 2 hours ago" 10px

ANIMATION: verified = teal pulse (shadow fade), tampered = subtle shake, once on mount
TOOLTIPS:
  Verified: "Integrity verified. merkle root matches on-chain commitment"
  Tampered: "TAMPER DETECTED. merkle root does not match on-chain state"

5.2 PROVENANCETREE - Full Component Spec
══════════════════════════════════════════

Props: events, loading?, compact?, showVersionFilter?

OUTER CONTAINER: width 100%, position relative
VERTICAL LINE: absolute left 20px, top 16px, bottom 16px, width 1px, bg border-subtle

EACH EVENT ROW: flex gap 16px, padding 12px 0, position relative
  DOT: 10x10px, border-radius 50%, absolute left 15px, top 18px
    Colors: UPLOAD teal-400, VERSION_ADDED info-400, VERIFIED success-400, TAMPER_DETECTED danger-400, ACCESSED text-tertiary
    Latest: 14px dot with animated ripple ring (2s infinite)
  CONTENT: left 44px, flex 1, padding 10px 14px, radius md, border-left 2px transparent
    TAMPER_DETECTED: bg danger-bg-sm, border-left 2px danger-400, border 0.5px danger-border
    HEADER: event badge + timestamp (DM Sans 11px text-tertiary)
    DETAILS: ACTOR [AddressDisplay], TX HASH [AddressDisplay + Aptos link]
      MERKLE ROOT [AddressDisplay + Aptos link] (for upload/version/verify events)
      NOTES: event-specific details
    COMPACT: badge + timestamp + truncated actor + txHash only (~40px height)

LOADING: 3 skeleton rows
EMPTY: ti-timeline icon + "No provenance events"

5.3 UPLOAD WIZARD STEP
═══════════════════════
Transition: slide left/right 250ms ease
Validation: on blur + on Next click, inline errors only

5.4 SESSION COUNTDOWN
═════════════════════
Props: expiresAt, onExpired?
Format: HHh MMm SSs, Space Mono 14px
Colors: >2h success-300, 1-2h warning-300, <1h danger-300, <30m danger-300 + pulse
Optional progress bar: 3px height, color matches text, width 1s linear

5.5 LIVE STATS BAR
══════════════════
Poll GET /api/stats/live every 30s
Count-up animation 800ms ease-out
Stale indicator: yellow dot if >60s stale

5.6 FILE DROP ZONE
══════════════════
SHA-256 via Web Crypto API in Web Worker
Unavailable state indicator during hash computation
File >100MB warning

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6 - NOTIFICATION & FEEDBACK SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOAST NOTIFICATIONS:
  Position: fixed top 68px, right 16px, z-index 600, flex column gap 8px, max 4 visible
  Width: 320px, bg-raised, left border 3px colored, radius md, shadow-md, padding 12px 14px
  Icon: 16px color matches border
  Content: title DM Sans 13px/500 + message DM Sans 12px/400
  Close: ti-x 14px top-right
  Variants: Success (success border + ti-check), Error (danger + ti-x), Warning (warning + ti-alert-triangle), Info (teal + ti-info-circle)
  Enter: slide right 320px -> 0, 200ms ease
  Exit: slide right + fade, 180ms
  Auto-dismiss: success/info 4s, warning 6s, error persists

  SPECIAL - Upload Progress Toast: persistent, filename + mini progress bar + stage + cancel

CONFIRMATION DIALOGS:
  Modal overlay, "Are you sure?" heading, description, optional "DELETE" typing
  [Cancel] btn-ghost + [Confirm Delete] btn-danger


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7 - ANIMATION SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHILOSOPHY: Every animation must justify its presence. Either communicates state change, guides attention, or provides feedback. No decorative animations.

A01 - PAGE FADE IN: opacity 0->1, translateY 6px->0, 200ms ease-out
A02 - SKELETON SHIMMER: gradient sweep left to right, 1.8s infinite
A03 - CARD HOVER BORDER: border-color transition 150ms ease (CSS only)
A04 - BUTTON PRESS SCALE: transform scale(0.98), 80ms ease (CSS only)
A05 - PROGRESS BAR FILL: width transition 300ms ease + shimmer overlay 1.2s
A06 - STEP RING PULSE: box-shadow 0 -> 8px -> 0 spread, 2s infinite
A07 - RECEIPT CHECKMARK DRAW: SVG stroke-dashoffset 400ms + spring scale 0.3->1.05->1.0
A08 - INTEGRITY BADGE ENTRY: teal pulse or shake, 400ms, once on mount
A09 - VERIFY RING SPIN: border rotation 0.8s linear infinite
A10 - TAMPERED REVEAL: translateX shake + bg fade, 400ms
A11 - NUMBER COUNT UP: requestAnimationFrame, 800ms ease-out
A12 - TOAST SLIDE: 200ms enter, 180ms exit
A13 - DROPDOWN APPEAR: translateY -6px + opacity + scale 0.97->1.0, 150ms
A14 - MODAL ENTER: backdrop 200ms, modal translateY 16px + opacity + scale, 200ms
A15 - PROVENANCE TREE LINE DRAW: height 0->full 600ms (Intersection Observer triggered)
A16 - WIZARD STEP TRANSITION: slide left/right 250ms
A17 - ACTIVE DOT RIPPLE: expanding ring scale 1->1.8, opacity 0.4->0, 2s infinite
A18 - TAG PILL TOGGLE: bg/color 120ms + scale click 100ms

DO NOT USE: Framer Motion, GSAP, heavy animation libraries. Pure CSS transitions and animations only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8 - RESPONSIVE DESIGN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BREAKPOINTS: xs <480, sm 480-639, md 640-767, lg 768-1023, xl 1024-1279, 2xl 1280+
- Marketplace grid: 3col (2xl/xl) -> 2col (lg) -> 1col (md-)
- Dashboard stats: 4 -> 2x2 (lg) -> 2x2 smaller (md-)
- Two-column pages: 65/35 -> 60/40 (lg) -> single column (md-)
- Sidebar pages: visible (lg+) -> hidden drawer (md-)

MOBILE: hide nav links/network badge, hamburger menu; full-width stacked CTAs hidden stats panel; bottom sheet filter; accordion detail panels; single column wizard

TOUCH: hover on tap, tooltip on long press (500ms), dropdown on tap
BOTTOM SHEET: slides up, handle pill, radius 16px top-only, max-height 85vh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9 - ACCESSIBILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WCAG 2.1 AA: contrast 4.5:1 text, 3:1 large text
Focus: visible teal ring on all elements, logical tab order, skip link
Keyboard: Arrow keys in dropdowns, Escape closes modals, Tab trapped in modals
ARIA: dialog+aria-modal on modals, aria-live on toasts, aria-expanded on toggles, aria-current on nav links, aria-label on icon buttons
Screen reader: AddressDisplay full value in aria-label, IntegrityBadge role="status", ProgressBar aria-valuenow/min/max
Reduced motion: prefers-reduced-motion query zeroes all animation/transition durations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 10 - IMPLEMENTATION GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10.1 COMPONENT BUILD ORDER
═══════════════════════════
Build in sequence. Each component depends on the ones before it.

FOUNDATIONS (Day 1):
  1. globals.css - all tokens from Section 1.1-1.7
  2. Tailwind config - map all CSS variables as Tailwind utilities
  3. Google Fonts import in layout.tsx
  4. Skeleton base class + shimmer animation

ATOMS (Day 1-2):
  5. AddressDisplay - used everywhere, build first
  6. IntegrityBadge - all variants (xs/sm/md/lg x verified/tampered/pending)
  7. All Button variants (primary/ghost/danger/icon)
  8. All Badge variants (verified/tampered/pending/free/paid/sub/version)
  9. Tag Pill (active/inactive)
  10. All Input variants (text/textarea/select/checkbox/radio/toggle/range)

MOLECULES (Day 2-3):
  11. DatasetCard (grid variant first, then row and compact)
  12. MetricCard
  13. Tooltip wrapper
  14. Toast system (all 4 variants + slide animation)
  15. FileDropZone
  16. SessionCountdown

ORGANISMS (Day 3-5):
  17. Navbar (desktop + mobile)
  18. Footer
  19. ProvenanceTree (most complex - allow full day)
  20. UploadWizard (multi-step - allow 2 days)
  21. LiveStatsBar

PAGES (Day 5-14):
  22. Landing / Marketplace - day 5-6
  23. Dataset Detail - day 7-8 (most complex page)
  24. Upload Wizard page wrapper - day 9
  25. Access & Payment - day 10
  26. Connect Wallet modal - day 10
  27. Publisher Dashboard - day 11
  28. Publisher Profile - day 11
  29. Search - day 12
  30. Provenance Explorer - day 12
  31. Settings - day 13
  32. Error pages - day 13
  33. Upload Version + Verify Result - day 14

10.2 TAILWIND CONFIG - Key Extensions
═══════════════════════════════════════
In tailwind.config.ts, extend:

  fontFamily: body ['DM Sans', 'sans-serif'], mono ['Space Mono', 'monospace']
  colors: map all CSS vars (teal, bg, text, border)
  borderRadius: sm/md/lg/xl mapped to CSS vars
  keyframes: shimmer, pulse-dot, spin-ring, ripple
  animation: shimmer 1.8s, pulse-dot 2s, spin-ring 0.8s, ripple 2s

10.3 SHELBY VISIBILITY RULES
══════════════════════════════
Every dataset card: merkleRoot snippet in footer + "Shelby" or "shelbynet" text visible
Dataset detail: blobId in metadata table, merkleRoot with "View on Aptos" link, txHash in Provenance tab, "Stored on Shelby Protocol" in header, Clay chunk count
Upload wizard: Shelby stage labels ("Clay erasure encoding", "Distributing to SP nodes", "Anchoring to Aptos"), receipt with blobId/merkleRoot/txHash
Verify result: nodeId from Shelby response, "Aptos L1 commitment" referenced explicitly
Provenance tree: txHash per event with Aptos links, "shelby_receipt" data in UPLOAD event notes


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 11 - PRE-SUBMISSION AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run through every item before competition submission.

DESIGN CONSISTENCY:
  [ ] All backgrounds use the layer system (void -> base -> surface -> raised)
  [ ] No hardcoded hex values outside globals.css (all use CSS variables)
  [ ] DM Sans for all UI text, Space Mono for all data values - no mixing
  [ ] All addresses: 0x[6]...[4] format in cards, 0x[6]...[4] in tables
  [ ] All merkleRoots: first 14 chars + "..." with copy icon
  [ ] All txHashes: first 14 chars + "..." with Aptos link icon
  [ ] IntegrityBadge present on every Dataset Card and Dataset Detail page
  [ ] Teal color (#00d4c8) ONLY for: verified state, active selection, primary CTA
  [ ] Red/danger color ONLY for: tampered state, errors, danger actions
  [ ] No gradients, blur effects, or glass morphism anywhere

INTERACTION COMPLETENESS:
  [ ] Every DatasetCard navigates to /dataset/[id] on click
  [ ] Every address has copy-to-clipboard functionality
  [ ] Every txHash and merkleRoot has "View on Aptos" external link
  [ ] Copy icon appears on hover (not always visible - tooltip pattern)
  [ ] "Copied!" feedback on successful clipboard copy

STATE COVERAGE:
  [ ] Every async component has loading skeleton
  [ ] Every list/grid has empty state with CTA button
  [ ] Upload Wizard: all states (idle -> selecting -> hashing -> uploading -> complete -> error)
  [ ] Access flow: all 5 states (no wallet -> connected -> processing -> active -> expired)
  [ ] IntegrityBadge: all 4 states (verified / tampered / pending / unavailable)
  [ ] Dataset Card: tampered variant tested (red tint + danger left border)

SHELBY INTEGRATION VISIBLE:
  [ ] blobId visible on dataset detail
  [ ] merkleRoot visible on dataset detail with Aptos link
  [ ] txHash in ProvenanceTree events with working Aptos links
  [ ] "Stored on Shelby Protocol" visible in dataset header
  [ ] Clay chunk count "16 chunks (10+6)" in dataset metadata
  [ ] Upload progress shows "Clay erasure encoding" stage
  [ ] Session ID visible on active access session

RESPONSIVE:
  [ ] Marketplace grid: 3col -> 2col -> 1col at breakpoints
  [ ] Navbar: hamburger menu on mobile opens full drawer
  [ ] Dataset detail: single column on mobile, right panel below
  [ ] Upload Wizard: usable on mobile (tested on 375px wide viewport)
  [ ] Touch: dropdowns, tooltips, hover states work on touch

PERFORMANCE:
  [ ] LCP: Dataset grid loads skeletons in <100ms
  [ ] No layout shift on data load (skeleton dimensions match real content)
  [ ] All images lazy loaded (if any)
  [ ] AddressDisplay renders truncated immediately (not after computing)
  [ ] TanStack Query cache: dataset metadata staleTime 300000 (5 min)

ACCESSIBILITY:
  [ ] All interactive elements reachable by Tab key
  [ ] All icon-only buttons have aria-label
  [ ] Focus ring visible on all focused elements (teal ring)
  [ ] Color contrast: all text passes 4.5:1 minimum
  [ ] Modals trap focus while open
  [ ] Toast region has aria-live="polite"

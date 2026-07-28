---
name: frontend-design
description: >
  MUST USE for any frontend, UI, or web interface implementation. Enforces
  production-grade visual quality, accessibility, responsive design, and
  professional polish. Triggers on "build a UI", "frontend", "website",
  "landing page", "dashboard", "make it look professional", any
  React/Vue/Svelte/HTML component work.
---

# Professional Frontend Design

Turns generic AI-generated UIs into production-grade, visually distinctive
interfaces via a design reasoning framework plus concrete engineering standards.

## Scope gate — before anything else

Check for an existing design system (`tailwind.config`, `theme.ts`, `tokens.json`,
`design-system/`, shadcn/MUI/Chakra, etc.).
- **Exists:** reference it, don't generate a new one. Jump to Quality Standards.
- **Greenfield:** do the Design System steps below.

## Design system generation (greenfield only)

1. **Analyze requirements** — product type, audience, platform, brand/framework
   constraints, trust sensitivity, primary user goal.
2. **Select direction explicitly** — style (glassmorphism/brutalism/flat/minimalism/
   dark-mode/etc.), color mood, typography mood, key effects, density
   (compact/balanced/spacious), visual anchor.
3. **Name anti-patterns for this product type** up front (e.g. finance: no playful
   colors/heavy motion; healthcare: no neon/low contrast; government: no ornate
   design/low contrast).
4. **Output a one-line design summary** before writing code:
   `Design System: [Product] — [Style] | Colors: … | Typography: … | Effects: … | Avoid: …`

## Distinctiveness — the UI must have identity

Include at least one: a deliberate typographic decision, a non-generic layout
structure (asymmetric grid, bento, split-screen), a repeating visual motif, or an
intentional density choice. Avoid the default hero+3-cards+testimonials+pricing
template, decorative-only gradients, and equal-weight card grids.
**Test:** if the UI could belong to any startup after a logo swap, it failed.

## UI states — every data view needs all five

Loading (skeleton matching layout, never a blank/spinner-only screen) · Error
(cause + fix + retry) · Empty (message + primary action) · Success · Partial/
degraded (what's stale, what's missing). Shipping only "success" is the most
common AI-generated-UI gap.

## Quality standards (apply regardless of style)

**Accessibility (critical):** 4.5:1 contrast (3:1 large text) · visible
`focus-visible` rings, never bare `outline:none` · alt text · `aria-label` on
icon-only controls · full keyboard operability, matching tab order · sequential
heading hierarchy, one `h1` · never color-only signaling · `prefers-reduced-motion`
guard on every animation · skip-to-content link · semantic HTML, no `<div onclick>`.

**Touch & interaction (critical):** ≥44px targets, 8px+ gaps · never hover-only for
primary actions · disable+spinner on async buttons · `touch-action: manipulation`.

**Performance (high):** WebP/AVIF + responsive images · `loading="lazy"`
below-fold · explicit `width`/`height`/`aspect-ratio` to avoid CLS · virtualize
lists 50+ items · skeleton for anything over 300ms.

**Layout & responsive (high):** mobile-first, `min-width` scale-up · viewport meta
without disabling zoom · breakpoints ~375/768/1024/1440 · no horizontal scroll on
mobile · consistent spacing scale · `min-h-dvh` not `100vh` on mobile.

**Forms & feedback (medium):** visible labels, not placeholder-only · errors below
the field with cause+fix · validate on blur not keystroke · confirm before
destructive actions · toast auto-dismiss 3-5s with `aria-live="polite"`.

**Animation (medium):** 150-300ms micro, ≤400ms complex, never >500ms · animate
`transform`/`opacity` only · interruptible by user input · 1-2 animated elements
per view max.

## Micro-copy

Specific verbs on buttons ("Save changes" not "Submit") · errors state cause + fix
· empty states explain what the space is for and how to fill it · confirmation
dialogs name the destructive action · loading text describes what's happening past
3s.

## Pre-delivery checklist

- [ ] Keyboard accessible end-to-end
- [ ] WCAG AA contrast
- [ ] Touch targets ≥44px, 8px+ gaps
- [ ] No horizontal scroll at 375px
- [ ] `prefers-reduced-motion` respected
- [ ] Semantic HTML, no div-onclick
- [ ] Loading/error/empty states present for all async content
- [ ] Responsive checked at 375/768/1024/1440
- [ ] Doesn't read as a generic AI template
- [ ] One clear primary action per section

## Fix priority when self-reviewing

structure → hierarchy → spacing → typography → color → interaction → polish
(earlier items affect everything downstream).

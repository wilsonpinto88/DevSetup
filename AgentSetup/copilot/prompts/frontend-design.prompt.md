---
mode: 'agent'
description: 'Production-grade UI/UX design reasoning. Use for any frontend, UI, or web interface implementation — enforces visual distinctiveness, accessibility, and professional polish instead of generic SaaS templates.'
---

# Frontend Design

Transform generic AI-generated UIs into production-grade, visually distinctive interfaces.

## Scope Gate — check first

- Does the project already have a design system / component library (`tailwind.config`, `theme.ts`, `tokens.json`, shadcn/MUI/Chakra)?
  - **Yes** → reference it, don't generate a new one. Only fill clear gaps.
  - **No** → proceed with design system generation below.

## Design Reasoning (greenfield only)

1. **Analyze requirements**: product type, audience, platform, brand constraints, trust sensitivity, primary user goal.
2. **Select direction explicitly**: style (e.g. minimalism, glassmorphism, brutalism, dark OLED), color mood, typography mood, key motion effects, density (compact/balanced/spacious), visual anchor.
3. **Name anti-patterns for this domain** before implementing (e.g. finance: no playful colors/excess animation; healthcare: no neon/low contrast).
4. **Output a short design summary** before writing code: Design System / Colors / Typography / Effects / Avoid.

## Distinctiveness Enforcement

Every UI must have at least one distinctiveness signal: strong typography decision, distinctive layout (asymmetric grid, bento, split-screen), a repeating visual motif, or a deliberate density choice.

**Avoid**: default hero+3-cards+testimonials+pricing template, purposeless gradients, equal-weight card grids, "pleasant but forgettable" output.

**The test**: if the UI could belong to any startup after a logo swap, it failed — the chosen direction must be visible in the result.

<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->
---
name: QuickMeal Warehouse
description: Internal warehouse management system
---

# Design System: QuickMeal Warehouse

## 1. Overview

**Creative North Star: "The Industrial Workbench"**

A no-nonsense warehouse tool built for speed and accuracy under fluorescent lights. Every pixel serves the workflow: large hit targets for stock staff scanning serials on tablets, dense data views for managers reviewing reports, and clear role-based navigation that surfaces exactly what each user needs. The aesthetic is corporate-industrial — think factory floor control panels and well-organized shipping desks, not startup landing pages or SaaS dashboards.

This system explicitly rejects: marketing landing page patterns, decorative gradients, card-within-card layouts, glassmorphism, and any animation that doesn't serve a functional purpose.

**Key Characteristics:**
- Sparse, high-contrast layouts with generous hit targets for field operators
- Dense-but-scannable data displays for managerial views
- Color restrained to one cool accent; neutrals do the heavy lifting
- Corporate typography: IBM Plex Sans — professional, readable, industrial
- Flat by default; elevation only as a functional response to state

## 2. Colors

**Strategy: Restrained.** Tinted neutrals carry 90%+ of the surface. One cool steel-blue accent used sparingly (≤10%) for interactive elements only — not decoration.

### Primary
- **Steel Blue** (`[to be resolved during implementation]`): Buttons, links, selected states, active indicators. Used only on interactive affordances, never on backgrounds or decorative elements.

### Neutral
- **Ink** (`[to be resolved during implementation]`): Body text and primary headings. High contrast (≥4.5:1 against backgrounds).
- **Ream** (`[to be resolved during implementation]`): Page and card backgrounds.
- **Surface** (`[to be resolved during implementation]`): Sidebars, navigation, input backgrounds.
- **Border** (`[to be resolved during implementation]`): Hairline dividers and input strokes. Subtle enough to not compete with content.
- **Muted** (`[to be resolved during implementation]`): Secondary text, placeholders, disabled states.

### Named Rules
**The ≤10% Rule.** The steel-blue accent covers at most 10% of any given screen. Its rarity is the point — when a user sees blue, they know it's actionable.

**The No-Decorative-Color Rule.** Color is never used for visual interest. If it's not an interactive state or a semantic signal (error red, success green), it doesn't get color.

## 3. Typography

**Display & Body Font:** IBM Plex Sans (with system sans-serif fallback)

**Character:** A single clean sans-serif family for everything. IBM Plex Sans brings a mechanical precision with its squared characters and generous spacing — reads as "built for work, not for browsing." No serif for flavor, no condensed for fitting. One weight scale, consistent across all surfaces.

### Hierarchy
- **Display** (700, clamp(1.5rem, 3vw, 2.5rem), 1.2): Page titles and dashboard metric cards.
- **Headline** (600, clamp(1.125rem, 2vw, 1.5rem), 1.3): Section headers, dialog titles.
- **Title** (600, 1rem, 1.4): Card headers, navigation labels.
- **Body** (400, 0.875rem / 14px, 1.5): Primary reading text. Max line length 70ch.
- **Small/Body Secondary** (400, 0.8125rem / 13px, 1.4): Metadata, table cells, descriptions.
- **Label** (500, 0.75rem / 12px, 1.3, 0.02em letter-spacing): Form labels, button text, tab labels.
- **Mono** (400, 0.8125rem / 13px, 1.4): Serial numbers, barcode output, audit IDs.

### Named Rules
**The One-Family Rule.** IBM Plex Sans across all roles: display, body, labels, and UI. No mix of serif, display, or secondary families. Consistency is the signal of reliability.

## 4. Elevation

Flat by default. The interface uses tonal layering (lighter and darker neutral backgrounds) to create depth, not box-shadows. Shadows appear only as a momentary feedback — a dropdown that lifts above the page, a modal that sits on a backdrop. At rest, every surface is flat.

## 5. Components

*[Omitted in seed. Re-run `/impeccable document` once components are built to capture the actual tokens and structure.]*

## 6. Do's and Don'ts

### Do:
- **Do** use the steel-blue accent exclusively on interactive elements — buttons, links, active states.
- **Do** keep layouts flat at rest; reserve shadows for transient overlays (dropdowns, modals, tooltips).
- **Do** make hit targets large (minimum 44×44px) for warehouse staff on tablets.
- **Do** use IBM Plex Sans everywhere — one family, no exceptions.
- **Do** keep body text contrast at ≥4.5:1 against its background.
- **Do** use `text-wrap: balance` on headings and `text-wrap: pretty` on body text.

### Don't:
- **Don't** use gradients — neither on text (`background-clip: text`) nor on surfaces.
- **Don't** build card-in-card layouts (card-ception).
- **Don't** use glassmorphism, backdrop blur, or decorative transparency.
- **Don't** animate for visual interest — transitions are for state changes only (hover, focus, open/close).
- **Don't** use side-stripe borders (border-left/right >1px colored accent).
- **Don't** use numbered section markers (01 / 02 / 03) as decoration.
- **Don't** use uppercase tracked eyebrow text above sections.
- **Don't** build layouts that look like classic ERP systems — dense form grids, heavy borders, outdated control panels.
- **Don't** use Inter, or any font that reads like a startup/SaaS product.

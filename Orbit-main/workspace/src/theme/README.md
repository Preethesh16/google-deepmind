# Orbit Workspace — Theme & Design System

Global theme every page/component must inherit from. **Never introduce ad-hoc hex values, font sizes, radii, shadows, or animation timings** — pull from these tokens.

## Files

| File | What it holds |
|---|---|
| `tokens.css` | CSS variables (colors, radius, shadows, motion timings) + base styles + canonical `.card` / `.btn-primary` / `.btn-secondary` / `.tag` classes |
| `../../tailwind.config.js` | Maps tokens to Tailwind utilities (`bg-background`, `text-stat`, `rounded-card`, `shadow-lift`, …) |
| `motion.ts` | Shared framer-motion presets: `fadeIn`, `slideUp`, `staggerContainer`, `hoverScale`, `hoverLift`, `entrance`, `interactive` |
| `index.ts` | Re-exports motion presets + JS mirrors of tokens (`colors`, `radius`, `spacing`, `icon`) for charts/canvas |

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `background` | `#FFF8F6` | App background (warm white, matches landing) |
| `surface` | `#FFFFFF` | Cards, panels |
| `dark-surface` | `#111111` | Dark sections, mockup frames, footer |
| `primary` | `#A53600` | Buttons, links, highlights, active states |
| `primary-hover` | `#812800` | Hover/pressed primary |
| `primary-soft` | 8% orange | Icon chips, active-nav tint, badges |
| `text-primary` | `#261814` | Main text on light bg |
| `text-secondary` | `#625E59` | Muted text, labels, captions |
| `text-inverse` | `#FFFFFF` | Text on dark bg |
| `border` | `#F2E0D8` | Dividers, card borders |
| `success` | `#2FA36B` | Positive metrics/stat increases |

## Type scale (font: Inter 400/500/600/700, loaded in `index.html`)

Use Tailwind classes: `text-display` (56/bold/1.1), `text-page-title` (32/bold), `text-section-heading` (22/semibold), `text-card-title` (16/semibold), `text-body` (15/regular/1.6), `text-label` (12/medium/0.02em), `text-stat` (28/bold — add `data-stat` attr for tabular-nums).

## Layout rules

- Spacing: 4px base scale (Tailwind defaults) — 4, 8, 12, 16, 24, 32, 48, 64.
- Section rhythm: `py-section` (96px), `py-section-sm` (80px), `py-section-lg` (120px).
- Radius: `rounded-card` (16px) for cards/hero, `rounded-button` (10px) for buttons/inputs, `rounded-pill` for tags/nav pills.
- Cards: use `.card` (white surface, 1px border, `shadow-card`, 24–32px padding).
- Icons: Lucide/Heroicons outline only (no emojis), stroke 1.5–2px, 20px nav / 16px inline (`icon` export in `index.ts`).

## Motion rules (framer-motion)

- Import presets from `./theme` — do not define ad-hoc variants per page.
- Entrances: `slideUp`/`fadeIn` inside a `staggerContainer` (0.1s stagger), 0.35s easeOut — subtle drift, never bouncy.
- Hover/interactive: `hoverScale` / `hoverLift`, 0.3s easeInOut. Animate transform/opacity only; shadows via CSS `hover:shadow-lift transition-shadow`.
- Reduced motion: app root is wrapped in `<MotionConfig reducedMotion="user">` and `tokens.css` kills CSS transitions — keep both intact.

## Accessibility non-negotiables

- Focus rings are global (`:focus-visible` orange outline) — don't remove.
- `text-secondary` (#625E59) is for captions/labels only, never long body text.
- All clickable elements get `cursor-pointer` (built into `.btn-*`); icon-only buttons need `aria-label`.

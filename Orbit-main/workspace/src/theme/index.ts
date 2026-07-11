/**
 * Orbit workspace theme — public entry point.
 *
 * - Colors/radius/shadows live as CSS variables in tokens.css and are exposed
 *   as Tailwind utilities (bg-background, text-text-secondary, rounded-card,
 *   shadow-lift, text-stat, …) via tailwind.config.js.
 * - Motion presets live in motion.ts.
 * - The `colors` object below mirrors the CSS variables for the rare cases
 *   that need a JS value (charts, canvas, framer-motion color animation).
 *
 * App root should be wrapped in:
 *   <MotionConfig reducedMotion="user"> … </MotionConfig>
 * so framer-motion honors prefers-reduced-motion globally.
 */
export * from './motion.js'

export const colors = {
  background: '#FFF8F6',
  surface: '#FFFFFF',
  darkSurface: '#111111',
  primary: '#A53600',
  primaryHover: '#812800',
  textPrimary: '#261814',
  textSecondary: '#625E59',
  textInverse: '#FFFFFF',
  border: '#F2E0D8',
  success: '#2FA36B',
} as const

export const radius = {
  card: 16,
  button: 10,
  pill: 9999,
} as const

/** 4px-base spacing scale (px). */
export const spacing = [4, 8, 12, 16, 24, 32, 48, 64] as const

/** Icon sizing + stroke conventions (Lucide/Heroicons outline style). */
export const icon = {
  nav: 20,
  inline: 16,
  strokeWidth: 1.75,
} as const

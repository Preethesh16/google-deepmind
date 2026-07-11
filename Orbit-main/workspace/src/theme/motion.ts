/**
 * Orbit workspace — shared framer-motion presets.
 * Import these instead of defining animations ad hoc per page:
 *
 *   <motion.div variants={staggerContainer} initial="hidden" animate="visible">
 *     <motion.div variants={slideUp}>…</motion.div>
 *   </motion.div>
 *
 *   <motion.button whileHover={hoverScale.whileHover} transition={interactive}>
 *
 * Keep entrances subtle: soft fade + slight upward drift, never bouncy.
 * framer-motion respects prefers-reduced-motion via <MotionConfig reducedMotion="user">
 * — wrap the app root in it (see theme/index.ts note).
 */
import type { Transition, Variants } from 'framer-motion'

/** Entrance transition — 0.35s easeOut. */
export const entrance: Transition = { duration: 0.35, ease: 'easeOut' }

/** Interactive (hover/tap) transition — 0.3s easeInOut. */
export const interactive: Transition = { duration: 0.3, ease: 'easeInOut' }

/** Soft opacity fade. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: entrance },
}

/** Fade + slight upward drift — the default entrance for cards and sections. */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: entrance },
}

/**
 * Parent wrapper that staggers its children's entrance by 0.1s
 * (children should use `slideUp` or `fadeIn` variants).
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}

/** Subtle grow on hover, for buttons and small interactive elements. */
export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: interactive,
} as const

/**
 * Card hover: floats up slightly. Pair with Tailwind `hover:shadow-lift`
 * (shadow via CSS, not framer-motion — cheaper to animate).
 */
export const hoverLift = {
  whileHover: { y: -4 },
  transition: interactive,
} as const

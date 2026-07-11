/** @type {import('tailwindcss').Config} */
// Orbit workspace design system — every value here maps to a CSS variable
// declared in src/theme/tokens.css. Components must use these token classes
// (bg-background, text-primary, rounded-card, …), never raw hex values.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',      // #F7F5F1 warm off-white app bg
        surface: 'var(--color-surface)',            // #FFFFFF cards, panels
        'dark-surface': 'var(--color-dark-surface)',// #111111 dark sections, mockup frames
        primary: {
          DEFAULT: 'var(--color-primary)',          // #F0632A burnt orange
          hover: 'var(--color-primary-hover)',
          soft: 'var(--color-primary-soft)',        // 10% tint for icon chips / badges
        },
        'text-primary': 'var(--color-text-primary)',     // #1A1A1A
        'text-secondary': 'var(--color-text-secondary)', // #8A8580
        'text-inverse': 'var(--color-text-inverse)',     // #FFFFFF
        border: 'var(--color-border)',              // #E8E4DE
        success: 'var(--color-success)',            // #2FA36B positive metrics
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      fontSize: {
        // Type scale — use these names, not arbitrary sizes
        display: ['56px', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '700' }],
        'page-title': ['32px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'section-heading': ['22px', { lineHeight: '1.2', fontWeight: '600' }],
        'card-title': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['15px', { lineHeight: '1.6', fontWeight: '400' }],
        label: ['12px', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        stat: ['28px', { lineHeight: '1.2', fontWeight: '700' }],
      },
      borderRadius: {
        card: 'var(--radius-card)',     // 16px large cards / hero sections
        button: 'var(--radius-button)', // 10px buttons / inputs
        pill: '9999px',                 // tags, nav pills
      },
      boxShadow: {
        card: 'var(--shadow-card)',     // soft resting card shadow
        lift: 'var(--shadow-lift)',     // hover "floating" shadow
      },
      spacing: {
        // 4px base scale already covered by Tailwind defaults (1=4px … 16=64px).
        // Section rhythm tokens for generous vertical whitespace:
        section: '96px',
        'section-sm': '80px',
        'section-lg': '120px',
      },
      transitionTimingFunction: {
        entrance: 'cubic-bezier(0, 0, 0.2, 1)',   // easeOut — entrances
        interactive: 'cubic-bezier(0.4, 0, 0.2, 1)', // easeInOut — hover/active
      },
      transitionDuration: {
        DEFAULT: '200ms', // micro-interactions
        entrance: '350ms',
      },
    },
  },
  plugins: [],
}

/* Shared Tailwind CDN config + base styles for all Orbit landing pages.
   Load AFTER the Tailwind CDN script on every page. */
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#a53600",
        "primary-container": "#cc490e",
        "primary-fixed": "#ffdbcf",
        "primary-fixed-dim": "#ffb59b",
        "on-primary": "#ffffff",
        secondary: "#625e59",
        tertiary: "#00638a",
        "tertiary-container": "#007dad",
        "tertiary-fixed": "#c6e7ff",
        surface: "#fff8f6",
        "surface-container": "#ffe9e3",
        "surface-container-low": "#fff1ec",
        "surface-container-high": "#fce3db",
        "on-surface": "#261814",
        "on-surface-variant": "#594139",
        outline: "#8d7167",
        "outline-variant": "#e1bfb4",
        error: "#ba1a1a",
      },
      borderRadius: {
        lg: "16px",
        xl: "24px",
      },
      spacing: {
        "margin-desktop": "64px",
        "margin-mobile": "20px",
        "container-max": "1280px",
        gutter: "24px",
        "section-padding": "120px",
        "stack-sm": "8px",
        "stack-md": "16px",
        "stack-lg": "32px",
      },
      fontSize: {
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "label-sm": ["14px", { lineHeight: "1.2", letterSpacing: "0.01em", fontWeight: "500" }],
        "display-lg": ["72px", { lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "700" }],
        "headline-xl": ["48px", { lineHeight: "1.2", letterSpacing: "-0.03em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-lg-mobile": ["28px", { lineHeight: "1.3", fontWeight: "600" }],
      },
    },
  },
};

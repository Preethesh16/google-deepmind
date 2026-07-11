/**
 * Icons — a compact, consistent stroke-based icon set (lucide-style).
 * All emojis in the product are replaced by these so the UI reads as a
 * professional engineering tool rather than an "AI-generated" mockup.
 */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, strokeWidth = 1.6, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconLogo = (p: P) => base({ ...p, children: (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
  </>
) });

export const IconBuilding = (p: P) => base({ ...p, children: (
  <>
    <rect x="4" y="3" width="16" height="18" rx="1.5" />
    <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" />
  </>
) });

export const IconBulb = (p: P) => base({ ...p, children: (
  <>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3Z" />
  </>
) });

export const IconUsers = (p: P) => base({ ...p, children: (
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
    <path d="M16 3.5a3 3 0 0 1 0 5.8M17 15c2.5.4 4 1.9 4 5" />
  </>
) });

export const IconZap = (p: P) => base({ ...p, children: (
  <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
) });

export const IconLayers = (p: P) => base({ ...p, children: (
  <>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5M3 17l9 5 9-5" />
  </>
) });

export const IconCompass = (p: P) => base({ ...p, children: (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
  </>
) });

export const IconCpu = (p: P) => base({ ...p, children: (
  <>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <path d="M10 11h4v4h-4z" />
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
  </>
) });

export const IconHammer = (p: P) => base({ ...p, children: (
  <>
    <path d="m14 6 4 4M3 21l7-7" />
    <path d="M12.5 4.5 15 2l7 7-2.5 2.5-3-3-4 4-4-4 4-4 3 3Z" />
  </>
) });

export const IconScan = (p: P) => base({ ...p, children: (
  <>
    <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
    <circle cx="12" cy="12" r="3" />
  </>
) });

export const IconWrench = (p: P) => base({ ...p, children: (
  <path d="M14.5 5.5a4 4 0 0 0-5 5L3 17l4 4 6.5-6.5a4 4 0 0 0 5-5l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z" />
) });

export const IconMic = (p: P) => base({ ...p, children: (
  <>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
  </>
) });

export const IconMicOff = (p: P) => base({ ...p, children: (
  <>
    <path d="m2 2 20 20" />
    <path d="M15 9.3V6a3 3 0 0 0-5.7-1.3M9 9v2a3 3 0 0 0 4.5 2.6" />
    <path d="M5 11a7 7 0 0 0 10.7 6M19 11a7 7 0 0 1-.6 2.8M12 18v3M8 21h8" />
  </>
) });

export const IconSend = (p: P) => base({ ...p, children: (
  <path d="M4 12 20 4l-6 16-3-7-7-1Z" />
) });

export const IconArrowRight = (p: P) => base({ ...p, children: (
  <path d="M5 12h14M13 6l6 6-6 6" />
) });

export const IconArrowLeft = (p: P) => base({ ...p, children: (
  <path d="M19 12H5M11 6l-6 6 6 6" />
) });

export const IconChevronRight = (p: P) => base({ ...p, children: (
  <path d="m9 6 6 6-6 6" />
) });

export const IconPlay = (p: P) => base({ ...p, children: (
  <path d="M7 4v16l13-8L7 4Z" />
) });

export const IconGithub = (p: P) => base({ ...p, children: (
  <path d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.3 2.3 5.3 2.6 5.3 2.6a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9c0 4.5 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
) });

export const IconFolder = (p: P) => base({ ...p, children: (
  <path d="M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" />
) });

export const IconShield = (p: P) => base({ ...p, children: (
  <>
    <path d="M12 3 5 6v5c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </>
) });

export const IconCheck = (p: P) => base({ ...p, children: (
  <path d="M20 6 9 17l-5-5" />
) });

export const IconCheckCircle = (p: P) => base({ ...p, children: (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </>
) });

export const IconX = (p: P) => base({ ...p, children: (
  <path d="M18 6 6 18M6 6l12 12" />
) });

export const IconGlobe = (p: P) => base({ ...p, children: (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.4 3.8 5.6 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3Z" />
  </>
) });

export const IconRocket = (p: P) => base({ ...p, children: (
  <>
    <path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.8-.8.8-2.2 0-3s-2.2-.8-3 0Z" />
    <path d="M9 15 6.5 12.5C7 7 10 4 15 3c1 5-2 8-7.5 8.5L9 15Z" />
    <circle cx="14" cy="8" r="1.4" />
  </>
) });

export const IconSettings = (p: P) => base({ ...p, children: (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15H2.8a2 2 0 1 1 0-4H3a1.6 1.6 0 0 0 1.1-2.7l-.1-.1A2 2 0 1 1 6.8 5.3l.1.1A1.6 1.6 0 0 0 9 5.7V5.5a2 2 0 1 1 4 0v.2A1.6 1.6 0 0 0 17 6.6l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 12h.2a2 2 0 1 1 0 4H21Z" />
  </>
) });

export const IconTerminal = (p: P) => base({ ...p, children: (
  <>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <path d="m7 9 3 3-3 3M13 15h4" />
  </>
) });

export const IconActivity = (p: P) => base({ ...p, children: (
  <path d="M3 12h4l2 6 4-14 2 8h6" />
) });

export const IconLock = (p: P) => base({ ...p, children: (
  <>
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </>
) });

export const IconPlus = (p: P) => base({ ...p, children: (
  <path d="M12 5v14M5 12h14" />
) });

export const IconTrash = (p: P) => base({ ...p, children: (
  <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
) });

export const IconSpark = (p: P) => base({ ...p, children: (
  <path d="M12 3v4M12 17v4M3 12h4M17 12h4M12 8l1.6 2.4L16 12l-2.4 1.6L12 16l-1.6-2.4L8 12l2.4-1.6L12 8Z" />
) });

export const IconFile = (p: P) => base({ ...p, children: (
  <>
    <path d="M13 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8l-5-5Z" />
    <path d="M13 3v5h5" />
  </>
) });

export const IconExternal = (p: P) => base({ ...p, children: (
  <path d="M15 3h6v6M21 3l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
) });

export const IconLoader = (p: P) => base({ ...p, children: (
  <path d="M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
) });

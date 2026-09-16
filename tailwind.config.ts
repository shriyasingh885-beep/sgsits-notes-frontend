import type { Config } from "tailwindcss";

/**
 * Mint Eucalyptus design system. Every value here points at a CSS variable
 * declared in src/app/globals.css — that file is the single source of truth;
 * this config just names it for Tailwind. Two naming layers exist on purpose:
 * the original semantic names (ink, secondary, muted, card, panel, ...) that
 * the existing component library already uses, and the canonical system
 * names the design calls for (primary, primary-soft, primary-strong,
 * surface-soft, text, text-muted, text-faint, border-soft, shadow-sm/md/lg,
 * radius via rounded-sm/md/lg). Both resolve to the same variables, so there
 * is never a second palette to keep in sync — new components should reach
 * for the canonical names.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-soft": "var(--surface-soft)",
        elevated: "var(--surface-elevated)",
        white: "var(--white)",
        sage: {
          50: "var(--sage-50)",
          100: "var(--sage-100)",
          200: "var(--sage-200)",
          300: "var(--sage-300)",
          400: "var(--sage-400)",
          500: "var(--sage-500)",
          600: "var(--sage-600)",
          700: "var(--sage-700)",
          800: "var(--sage-800)",
        },
        // canonical system names — new work should prefer these
        primary: "var(--sage-500)",
        "primary-soft": "var(--tint-sage)",
        "primary-strong": "var(--sage-800)",
        "row-hover": "var(--row-hover)",
        text: "var(--text-primary)",
        "text-muted": "var(--text-muted)",
        "text-faint": "var(--text-faint)",
        "border-soft": "var(--border-light)",
        cream: "var(--accent-cream)",
        "cream-ink": "var(--accent-cream-ink)",
        // legacy semantic names — kept so the existing component library
        // (Button, Badge, PageHeader, ...) needs no per-file rewrite
        ink: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        border: "var(--border)",
        "border-light": "var(--border-light)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
      borderRadius: {
        // canonical scale
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        // legacy component-specific names, resized a notch roomier
        tiny: "8px",
        button: "10px",
        input: "12px",
        card: "16px",
        panel: "18px",
        shell: "22px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        card: "var(--shadow-sm)",
        "card-hover": "var(--shadow-md)",
        pop: "var(--shadow-lg)",
        focus: "var(--focus-ring)",
      },
      fontSize: {
        micro: ["11px", { lineHeight: "1.45" }],
        meta: ["12px", { lineHeight: "1.5" }],
        body: ["13px", { lineHeight: "1.6" }],
        "body-lg": ["14px", { lineHeight: "1.6" }],
        "card-title": ["15px", { lineHeight: "1.4" }],
        section: ["17px", { lineHeight: "1.35" }],
        page: ["30px", { lineHeight: "1.18" }],
        hero: ["clamp(2.25rem, 4.4vw, 3.4rem)", { lineHeight: "1.08", letterSpacing: "-0.03em" }],
        reader: ["16px", { lineHeight: "1.75" }],
      },
      fontWeight: {
        heading: "680",
      },
      spacing: {
        "1.5": "6px",
        "4.5": "18px",
        "5.5": "22px",
        "7.5": "30px",
        sidebar: "264px",
        contents: "230px",
        actions: "220px",
        nav: "44px",
        bottomnav: "66px",
      },
      maxWidth: {
        shell: "1400px",
        reader: "760px",
      },
      transitionTimingFunction: {
        calm: "var(--ease)",
      },
      transitionDuration: {
        calm: "180ms",
      },
      backgroundImage: {
        "eucalyptus-fade": "linear-gradient(135deg, var(--sage-500), var(--sage-800))",
      },
    },
  },
  plugins: [],
};
export default config;

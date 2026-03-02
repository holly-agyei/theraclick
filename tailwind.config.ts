import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand teal mapped onto "primary" so existing classes auto-update ──
        primary: {
          DEFAULT: "#2BB5A0",
          50: "#EEFBF8",
          100: "#D5F5EF",
          200: "#AEE9DF",
          300: "#7BD8CA",
          400: "#2BB5A0",
          500: "#2BB5A0",
          600: "#1A7A6E",
          700: "#0F4F47",
          800: "#0D3D37",
          900: "#0D1F1D",
        },
        // ── Brand gold accent ──
        gold: {
          DEFAULT: "#F5C842",
          50: "#FFFDF0",
          100: "#FFF8D6",
          200: "#FFEFAD",
          300: "#FFE480",
          400: "#F5C842",
          500: "#E8A800",
          600: "#C48E00",
        },
        // ── Shadcn CSS-variable hooks (unchanged) ──
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;

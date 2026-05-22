/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // App surface layers
        surface: {
          DEFAULT: "#0f1117",
          1: "#161922",
          2: "#1c2030",
          3: "#222638",
          4: "#2a2f47",
        },
        // Brand accent
        accent: {
          DEFAULT: "#4f6ef7",
          hover: "#3d5ce6",
          muted: "#4f6ef720",
          subtle: "#4f6ef710",
        },
        // Border
        border: {
          DEFAULT: "#252a3d",
          strong: "#2f3550",
        },
        // Text
        ink: {
          DEFAULT: "#e2e8f0",
          muted: "#8892b0",
          faint: "#4a5278",
        },
        // Status
        success: { DEFAULT: "#22c55e", muted: "#22c55e20", text: "#4ade80" },
        warning: { DEFAULT: "#f59e0b", muted: "#f59e0b20", text: "#fbbf24" },
        danger:  { DEFAULT: "#ef4444", muted: "#ef444420", text: "#f87171" },
        info:    { DEFAULT: "#3b82f6", muted: "#3b82f620", text: "#60a5fa" },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};

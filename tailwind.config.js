/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        deep: 'rgb(var(--deep) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        tide: 'rgb(var(--tide) / <alpha-value>)',
        dende: 'rgb(var(--dende) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        paperink: 'rgb(var(--paperink) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        blink: { '0%,80%,100%': { opacity: '.25' }, '40%': { opacity: '1' } },
        print: { from: { clipPath: 'inset(0 0 100% 0)' }, to: { clipPath: 'inset(0 0 0 0)' } },
      },
      animation: {
        rise: 'rise .35s cubic-bezier(.2,.7,.2,1) both',
        blink: 'blink 1.2s infinite both',
        print: 'print .6s steps(12) both',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display:  ['Noto Sans', 'sans-serif'],
        body:     ['Plus Jakarta Sans', 'sans-serif'],
        mono:     ['DM Mono', 'monospace'],
        numbers:  ['Oxanium', 'sans-serif'],
      },
      colors: {
        // ── Surfaces — CSS variable channels for theme switching ──
        surface: {
          DEFAULT:  'rgb(var(--surface) / <alpha-value>)',
          card:     'rgb(var(--surface-card) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
          border:   'rgb(var(--surface-border) / <alpha-value>)',
        },
        // ── Brand (orange) ──
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          light:   'rgb(var(--brand-light) / <alpha-value>)',
          dark:    'rgb(var(--brand-dark) / <alpha-value>)',
          muted:   'rgb(var(--brand-muted) / <alpha-value>)',
        },
        // ── Text ──
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted:   'rgb(var(--ink-muted) / <alpha-value>)',
          faint:   'rgb(var(--ink-faint) / <alpha-value>)',
        },
        // ── New accent palette ──
        lime: {
          DEFAULT: '#DBEB15',
          2:       '#A1EB09',
          dark:    '#3A5200',
        },
        lemon: {
          DEFAULT: '#FABC1B',
          2:       '#EBD509',
        },
        // ── Status colors (light + dark variants via dark: prefix) ──
        status: {
          draft:        '#9CA3AF',
          'draft-bg':   '#F3F4F6',
          stock:        '#5B8A00',
          'stock-bg':   '#ECFCCB',
          reserved:     '#92600A',
          'reserved-bg':'#FEF3C7',
          sold:         '#C25B00',
          'sold-bg':    '#FFF0D9',
        },
      },
      backgroundImage: {
        'dot-pattern': "radial-gradient(circle, rgb(var(--surface-border)) 1px, transparent 1px)",
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h32v32H0z' fill='none'/%3E%3Cpath d='M32 0v32M0 32' stroke='%23B4A014' stroke-opacity='0.07' stroke-width='0.5'/%3E%3C/svg%3E\")",
      },
      animation: {
        'scan-line':  'scanLine 2s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'slide-up':   'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in':    'fadeIn 0.2s ease-out',
        'pop-in':     'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'fab-open':   'fabOpen 0.2s ease-out forwards',
      },
      keyframes: {
        scanLine: {
          '0%, 100%': { transform: 'translateY(0%)', opacity: '1' },
          '50%':      { transform: 'translateY(180px)', opacity: '0.7' },
        },
        pulseRing: {
          '0%':   { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2)',   opacity: '0' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        slideDown: {
          from: { transform: 'translateY(-20px)', opacity: '0' },
          to:   { transform: 'translateY(0)',     opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        popIn: {
          from: { transform: 'scale(0.8)', opacity: '0' },
          to:   { transform: 'scale(1)',   opacity: '1' },
        },
        fabOpen: {
          from: { transform: 'scale(0) translateY(10px)', opacity: '0' },
          to:   { transform: 'scale(1) translateY(0)',    opacity: '1' },
        },
      },
      boxShadow: {
        'glow-brand': '0 0 20px rgba(234,144,3,0.35)',
        'glow-lime':  '0 0 20px rgba(219,235,21,0.4)',
        'card':       '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(180,160,20,0.1)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.1), 0 0 0 1px rgba(234,144,3,0.2)',
      },
    },
  },
  plugins: [],
}

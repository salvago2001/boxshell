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
        display: ['Syne', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Fondo base
        surface: {
          DEFAULT: '#07090D',
          card: '#0F1420',
          elevated: '#141B2D',
          border: '#1E2A42',
        },
        // Acento principal naranja (cajas/cartón)
        brand: {
          DEFAULT: '#FF6B2B',
          light: '#FF8C5A',
          dark: '#E05520',
          muted: '#2A1810',
        },
        // Estados
        status: {
          draft: '#4A5568',
          'draft-bg': '#1A1D24',
          stock: '#3B82F6',
          'stock-bg': '#0F1B35',
          reserved: '#F59E0B',
          'reserved-bg': '#2A1F08',
          sold: '#10B981',
          'sold-bg': '#061F16',
        },
        // Texto
        ink: {
          DEFAULT: '#E8EDF5',
          muted: '#5A6A8A',
          faint: '#2A3348',
        },
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231E2A42' fill-opacity='0.4'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        'dot-pattern': "radial-gradient(circle, #1E2A42 1px, transparent 1px)",
      },
      animation: {
        'scan-line': 'scanLine 2s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pop-in': 'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'fab-open': 'fabOpen 0.2s ease-out forwards',
      },
      keyframes: {
        scanLine: {
          '0%, 100%': { transform: 'translateY(0%)', opacity: '1' },
          '50%': { transform: 'translateY(180px)', opacity: '0.7' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          from: { transform: 'translateY(-20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        popIn: {
          from: { transform: 'scale(0.8)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        fabOpen: {
          from: { transform: 'scale(0) translateY(10px)', opacity: '0' },
          to: { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'glow-brand': '0 0 20px rgba(255, 107, 43, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(30,42,66,0.8)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,107,43,0.2)',
      },
    },
  },
  plugins: [],
}

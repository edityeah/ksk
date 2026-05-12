/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
      },
      colors: {
        // NSDC + Skill India palette
        primary:  { 50: '#E6F2F7', 100: '#CCE5EF', 500: '#0E5B7A', 600: '#0A4A66', 700: '#073B53', light: '#EAF4F8' },
        saffron:  { 500: '#FF9933' },
        green:    { 500: '#138808' },
        ksk:      { navy: '#0A2540', accent: '#0E5B7A', wash: '#F5F8FB' },
        txt:      { primary: '#0F172A', secondary: '#475569', tertiary: '#94A3B8' },
        ok:       { DEFAULT: '#16A34A', light: '#DCFCE7' },
        warn:     { DEFAULT: '#D97706', light: '#FEF3C7' },
        danger:   { DEFAULT: '#DC2626', light: '#FEE2E2' },
        flag:     { DEFAULT: '#7C3AED', light: '#EDE9FE' },
      },
      borderRadius: { pill: '999px', card: '14px' },
      boxShadow: {
        card:   '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        modal:  '0 10px 30px rgba(15, 23, 42, 0.15)',
        canvas: '-8px 0 30px rgba(15, 23, 42, 0.10)',
      },
      keyframes: {
        'slide-in':    { '0%': { transform: 'translateY(8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        'fade-in':     { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'bubble-in':   { '0%': { transform: 'translateY(4px) scale(0.98)', opacity: 0 }, '100%': { transform: 'translateY(0) scale(1)', opacity: 1 } },
        'canvas-slide':{ '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        'typing':      { '0%, 60%, 100%': { opacity: 0.3 }, '30%': { opacity: 1 } },
        'pulse-ring':  { '0%': { transform: 'scale(0.95)', opacity: 0.7 }, '100%': { transform: 'scale(1.6)', opacity: 0 } },
      },
      animation: {
        'slide-in': 'slide-in 240ms ease-out',
        'fade-in':  'fade-in 200ms ease-out',
        'bubble-in':'bubble-in 200ms ease-out',
        'canvas-slide':'canvas-slide 300ms ease-out',
        'typing':   'typing 1.2s infinite',
        'pulse-ring':'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
}

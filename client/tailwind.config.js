/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Quicksand', 'Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        primer: {
          50: '#eef2ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4361ee',
          700: '#3a56d4',
          800: '#2e44b8',
          900: '#253a9e',
          950: '#1a2d7a',
        },
        dark: {
          50: '#f8f8fc',
          100: '#f0f0f8',
          200: '#d8d8ee',
          300: '#b0b0cc',
          400: '#8888aa',
          500: '#666688',
          600: '#444466',
          700: '#2a2a44',
          800: '#1a1a2e',
          900: '#0d0d14',
          950: '#0a0a0f',
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(92, 124, 250, 0.35)',
        'glow-lg': '0 0 40px rgba(92, 124, 250, 0.45)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.35)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.glass': {
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
        },
        '.glass-card': {
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '0.75rem',
          boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        },
        '.glass-dark': {
          background: 'rgba(13,13,20,0.8)',
          backdropFilter: 'blur(16px)',
          '-webkit-backdrop-filter': 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      });
    },
  ],
};

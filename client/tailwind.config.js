/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
      },
    },
  },
  plugins: [],
};

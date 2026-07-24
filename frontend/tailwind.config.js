/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#e8fbfb',
          100: '#c8f3f2',
          200: '#96e6e4',
          300: '#5ed2cf',
          400: '#22b8b5',
          500: '#00a3a1',
          600: '#008987',
          700: '#006f70',
          800: '#075a5c',
          900: '#0b484a',
        },
        navy: {
          50: '#eef4ff',
          100: '#d8e7ff',
          500: '#173b74',
          700: '#112e5e',
          900: '#0a244d',
        },
        accent: {
          500: '#f28c13',
          600: '#df7b08',
        },
      },
    },
  },
  plugins: [],
}

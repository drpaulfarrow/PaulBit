/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          DEFAULT: '#2abbb0',
          light: '#3dd4c8',
          dark: '#229e94',
          hover: 'rgba(42, 187, 176, 0.8)',
        },
        // Accent colors
        accent: {
          blue: '#587eba',
          'blue-hover': 'rgba(88, 126, 186, 0.8)',
          orange: '#f77402',
        },
        // Neutral palette
        neutral: {
          50: '#f9f8f7',
          100: '#f4f2f2',
          200: '#e9e9e9',
          300: '#d3d1d1',
          400: '#c5c5c5',
          500: '#bababa',
          600: '#999999',
          700: '#333333',
          800: '#211f1f',
          900: '#111111',
        },
        // Semantic colors
        success: '#49b27b',
        warning: '#e5de7d',
        'warning-bg': '#fffccd',
        error: {
          DEFAULT: '#ed1c24',
          bg: '#fef3f4',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 0 10px rgba(0, 0, 0, 0.2)',
        'card-light': '0 1px 5px rgba(33, 31, 31, 0.3)',
        'input': '0 0 5px rgba(0, 0, 0, 0.2)',
        'input-light': '0 0 3px rgba(185, 185, 185, 0.1)',
      },
      borderRadius: {
        DEFAULT: '4px',
        card: '5px',
      },
    },
  },
  plugins: [],
}

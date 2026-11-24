/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      colors: {
        ink: '#24352c',
        leaf: '#456d50',
        paper: '#f5f4ed',
      },
      boxShadow: {
        card: '0 12px 40px rgba(34, 54, 41, 0.06)',
      },
    },
  },
  plugins: [],
};

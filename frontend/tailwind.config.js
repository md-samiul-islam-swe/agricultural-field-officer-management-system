/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { soil: '#3b2f22', paper: '#f6f3e8', leaf: '#2f6b3a' },
    fontFamily: { serif: ['Georgia', 'Times New Roman', 'serif'] } } },
  plugins: [] };

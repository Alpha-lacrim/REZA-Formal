/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './index.tsx', './App.tsx', './components/**/*.{ts,tsx}', './contexts/**/*.{ts,tsx}', './pages/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'lux-gold': '#C5A059',
        'lux-gold-light': '#E5C585',
        'lux-gold-dark': '#A07F3D',
        'lux-black': '#1C1917',
        'lux-gray': '#F2F2F0',
        'lux-body': '#FAFAF9',
      },
      fontFamily: {
        logo: ['Playfair Display', 'Georgia', 'serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
      },
      backgroundImage: {
        'hero-pattern': "url('/images/utilities/hero.jpg')",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts}'],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#1F479A',
        'brand-red': '#D9232E',
        ceak: {
          blue: { DEFAULT: '#1F479A', dark: '#143373', light: '#2d5ec7', soft: '#edf3fc' },
          red: { DEFAULT: '#D9232E', dark: '#b01620', soft: '#fdf1f2' },
        },
      },
      fontFamily: { sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'] },
      keyframes: { fadeIn: { from: { opacity: 0, transform: 'translateX(12px)' }, to: { opacity: 1, transform: 'none' } }, pop: { '0%': { transform: 'scale(.85)', opacity: 0.4 }, '60%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: 1 } } },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Identité Chicly (maquette « pro ») : fond crème, encre chaude, UNE couleur d'accent bordeaux.
      // Les anciennes classes blue-/purple-/pink-/indigo-/violet- pointent vers ce bordeaux
      // (toute l'app suit sans réécrire chaque écran), les gris deviennent des gris chauds.
      colors: (() => {
        const vin = {
          50: '#FBF3F5', 100: '#F6E4E9', 200: '#ECC7D1', 300: '#DDA0B0', 400: '#C8728A',
          500: '#B4566F', 600: '#A3445A', 700: '#8A3349', 800: '#72283C', 900: '#5C2132', 950: '#36111C',
        };
        const gris = {
          50: '#FAF7F3', 100: '#F3EEE8', 200: '#EAE2DA', 300: '#D9CFC6', 400: '#ABA097', 500: '#81776F',
          600: '#655C55', 700: '#4A433E', 800: '#2B2623', 900: '#1F1A17', 950: '#141110',
        };
        return {
          vin, blue: vin, purple: vin, pink: vin, indigo: vin, violet: vin, fuchsia: vin,
          gray: gris, slate: gris,
          creme: '#F9F6F2',
          encre: '#1F1A17',
          ligne: '#EAE2DA',
          sable: '#EFE7DF',
        };
      })(),
      animation: {
        'in': 'in 0.2s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 8s ease-in-out infinite',
      },
      keyframes: {
        'in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-16px) scale(1.04)' },
        },
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 16px -2px rgba(16, 24, 40, 0.06)',
        'soft-md': '0 2px 4px rgba(16, 24, 40, 0.04), 0 8px 24px -4px rgba(16, 24, 40, 0.08)',
        'soft-lg': '0 2px 4px rgba(16, 24, 40, 0.05), 0 16px 40px -8px rgba(16, 24, 40, 0.12)',
        'glow': 'none',
        'glow-purple': 'none',
        'brand': '0 4px 14px -2px rgba(79, 70, 229, 0.35)',
        'brand-lg': '0 8px 24px -4px rgba(79, 70, 229, 0.40)',
      },
    },
  },
  plugins: [],
};

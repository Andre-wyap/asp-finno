import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#002356',
        secondary: '#006398',
        tertiary: '#002935',
        background: '#f7f9fb',
        surface: '#f7f9fb',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f4f6',
        'surface-container': '#eceef0',
        'surface-container-high': '#e6e8ea',
        'surface-container-highest': '#e0e3e5',
        'on-primary': '#ffffff',
        'on-primary-container': '#80a4f4',
        'on-secondary-container': '#004971',
        'secondary-container': '#65bafd',
        'on-surface': '#191c1e',
        'on-surface-variant': '#43474e',
        'outline-variant': '#c3c6d3',
        'primary-fixed': '#d9e2ff'
      },
      fontFamily: {
        display: ['var(--font-display)', 'Plus Jakarta Sans', 'Inter', 'Arial', 'sans-serif'],
        sans: ['var(--font-sans)', 'Manrope', 'Inter', 'Arial', 'sans-serif']
      },
      boxShadow: {
        ambient: '0 20px 40px rgba(25, 28, 30, 0.06)'
      }
    }
  },
  plugins: []
};

export default config;

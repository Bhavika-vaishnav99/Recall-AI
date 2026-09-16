import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        notebook: {
          bg: '#131518',
          card: '#1e2026',
          hover: '#262931',
          border: '#2e323e',
          active: '#363a48',
          primary: '#6366f1',
          accent: '#8b5cf6',
          text: '#e2e8f0',
          muted: '#8e96a4',
          subtle: '#5c6474',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

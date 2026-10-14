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
          bg: 'var(--notebook-bg)',
          card: 'var(--notebook-card)',
          hover: 'var(--notebook-hover)',
          border: 'var(--notebook-border)',
          active: 'var(--notebook-active)',
          primary: 'var(--accent-blue)',
          accent: 'var(--accent-blue-dim)',
          text: 'var(--notebook-text)',
          muted: 'var(--notebook-muted)',
          subtle: 'var(--notebook-subtle)',
          surface: 'var(--accent-surface)',
          green: 'var(--accent-green)',
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

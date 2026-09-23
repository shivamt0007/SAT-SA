/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mint: {
          page: '#E3F5F7',
          pageAlt: '#C9EBEF',
          surface: '#F3FBFC',
          card: '#FFFFFF',
          border: '#B7E0E5',
          sidebar: '#DFF6F8',
          active: '#CFEEF3',
          activeText: '#0B6B7A',
          text: '#2E5A61',
          secondary: '#5B8F97',
          primaryText: '#173C41',
          secondaryText: '#3F6E75',
          accent: '#0E8FA6',
          accentDeep: '#0A6B7C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- SAT-SA mint + teal surface system (light) ----
        // App canvas (outer page background)
        canvas: '#E7F3EE',
        // Standard content surface (main areas)
        surface: '#DDEEE7',
        // Elevated surface (cards / panels)
        paper: '#FFFFFF',
        // Hairline + structural borders
        line: '#C9DDD5',
        // Primary text
        ink: '#203732',
        // Secondary / muted text
        faint: '#63766F',

        // ---- Mint ramp (soft environmental tints, backgrounds) ----
        mint: {
          50: '#F2F9F6',
          100: '#E5F3ED',
          200: '#CFE8DE',
          300: '#B4DACA',
          400: '#93C7B2',
          500: '#6FAE97',
          600: '#579A82',
          700: '#477E6B',
          800: '#3A6656',
          900: '#2F5245',
        },

        // ---- Brand accent: primary teal ----
        brand: {
          50: '#ECF5F2',
          100: '#D9EBE5',
          200: '#B5D7CD',
          300: '#8EC0B2',
          400: '#5EA48F',
          500: '#3E7D6B',
          600: '#36705F',
          700: '#2D5D4F',
          800: '#264C41',
          900: '#1F3D35',
        },

        // Alias: teal == brand (secondary teal #6A9F8D lives at 400/500 range)
        teal: {
          50: '#ECF5F2',
          100: '#D9EBE5',
          200: '#B5D7CD',
          300: '#8EC0B2',
          400: '#6A9F8D',
          500: '#3E7D6B',
          600: '#36705F',
          700: '#2D5D4F',
          800: '#264C41',
          900: '#1F3D35',
        },

        // Standard light neutral ramp
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },

        // Info / technical identifiers — muted steel blue (#557C91)
        blue: {
          50: '#EDF3F6',
          100: '#DCE7ED',
          200: '#BAD0DA',
          300: '#97B6C5',
          400: '#739AAC',
          500: '#5F889C',
          600: '#557C91',
          700: '#47667A',
          800: '#3A5465',
          900: '#2F4451',
        },

        // Success — leaf green (#4D8A68)
        emerald: {
          50: '#EEF6F1',
          100: '#DDEDE3',
          200: '#BCDAC7',
          300: '#96C2A8',
          400: '#6BA687',
          500: '#539472',
          600: '#4D8A68',
          700: '#3F7154',
          800: '#345C45',
          900: '#2A4B38',
        },

        // Warning — muted brass (#B88A43)
        orange: {
          50: '#FBF5EC',
          100: '#F7EAD5',
          200: '#EFD5AC',
          300: '#E3BC80',
          400: '#D29F58',
          500: '#C08A43',
          600: '#B88040',
          700: '#9A6733',
          800: '#7D5329',
          900: '#654220',
        },

        // Medium / attention — soft gold
        amber: {
          50: '#FBF6EC',
          100: '#F7ECD3',
          200: '#EEDAA8',
          300: '#E2C479',
          400: '#CFA854',
          500: '#BB9140',
          600: '#B88A43',
          700: '#996F31',
          800: '#7C5A28',
          900: '#654922',
        },

        // Critical — muted brick red (#B65D5D), reserved for true critical severity
        red: {
          50: '#FBF1F1',
          100: '#F7E2E2',
          200: '#EFC6C6',
          300: '#E3A2A2',
          400: '#CE7D7D',
          500: '#C26B6B',
          600: '#B65D5D',
          700: '#9B4848',
          800: '#7F3C3C',
          900: '#663232',
        },

        // Muted rose (escalation / stage variance emphasis)
        rose: {
          50: '#FCF2F4',
          100: '#F9E3E8',
          200: '#F2C6D1',
          300: '#E6A3B4',
          400: '#D17F97',
          500: '#B85E7C',
          600: '#A0506B',
          700: '#874259',
          800: '#6F384B',
          900: '#5A2F3E',
        },

        // Muted indigo / violet (acknowledged status / negative space)
        purple: {
          50: '#F2EFF6',
          100: '#E4DFED',
          200: '#C9C0DC',
          300: '#AB9EC8',
          400: '#8D7DB3',
          500: '#74649E',
          600: '#645589',
          700: '#524671',
          800: '#433A5C',
          900: '#36304A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Cascadia Code"', 'Consolas', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(32, 55, 50, 0.04), 0 1px 3px rgba(32, 55, 50, 0.06)',
        'card-hover': '0 2px 6px rgba(32, 55, 50, 0.08), 0 4px 14px rgba(32, 55, 50, 0.07)',
      },
    },
  },
  plugins: [],
}

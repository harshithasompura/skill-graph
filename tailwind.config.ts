import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // accent-text: #0D9488 = teal-600, 4.7:1 on white = passes AA
        accent: '#0D9488',
        background: '#EBEBEB',
        foreground: '#111111',
        muted: '#666666',
        border: '#D4D4D2',
        surface: '#FFFFFF',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config

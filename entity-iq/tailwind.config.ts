import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    borderRadius: {
      none: '0px',
      sm: '4px',
      DEFAULT: '6px',
      md: '6px',
      lg: '8px',
      full: '9999px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        base: 'var(--canvas-bg)',
        surface: 'var(--bg-surface)',
        'surface-hover': 'var(--sidebar-item-hover-bg)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'canvas-bg': 'var(--canvas-bg)',
        'page-title': 'var(--page-title)',
        'page-subtitle': 'var(--page-subtitle)',
        sidebar: {
          bg: 'var(--sidebar-bg)',
          wordmark: 'var(--sidebar-wordmark)',
          label: 'var(--sidebar-label)',
          text: 'var(--sidebar-item-text)',
          'hover-text': 'var(--sidebar-item-hover-text)',
          'hover-bg': 'var(--sidebar-item-hover-bg)',
          'active-text': 'var(--sidebar-item-active-text)',
          'active-bg': 'var(--sidebar-item-active-bg)',
          'active-border': 'var(--sidebar-item-active-border)',
          version: 'var(--sidebar-version)',
          toggle: 'var(--sidebar-toggle-text)',
          'toggle-hover': 'var(--sidebar-toggle-hover-text)',
          'toggle-bg': 'var(--sidebar-toggle-hover-bg)',
        },
        accent: {
          DEFAULT: '#E4573D',
          hover: '#cf4930',
          subtle: 'rgba(228, 87, 61, 0.08)',
        },
        success: {
          DEFAULT: '#166534',
          bg: '#f0fdf4',
          border: '#bbf7d0',
        },
        // shadcn compatibility
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: '#E4573D',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        destructive: {
          DEFAULT: '#dc2626',
          foreground: '#FFFFFF',
        },
        input: 'var(--input)',
        ring: '#E4573D',
      },
    },
  },
  plugins: [],
} satisfies Config

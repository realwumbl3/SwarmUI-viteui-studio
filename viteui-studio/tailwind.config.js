/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'studio-bg': '#0f0f0f',
        'studio-panel': '#1a1a1a',
        'studio-accent': '#3b82f6',
        'studio-text': '#e5e7eb',
        'studio-border': '#374151'
      }
    },
  },
  plugins: [],
}
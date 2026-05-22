/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          cyan: '#00d4ff',
          blue: '#0077ff',
          bg: '#020b18',
          surface: 'rgba(6, 21, 37, 0.65)',
          surface2: 'rgba(10, 32, 53, 0.75)',
          text: '#e0f4ff',
          muted: '#4a7fa0',
          green: '#00ff88',
          red: '#ff4466',
          yellow: '#ffcc00',
        }
      },
      boxShadow: {
        'cyan-glow': '0 0 15px rgba(0, 212, 255, 0.4)',
        'green-glow': '0 0 15px rgba(0, 255, 136, 0.4)',
      }
    },
  },
  plugins: [],
}

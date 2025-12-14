/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slot: {
          primary: '#1a1a2e',
          secondary: '#16213e', 
          accent: '#e94560',
          gold: '#ffd700',
          silver: '#c0c0c0',
          bronze: '#cd7f32'
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'spin-fast': 'spin 0.5s linear infinite',
        'pulse-glow': 'pulse 2s ease-in-out infinite alternate',
        'celebration': 'bounce 1s ease-in-out 3',
        'reel-flicker': 'flicker 0.1s linear infinite'
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        }
      },
      fontFamily: {
        'slot': ['Orbitron', 'monospace'],
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
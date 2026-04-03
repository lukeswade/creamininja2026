/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "Apple Color Emoji", "Segoe UI Emoji"]
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.8', transform: 'scale(1.05)', filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.5))' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite linear',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.2)',
        'glass-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.4)',
        'glass-inset': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.1), 0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      }
    }
  },
  plugins: []
};

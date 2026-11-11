/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./go7 figma/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'poppins': ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        'primary': '#E53935',
        'primary-dark': '#D32F2F',
        'primary-light': '#FFCDD2',
        'go7-red': '#e30613',
        'input-border': '#ddd',
        'input-text': '#222',
      },
      animation: {
        'float': 'bounce 2s infinite',
        'float-slow': 'bounce 3s infinite',
        'scooter-in': 'scooterIn 1s ease-out forwards',
        'fadeIn': 'fadeIn 0.3s ease-in-out forwards',
        'idle-bounce': 'idleBounce 4s ease-in-out infinite',
        'map-fade': 'fadeIn 1.5s ease-out forwards',
        'pulse': 'pulse 2s infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        bounce: {
          '0%, 100%': { 
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
          },
          '50%': { 
            transform: 'translateY(-25px)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
          },
        },
        scooterIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        idleBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      opacity: {
        '10': '0.1',
        '15': '0.15',
      },
      boxShadow: {
        'form': '0 4px 16px rgba(0, 0, 0, 0.1)',
        'form-hover': '0 8px 24px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}

// tailwind.config.js
module.exports = {
    theme: {
      extend: {
        keyframes: {
          roll: {
            '0%': { transform: 'translateY(-0.5rem)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
        },
        animation: {
          roll: 'roll 0.3s ease-out',
        },
      },
    },
  };  
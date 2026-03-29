/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/pages/**/*.{ts,tsx}", "./src/lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f8ff",
          500: "#0077b6",
          700: "#005f91"
        }
      }
    }
  },
  plugins: []
};


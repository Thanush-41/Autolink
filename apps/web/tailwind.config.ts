import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1C2C",
        coral: "#FF6A4D",
        mint: "#5ED3B4",
        sand: "#FFF4E9"
      }
    }
  },
  plugins: []
};

export default config;

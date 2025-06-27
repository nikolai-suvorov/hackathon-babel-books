import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'dream-blue': '#3A7DFF',
        'storybook-violet': '#A070FF',
        'soft-white': '#FDFDFF',
        'sunshine-yellow': '#FFE066',
        'mint-green': '#90F1B0',
        'coral-pink': '#FF8B94',
      },
      fontFamily: {
        'display': ['Fredoka', 'sans-serif'],
        'body': ['Nunito Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
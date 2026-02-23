/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 현재 폴더(devsign) 기준이므로 이게 정답입니다!
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#4F46E5", foreground: "#FFFFFF" },
      },
    },
  },
  plugins: [],
}
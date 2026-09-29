/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 현재 폴더(devsign) 기준이므로 이게 정답입니다!
  ],
  theme: {
    // ✨ 핵심 수정: extend 밖으로 빼내서 테일윈드의 기본 폰트를 '프리텐다드'로 완전히 갈아엎습니다!
    fontFamily: {
      sans: [
        '"Pretendard"',
        "-apple-system",
        "BlinkMacSystemFont",
        "system-ui",
        "Roboto",
        '"Helvetica Neue"',
        '"Segoe UI"',
        '"Apple SD Gothic Neo"',
        '"Noto Sans KR"',
        '"Malgun Gothic"',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
        "sans-serif",
      ],
    },
    extend: {
      colors: {
        primary: { DEFAULT: "#0071e3", foreground: "#FFFFFF" },
        indigo: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#b9dcff",
          300: "#8bc5ff",
          400: "#52a7ff",
          500: "#1686f3",
          600: "#0071e3",
          700: "#0062c4",
          800: "#07529f",
          900: "#0b467f",
          950: "#082c53",
        },
        slate: {
          50: "#f5f5f7",
          100: "#e8e8ed",
          200: "#d2d2d7",
          300: "#b7b7bd",
          400: "#86868b",
          500: "#6e6e73",
          600: "#515154",
          700: "#3a3a3c",
          800: "#242426",
          900: "#1d1d1f",
          950: "#0b0b0c",
        },
      },
      boxShadow: {
        'apple-sm': '0 1px 2px rgb(0 0 0 / 0.03), 0 8px 24px rgb(0 0 0 / 0.05)',
        'apple': '0 2px 4px rgb(0 0 0 / 0.03), 0 18px 50px rgb(0 0 0 / 0.08)',
        'apple-lg': '0 30px 80px rgb(0 0 0 / 0.12)',
      },
    },
  },
  plugins: [],
}

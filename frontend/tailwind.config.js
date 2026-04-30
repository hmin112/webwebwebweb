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
        primary: { DEFAULT: "#4F46E5", foreground: "#FFFFFF" },
      },
    },
  },
  plugins: [],
}
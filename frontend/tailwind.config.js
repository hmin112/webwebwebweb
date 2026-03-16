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
      // ✨ 모든 기기에서 애플의 정갈한 서체 느낌을 주는 폰트 스택 설정
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "Malgun Gothic",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
}
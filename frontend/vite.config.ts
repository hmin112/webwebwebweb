import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'devsign.co.kr',  // 직접 도메인 지정
      '.devsign.co.kr'  // 서브도메인 포함 허용
    ],
    // 또는 아예 모든 호스트를 허용하려면:
    // allowedHosts: true, 
    host: true, // 도커 내부에서 외부로 포트를 개방하기 위해 필수
    port: 5173  // 현재 사용 중인 포트 번호 확인
  }
})
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css' // ⭐ 이 줄이 없으면 절대 안 나옵니다!
import { preventStrayFileDrops } from './components/ui/FileDropZone'

// 업로드 칸 밖에 파일을 떨어뜨려도 브라우저가 파일을 열어 작성 중인 내용이 날아가지 않게
preventStrayFileDrops()

// ✨ [2026-09-30] 평소 스크롤바 폭을 CSS 변수(--sbw)로 기억 — 팝업이 열려 스크롤을 잠그는 동안 사라진 스크롤바 자리를
// 이 값만큼 채워서 화면이 좌우로 흔들리지 않게 한다 (index.css). 잠겨 있는 동안에는 재지 않는다.
const syncScrollbarWidth = () => {
  const html = document.documentElement
  if (getComputedStyle(html).overflowY !== 'scroll') return
  html.style.setProperty('--sbw', `${window.innerWidth - html.clientWidth}px`)
}
syncScrollbarWidth()
window.addEventListener('resize', syncScrollbarWidth)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
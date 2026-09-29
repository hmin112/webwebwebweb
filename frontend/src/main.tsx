import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css' // ⭐ 이 줄이 없으면 절대 안 나옵니다!
import { preventStrayFileDrops } from './components/ui/FileDropZone'

// 업로드 칸 밖에 파일을 떨어뜨려도 브라우저가 파일을 열어 작성 중인 내용이 날아가지 않게
preventStrayFileDrops()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
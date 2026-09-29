import axios from "axios";

export const api = axios.create({
    // 배포 환경에서 Caddy가 /api 경로를 인식하여 백엔드로 전달할 수 있도록 수정되었습니다.
    baseURL: "/api",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => {
        // 계정 정지 데이터가 응답 바디에 있을 경우 처리
        if (response.data && response.data.status === "suspended") {
            const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
            if (isLoggedIn) {
                alert("관리자에 의해 계정이 정지되었습니다. 즉시 로그아웃됩니다.");
                localStorage.clear();
                window.location.href = "/";
            }
        }
        return response;
    },
    (error) => {
        if (error.response) {
            // 1. 기존: 계정이 정지된 경우에만 전역 처리 (유지)
            if (error.response.data?.status === "suspended") {
                const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
                if (isLoggedIn) {
                    alert("관리자에 의해 정지된 계정입니다. 다시 로그인해주세요.");
                    localStorage.clear();
                    window.location.href = "/login";
                }
            }
            // ✨ 2. 수정: 매번 F12로 개발자 도구에서 지우는 귀찮음을 해결하는 401/403 자동 청소!
            // 로그아웃 요청 자체의 인증 실패(이미 만료된 토큰 등)는 조용히 넘긴다 — 로그아웃 흐름이 알아서 메인으로 보낸다
            else if ((error.response.status === 401 || error.response.status === 403) && !String(error.config?.url || "").startsWith("/members/logout")) {
                // ✨ 핵심 수정: 브라우저에 토큰(token)이 있는 사람만 알림을 띄우고 쫓아냅니다!
                // 애초에 로그인을 안 한 손님(token이 null)은 알림 없이 조용히 에러만 넘깁니다.
                const token = localStorage.getItem("token");
                if (token) {
                    alert("인증이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요. 🔄");
                    localStorage.clear(); 
                    window.location.href = "/login";
                }
            }
        }
        return Promise.reject(error);
    }
);
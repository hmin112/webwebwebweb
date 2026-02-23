import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL + "/api",
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
        // 백엔드가 401/403을 반환할 수 있으나, 전역에서 강제 로그아웃 시키지 않고 
        // 개별 컴포넌트에서 에러를 확인하여 얼럿을 띄울 수 있게 넘깁니다.
        // 계정이 정지된 경우에만 전역 처리.
        if (error.response && error.response.data?.status === "suspended") {
            const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
            if (isLoggedIn) {
                alert("관리자에 의해 정지된 계정입니다. 다시 로그인해주세요.");
                localStorage.clear();
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

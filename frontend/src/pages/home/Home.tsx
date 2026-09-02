import { Hero } from "./components/Hero";
import { ChosunPrograms } from "./components/ChosunPrograms";
import { HallOfFame } from "./components/HallOfFame";
import { Events } from "./components/Events";
import { Notice } from "./components/Notice";
import { Board } from "./components/Board";
import { About } from "./components/About";
import { FAQ } from "./components/FAQ";
import { useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";

interface HomeProps {
    isAdmin: boolean;
    isLoggedIn: boolean;
    events: any[];
    notices: any[];
    posts: any[];
    hallOfFame: any[];
    chosunPrograms: any[];
    onNavigate: (path: string, id?: any) => void;
}

export function Home({ isAdmin, isLoggedIn, events, notices, posts, hallOfFame, chosunPrograms, onNavigate }: HomeProps) {
    const location = useLocation();

    // 해시(#) 값을 감지해서 해당 섹션으로 부드럽게 스크롤
    useEffect(() => {
        if (location.hash) {
            const targetId = location.hash.replace("#", "");
            const element = document.getElementById(targetId);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: "smooth" });
                }, 100);
            }
        }
    }, [location]);

    const homeDisplayPosts = useMemo(() => {
        const feePost = posts.find((p) => p.category === "회비");
        const otherPosts = posts.filter((p) => p.category !== "회비").slice(0, 2);
        const result = [];
        if (feePost) result.push(feePost);
        result.push(...otherPosts);
        return result;
    }, [posts]);

    // ✨ 최근 행사(ID 기준 내림차순) 정렬 후 3개 추출 로직 추가
    const recentEvents = useMemo(() => {
        return [...events].sort((a, b) => b.id - a.id).slice(0, 3);
    }, [events]);

    // ✨ 명예의 전당: 최신 등록 순(ID 내림차순, 가장 왼쪽이 최신) 4개 추출
    const recentHallOfFame = useMemo(() => {
        return [...hallOfFame].sort((a, b) => b.id - a.id).slice(0, 4);
    }, [hallOfFame]);

    return (
        <>
            <div id="home">
                <Hero isAdmin={isAdmin} />
            </div>
            <ChosunPrograms programs={chosunPrograms} />
            <div id="halloffame" className="scroll-mt-20">
                <HallOfFame onNavigate={onNavigate} entries={recentHallOfFame} />
            </div>
            <div id="events" className="scroll-mt-20">
                {/* ✨ events.slice(0, 3) 대신 최신순으로 정렬된 recentEvents를 사용 */}
                <Events onNavigate={onNavigate} events={recentEvents} />
            </div>
            <div id="notice" className="scroll-mt-20">
                <Notice onNavigate={onNavigate} notices={notices} />
            </div>
            {/* 게시판에도 id와 scroll-mt-20 속성을 추가했습니다 */}
            <div id="board" className="scroll-mt-20">
                <Board onNavigate={onNavigate} posts={homeDisplayPosts} />
            </div>
            <div id="about" className="scroll-mt-20">
                <About />
            </div>
            <div id="faq" className="scroll-mt-20">
                <FAQ />
            </div>
        </>
    );
}
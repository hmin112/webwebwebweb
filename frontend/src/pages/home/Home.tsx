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

    // 명예의 전당 정렬: "게시 순서(id)"가 아니라 게시글 내부 대회 날짜(자유 텍스트, 범위 표기 가능) 기준 최신순.
    // 날짜 패턴을 찾지 못하면 맨 뒤로 보내고, 그 안에서는 id 내림차순으로 대체한다.
    const parseHallOfFameDate = (dateStr?: string): number => {
        if (!dateStr) return -Infinity;
        const matches = dateStr.match(/\d{4}\s*[.\-/]\s*\d{1,2}\s*[.\-/]\s*\d{1,2}/g);
        if (!matches) return -Infinity;
        const timestamps = matches
            .map((m) => {
                const [y, mo, d] = m.split(/[.\-/]/).map((p) => parseInt(p.trim(), 10));
                return new Date(y, mo - 1, d).getTime();
            })
            .filter((t) => !Number.isNaN(t));
        return timestamps.length > 0 ? Math.max(...timestamps) : -Infinity;
    };

    const sortedHallOfFame = useMemo(() => {
        return [...hallOfFame].sort((a, b) => {
            const diff = parseHallOfFameDate(b.date) - parseHallOfFameDate(a.date);
            return diff !== 0 ? diff : b.id - a.id;
        });
    }, [hallOfFame]);

    // ✨ 명예의 전당: 대회 날짜 기준 최신 4개 추출 (가장 왼쪽이 최신)
    const recentHallOfFame = useMemo(() => sortedHallOfFame.slice(0, 4), [sortedHallOfFame]);

    return (
        <>
            <div id="home">
                <Hero isAdmin={isAdmin} hallOfFame={sortedHallOfFame} onNavigate={onNavigate} />
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
                <Board onNavigate={onNavigate} posts={homeDisplayPosts} isLoggedIn={isLoggedIn} />
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
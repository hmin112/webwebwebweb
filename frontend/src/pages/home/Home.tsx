import { Hero } from "./components/Hero";
import { Events } from "./components/Events";
import { Notice } from "./components/Notice";
import { Board } from "./components/Board";
import { About } from "./components/About";
import { FAQ } from "./components/FAQ";
import { useMemo } from "react";

interface HomeProps {
    isAdmin: boolean;
    isLoggedIn: boolean;
    events: any[];
    notices: any[];
    posts: any[];
    onNavigate: (path: string, id?: any) => void;
}

export function Home({ isAdmin, isLoggedIn, events, notices, posts, onNavigate }: HomeProps) {
    const homeDisplayPosts = useMemo(() => {
        const feePost = posts.find((p) => p.category === "회비");
        const otherPosts = posts.filter((p) => p.category !== "회비").slice(0, 2);
        const result = [];
        if (feePost) result.push(feePost);
        result.push(...otherPosts);
        return result;
    }, [posts]);

    return (
        <>
            <div id="home">
                <Hero isAdmin={isAdmin} />
            </div>
            <div id="events" className="scroll-mt-20">
                <Events onNavigate={onNavigate} events={events.slice(0, 3)} />
            </div>
            <div id="notice" className="scroll-mt-20">
                <Notice onNavigate={onNavigate} notices={notices} />
            </div>
            <Board onNavigate={onNavigate} posts={homeDisplayPosts} />
            <div id="about" className="scroll-mt-20">
                <About />
            </div>
            <div id="faq" className="scroll-mt-20">
                <FAQ />
            </div>
        </>
    );
}
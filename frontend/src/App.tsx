import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom";
import { api } from "./api/axios";

// Layout
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";

// Pages
import { Home } from "./pages/home/Home";
import { Login } from "./pages/auth/Login";
import { Signup } from "./pages/auth/Signup";
import { FindAccount } from "./pages/auth/FindAccount";
import { SignupSuccess } from "./pages/auth/SignupSuccess";
import { ProfilePage } from "./pages/profile/ProfilePage";

import { NoticePage } from "./pages/notice/NoticePage";
import { NoticeDetail } from "./pages/notice/NoticeDetail";
import { NoticeWrite } from "./pages/notice/NoticeWrite";

import { EventPage } from "./pages/event/EventPage";
import { EventDetail } from "./pages/event/EventDetail";
import { EventWrite } from "./pages/event/EventWrite";

import { BoardPage } from "./pages/board/BoardPage";
import { BoardWrite } from "./pages/board/BoardWrite";
import { BoardDetail } from "./pages/board/BoardDetail";

import { AssemblyPage } from "./pages/assembly/AssemblyPage";
import { AdminPage } from "./pages/admin/AdminPage";
import { ContactAdmin } from "./pages/admin/ContactAdmin";
import { MemberDetailTab } from "./pages/profile/tabs/MemberDetailTab";

function AppContent() {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("isLoggedIn") === "true");
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem("isAdmin") === "true");
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const savedUser = localStorage.getItem("currentUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [userStatus, setUserStatus] = useState("ATTENDING");

  const [posts, setPosts] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const handleLogout = async (isForced: boolean = false) => {
    if (!isForced && !window.confirm("로그아웃 하시겠습니까?")) return;
    try {
      if (currentUser && currentUser.name) {
        await api.post("/members/logout-log", {
          name: currentUser.name,
          studentId: currentUser.studentId
        });
      }
    } catch (e) {
      console.error("로그아웃 로그 전송 실패", e);
    }
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCurrentUser(null);
    localStorage.clear();
    if (isForced) {
      window.location.href = "/";
    } else {
      navigate("/");
    }
  };

  const fetchData = async () => {
    try {
      const [postsRes, noticesRes, eventsRes] = await Promise.all([
        api.get('/posts'),
        api.get('/notices'),
        api.get('/events')
      ]);
      if (postsRes.data) setPosts(postsRes.data);
      if (noticesRes.data) setNotices(noticesRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
    } catch (error) {
      console.error("데이터 로드 에러", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const id = location.hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  useEffect(() => {
    localStorage.setItem("isLoggedIn", isLoggedIn.toString());
    localStorage.setItem("isAdmin", isAdmin.toString());
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [isLoggedIn, isAdmin, currentUser]);

  // Board Handlers (Consider moving these to Board specific context/hooks in the future)
  const handleToggleLike = async (postId: number) => {
    if (!isLoggedIn) { alert("로그인이 필요한 서비스입니다."); return; }
    try {
      const response = await api.post(`/posts/${postId}/like`);
      setPosts(prev => prev.map(p => p.id === postId ? response.data : p));
    } catch (e) { console.error("좋아요 처리 실패", e); }
  };

  const handleAddComment = async (postId: number, content: string) => {
    if (!isLoggedIn) { alert("로그인이 필요합니다."); return; }
    try {
      const response = await api.post(`/posts/${postId}/comments`, { content });
      setPosts(prev => prev.map(p => p.id === postId ? response.data : p));
    } catch (e) { console.error("댓글 등록 실패", e); }
  };

  const handleAddReply = async (postId: number, commentId: number, content: string) => {
    if (!isLoggedIn) { alert("로그인이 필요합니다."); return; }
    try {
      const response = await api.post(`/posts/${postId}/comments`, { content, parentId: commentId });
      setPosts(prev => prev.map(p => p.id === postId ? response.data : p));
    } catch (e) { console.error("답글 등록 실패", e); }
  };

  const handleToggleCommentLike = async (postId: number, commentId: number) => {
    if (!isLoggedIn) { alert("로그인이 필요합니다."); return; }
    try {
      const response = await api.post(`/posts/${postId}/comments/${commentId}/like`);
      setPosts(prev => prev.map(p => p.id === postId ? response.data : p));
    } catch (e) { console.error("댓글 좋아요 실패", e); }
  };

  const handleDeleteComment = async (postId: number, commentId: number) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      const response = await api.delete(`/posts/${postId}/comments/${commentId}`);
      setPosts(prev => prev.map(p => p.id === postId ? response.data : p));
    } catch (e) { console.error("댓글 삭제 실패", e); }
  };

  const handleDeletePost = async (id: number) => {
    if (window.confirm("이 게시물을 정말로 삭제하시겠습니까?")) {
      try {
        await api.delete(`/posts/${id}`);
        setPosts(prev => prev.filter(p => p.id !== id));
        alert("게시물이 삭제되었습니다.");
        navigate("/board");
      } catch (e) { console.error("삭제 실패", e); }
    }
  };

  const handleDeleteNotice = async (id: number) => {
    if (!isAdmin || !isLoggedIn) return;
    if (window.confirm("이 공지사항을 삭제하시겠습니까?")) {
      try {
        await api.delete(`/notices/${id}`);
        setNotices(prev => prev.filter(n => n.id !== id));
        navigate("/notice");
        alert("공지사항이 성공적으로 삭제되었습니다. ✨");
      } catch (e) { console.error("삭제 실패", e); }
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!isAdmin || !isLoggedIn) return;
    if (window.confirm("이 행사 기록을 삭제하시겠습니까?")) {
      try {
        await api.delete(`/events/${id}`);
        setEvents(prev => prev.filter(e => e.id !== id));
        navigate("/event");
        alert("행사가 삭제되었습니다.");
      } catch (e) { console.error("행사 삭제 실패", e); }
    }
  };

  // Helper for components that still rely on onNavigate string prop temporarily
  const handleNavigateCompat = (path: string, param?: any) => {
    if (path === "home") {
      navigate("/");
    } else if (path === "event" || path === "events") {
      navigate("/event");
    } else if (path === "notice") {
      navigate("/notice");
    } else if (path === "about" || path === "faq") {
      // "동아리소개"와 "자주 묻는 질문"은 홈 화면의 해시 앵커로 이동
      navigate(`/#${path}`);
    } else if (path === "board-detail" && param) {
      navigate(`/board/${param}`);
    } else if (path === "notice-detail" && param) {
      navigate(`/notice/${param}`);
    } else if (path === "event-detail" && param) {
      navigate(`/event/${param}`);
    } else if (path === "notice-write") {
      if (param) navigate(`/notice/write/${param}`);
      else navigate("/notice/write");
    } else if (path === "board-write") {
      if (!isLoggedIn) {
        alert("로그인이 필요한 서비스입니다.");
        return;
      }
      if (param) navigate(`/board/write/${param}`);
      else navigate("/board/write");
    } else if (path === "event-write") {
      if (param) navigate(`/event/write/${param}`);
      else navigate("/event/write");
    } else if (path === "member-detail" && param) {
      navigate(`/assembly/member/${param}`);
    } else if (path === "board" || path === "board-page") {
      navigate("/board");
    } else if (path === "assembly") {
      navigate("/assembly");
    } else if (path === "admin") {
      navigate("/admin");
    } else {
      navigate(`/${path.replace("-page", "")}`);
    }
  };

  const hideLayoutPaths = ["/login", "/signup", "/find-account", "/signup-success", "/contact-admin"];
  const isLayoutHidden = hideLayoutPaths.some(path => window.location.pathname.startsWith(path));

  return (
    <>
      {!isLayoutHidden && (
        <Navbar
          onNavigate={handleNavigateCompat}
          currentPage={window.location.pathname.slice(1) || "home"}
          isLoggedIn={isLoggedIn}
          onLogout={() => handleLogout(false)}
          userRole={isAdmin ? "ADMIN" : "USER"}
        />
      )}

      <main>
        <Routes>
          <Route path="/" element={<Home isAdmin={isAdmin && isLoggedIn} isLoggedIn={isLoggedIn} events={events} notices={notices} posts={posts} onNavigate={handleNavigateCompat} />} />

          <Route path="/login" element={<Login onNavigate={handleNavigateCompat} onLoginSuccess={(userData: any) => { setIsLoggedIn(true); setIsAdmin(userData.role === "ADMIN"); setCurrentUser(userData); navigate("/"); }} />} />
          <Route path="/signup" element={<Signup onNavigate={handleNavigateCompat} />} />
          <Route path="/find-account" element={<FindAccount onNavigate={handleNavigateCompat} />} />
          <Route path="/signup-success" element={<SignupSuccess onNavigate={handleNavigateCompat} />} />

          <Route path="/profile" element={<ProfilePage onNavigate={handleNavigateCompat} user={currentUser} setUser={setCurrentUser} posts={posts} />} />

          <Route path="/assembly" element={<AssemblyPage isAdmin={isAdmin} userStatus={userStatus} onNavigate={handleNavigateCompat} loginId={currentUser?.loginId} />} />
          <Route path="/assembly/member/:id" element={<MemberDetailTab loginId={""} onBack={() => navigate("/assembly")} />} />

          <Route path="/admin" element={<AdminPage />} />
          <Route path="/contact-admin" element={<ContactAdmin onNavigate={handleNavigateCompat} />} />

          <Route path="/board" element={<BoardPage onNavigate={handleNavigateCompat} posts={posts} isLoggedIn={isLoggedIn} isAdmin={isAdmin && isLoggedIn} user={currentUser} setPosts={setPosts} />} />
          <Route path="/board/write" element={isLoggedIn ? <BoardWriteWrapper posts={posts} onNavigate={handleNavigateCompat} isAdmin={isAdmin && isLoggedIn} user={currentUser} fetchPosts={fetchData} /> : <Navigate to="/board" replace />} />
          <Route path="/board/write/:id" element={isLoggedIn ? <BoardWriteWrapper posts={posts} onNavigate={handleNavigateCompat} isAdmin={isAdmin && isLoggedIn} user={currentUser} fetchPosts={fetchData} /> : <Navigate to="/board" replace />} />
          <Route path="/board/:id" element={<BoardDetailWrapper posts={posts} isAdmin={isAdmin && isLoggedIn} isLoggedIn={isLoggedIn} user={currentUser} setPosts={setPosts} onDelete={handleDeletePost} onToggleLike={handleToggleLike} onAddComment={handleAddComment} onDeleteComment={handleDeleteComment} onToggleCommentLike={handleToggleCommentLike} onAddReply={handleAddReply} handleNavigateCompat={handleNavigateCompat} />} />

          <Route path="/notice" element={<NoticePage onNavigate={handleNavigateCompat} isAdmin={isAdmin && isLoggedIn} isLoggedIn={isLoggedIn} notices={notices} user={currentUser} fetchNotices={fetchData} />} />
          <Route path="/notice/write" element={(isAdmin && isLoggedIn) ? <NoticeWriteWrapper notices={notices} onNavigate={handleNavigateCompat} user={currentUser} fetchNotices={fetchData} /> : <Navigate to="/" replace />} />
          <Route path="/notice/write/:id" element={(isAdmin && isLoggedIn) ? <NoticeWriteWrapper notices={notices} onNavigate={handleNavigateCompat} user={currentUser} fetchNotices={fetchData} /> : <Navigate to="/" replace />} />
          <Route path="/notice/:id" element={<NoticeDetailWrapper notices={notices} isAdmin={isAdmin && isLoggedIn} isLoggedIn={isLoggedIn} user={currentUser} setNotices={setNotices} onDelete={handleDeleteNotice} handleNavigateCompat={handleNavigateCompat} />} />

          <Route path="/event" element={<EventPage onNavigate={handleNavigateCompat} isAdmin={isAdmin && isLoggedIn} isLoggedIn={isLoggedIn} events={events} user={currentUser} setEvents={setEvents} />} />
          <Route path="/event/write" element={(isAdmin && isLoggedIn) ? <EventWriteWrapper events={events} onNavigate={handleNavigateCompat} user={currentUser} fetchEvents={fetchData} /> : <Navigate to="/" replace />} />
          <Route path="/event/write/:id" element={(isAdmin && isLoggedIn) ? <EventWriteWrapper events={events} onNavigate={handleNavigateCompat} user={currentUser} fetchEvents={fetchData} /> : <Navigate to="/" replace />} />
          <Route path="/event/:id" element={<EventDetailWrapper events={events} isAdmin={isAdmin && isLoggedIn} isLoggedIn={isLoggedIn} user={currentUser} setEvents={setEvents} onDelete={handleDeleteEvent} handleNavigateCompat={handleNavigateCompat} />} />

          <Route path="*" element={
            <div className="pt-40 text-center h-screen bg-slate-50">
              <h2 className="text-3xl font-black text-slate-900 mb-8 uppercase">404 Not Found</h2>
              <button onClick={() => navigate("/")} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold">홈으로 돌아가기</button>
            </div>
          } />
        </Routes>
      </main>

      {!isLayoutHidden && <Footer onNavigate={handleNavigateCompat} />}
    </>
  );
}

// Wrapper components to extract ID from URL params via react-router wrapper. 
// Since detail pages are expecting full object props in old code, we find it here.
import { useParams } from 'react-router-dom';

function BoardDetailWrapper({ posts, isAdmin, isLoggedIn, user, setPosts, onDelete, onToggleLike, onAddComment, onDeleteComment, onToggleCommentLike, onAddReply, handleNavigateCompat }: any) {
  const { id } = useParams();
  const post = posts.find((p: any) => Number(p.id) === Number(id));
  return <BoardDetail onNavigate={handleNavigateCompat} post={post} isAdmin={isAdmin} isLoggedIn={isLoggedIn} user={user} setPost={(updated: any) => setPosts((prev: any) => prev.map((p: any) => p.id === updated.id ? updated : p))} onDelete={onDelete} onToggleLike={onToggleLike} onAddComment={onAddComment} onDeleteComment={onDeleteComment} onToggleCommentLike={onToggleCommentLike} onAddReply={onAddReply} />;
}

function BoardWriteWrapper({ posts, onNavigate, isAdmin, user, fetchPosts }: any) {
  const { id } = useParams();
  const post = id ? posts.find((p: any) => Number(p.id) === Number(id)) : undefined;
  return <BoardWrite onNavigate={onNavigate} isAdmin={isAdmin} user={user} fetchPosts={fetchPosts} post={post} />;
}

function NoticeDetailWrapper({ notices, isAdmin, isLoggedIn, user, setNotices, onDelete, handleNavigateCompat }: any) {
  const { id } = useParams();
  const notice = notices.find((n: any) => Number(n.id) === Number(id));
  return <NoticeDetail onNavigate={handleNavigateCompat} isAdmin={isAdmin} isLoggedIn={isLoggedIn} notice={notice} user={user} setNotice={(updated: any) => setNotices((prev: any) => prev.map((n: any) => n.id === updated.id ? updated : n))} onDelete={onDelete} />;
}

function NoticeWriteWrapper({ notices, onNavigate, user, fetchNotices }: any) {
  const { id } = useParams();
  const notice = id ? notices.find((n: any) => Number(n.id) === Number(id)) : undefined;
  return <NoticeWrite onNavigate={onNavigate} notice={notice} user={user} fetchNotices={fetchNotices} />;
}

function EventDetailWrapper({ events, isAdmin, isLoggedIn, user, setEvents, onDelete, handleNavigateCompat }: any) {
  const { id } = useParams();
  const event = events.find((e: any) => Number(e.id) === Number(id));
  return <EventDetail onNavigate={handleNavigateCompat} isAdmin={isAdmin} isLoggedIn={isLoggedIn} event={event} onDelete={onDelete} user={user} setEvent={(updatedEvent: any) => { setEvents((prev: any) => prev.map((e: any) => e.id === updatedEvent.id ? updatedEvent : e)); }} />;
}

function EventWriteWrapper({ events, onNavigate, user, fetchEvents }: any) {
  const { id } = useParams();
  const event = id ? events.find((e: any) => Number(e.id) === Number(id)) : undefined;
  return <EventWrite onNavigate={onNavigate} event={event} user={user} fetchEvents={fetchEvents} />;
}

function App() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 selection:text-indigo-700">
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </div>
  );
}

export default App;

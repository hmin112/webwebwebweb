import { api } from "../api/axios";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Eye, Clock, User } from 'lucide-react';

// 1. 데이터 타입 정의 (백엔드 Entity와 일치시켜야 합니다)
interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: string; // ISO Date String
  category?: string; // 추가 필드 (선택사항)
  views?: number;
  comments?: number;
}

export const Board = () => {
  const [posts, setPosts] = useState<Post[]>([]); // Post 배열 타입 지정
  const [isLoading, setIsLoading] = useState(true);

  // 2. 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      // 백엔드 API 호출
      const response = await api.get('/posts');
      setPosts(response.data);
    } catch (error) {
      console.error("데이터를 가져오는 중 에러 발생!", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <section className="py-12 px-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">
            DEVSIGN 자유 게시판
          </h2>
          <p className="text-slate-500 font-medium">동아리원들의 자유로운 이야기를 공유하는 공간입니다.</p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-300">
            <p className="text-slate-400 font-bold">작성된 게시글이 없습니다. 첫 글의 주인공이 되어보세요!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <div 
                key={post.id} 
                className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-100/30 transition-all cursor-pointer group flex flex-col h-full"
              >
                {/* 카테고리 태그 (기본값: 자유) */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">
                    {post.category || "자유"}
                  </span>
                </div>

                {/* 제목 및 내용 */}
                <h3 className="text-xl font-black text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-1 tracking-tight">
                  {post.title}
                </h3>
                <p className="text-slate-400 font-bold text-sm mb-6 line-clamp-3 leading-relaxed flex-1">
                  {post.content}
                </p>

                {/* 하단 정보 섹션 */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-slate-700 font-black text-xs">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
                      <User size={14} />
                    </div>
                    {post.author}
                  </div>
                  
                  <div className="flex items-center gap-3 text-slate-300 font-bold text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {post.views || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Board;
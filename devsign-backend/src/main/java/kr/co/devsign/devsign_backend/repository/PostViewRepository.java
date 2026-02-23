package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.entity.Post;
import kr.co.devsign.devsign_backend.entity.PostView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PostViewRepository extends JpaRepository<PostView, Long> {

    // 해당 회원이 이 게시글을 이미 읽었는지 확인 (중복 조회수 증가 방지)
    boolean existsByMemberAndPost(Member member, Post post);

    // 게시글 삭제 시 연결된 모든 조회 기록 삭제
    @Transactional
    void deleteByPost(Post post);
}
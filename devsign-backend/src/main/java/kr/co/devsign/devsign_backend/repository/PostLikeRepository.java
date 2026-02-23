package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.entity.Post;
import kr.co.devsign.devsign_backend.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    // 특정 회원이 특정 게시글에 좋아요 눌렀는지 확인
    boolean existsByMemberAndPost(Member member, Post post);

    // 좋아요 취소 처리를 위한 데이터 찾기
    Optional<PostLike> findByMemberAndPost(Member member, Post post);

    // 좋아요 취소 시 삭제 처리
    @Transactional
    void deleteByMemberAndPost(Member member, Post post);

    // 특정 게시글 삭제 시 연결된 모든 좋아요 기록 삭제
    @Transactional
    void deleteByPost(Post post);
}
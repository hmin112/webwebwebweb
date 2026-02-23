package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.Comment;
import kr.co.devsign.devsign_backend.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    // 댓글을 최신순(ID 내림차순)으로 조회
    List<Comment> findByPostOrderByIdDesc(Post post);

    // 게시글 삭제시 댓글도 삭제
    @Transactional
    void deleteByPost(Post post);
}
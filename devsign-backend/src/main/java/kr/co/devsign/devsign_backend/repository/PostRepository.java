package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    // 게시글을 최신순으로 가져옴
    List<Post> findAllByOrderByIdDesc();
}

package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.entity.Notice;
import kr.co.devsign.devsign_backend.entity.NoticeView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface NoticeViewRepository extends JpaRepository<NoticeView, Long> {
    // 해당 회원이 이 공지사항을 읽었는지 확인
    boolean existsByMemberAndNotice(Member member, Notice notice);

    // 특정 공지사항의 조회 기록 삭제
    @Transactional
    void deleteByNotice(Notice notice);
}

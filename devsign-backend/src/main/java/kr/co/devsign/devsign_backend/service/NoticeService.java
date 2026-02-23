package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.entity.Notice;
import kr.co.devsign.devsign_backend.entity.NoticeView;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import kr.co.devsign.devsign_backend.repository.NoticeRepository;
import kr.co.devsign.devsign_backend.repository.NoticeViewRepository;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.notice.NoticePinResponse;
import kr.co.devsign.devsign_backend.dto.notice.NoticeRequest;
import kr.co.devsign.devsign_backend.dto.notice.NoticeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final MemberRepository memberRepository;
    private final NoticeViewRepository noticeViewRepository;
    private final AccessLogService accessLogService;

    public List<NoticeResponse> getAllNotices() {
        return noticeRepository.findAll(Sort.by(Sort.Order.desc("pinned"), Sort.Order.desc("id"))).stream()
                .map(this::toNoticeResponse)
                .toList();
    }

    public NoticePinResponse togglePin(Long id, String loginId, String ip) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("notice not found"));

        if (!notice.isPinned()) {
            long pinnedCount = noticeRepository.findAll().stream().filter(Notice::isPinned).count();
            if (pinnedCount >= 3) {
                return new NoticePinResponse("error", "maximum pinned notices is 3", null);
            }
            notice.setPinned(true);
            accessLogService.logByLoginId(loginId, "NOTICE_PIN", ip);
        } else {
            notice.setPinned(false);
            accessLogService.logByLoginId(loginId, "NOTICE_UNPIN", ip);
        }

        noticeRepository.save(notice);
        return new NoticePinResponse("success", null, notice.isPinned());
    }

    public NoticeResponse createNotice(NoticeRequest payload, String loginId, String ip) {
        Notice notice = new Notice();
        notice.setTitle(payload.title());
        notice.setContent(payload.content());

        String category = payload.category();
        notice.setCategory(category);
        notice.setTag(category);

        notice.setImages(payload.images());
        notice.setImportant(Boolean.TRUE.equals(payload.important()));
        notice.setViews(0);
        notice.setDate(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy.MM.dd")));
        notice.setPinned(false);

        if (loginId != null) {
            memberRepository.findByLoginId(loginId).ifPresent(m -> notice.setAuthor(m.getName()));
        } else {
            notice.setAuthor("ADMIN");
        }

        Notice saved = noticeRepository.save(notice);
        accessLogService.logByLoginId(loginId, "NOTICE_CREATE", ip);
        return toNoticeResponse(saved);
    }

    public NoticeResponse updateNotice(Long id, NoticeRequest payload, String loginId, String ip) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("notice not found"));

        notice.setTitle(payload.title());
        notice.setContent(payload.content());

        String category = payload.category();
        notice.setCategory(category);
        notice.setTag(category);

        notice.setImages(payload.images());
        notice.setImportant(Boolean.TRUE.equals(payload.important()));

        accessLogService.logByLoginId(loginId, "NOTICE_UPDATE", ip);
        return toNoticeResponse(noticeRepository.save(notice));
    }

    public NoticeResponse getNoticeDetail(Long id, String loginId) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("notice not found"));

        if (loginId != null) {
            Optional<Member> memberOpt = memberRepository.findByLoginId(loginId);
            if (memberOpt.isPresent()) {
                Member member = memberOpt.get();

                if (!noticeViewRepository.existsByMemberAndNotice(member, notice)) {
                    notice.setViews(notice.getViews() + 1);
                    noticeRepository.save(notice);

                    NoticeView view = new NoticeView();
                    view.setMember(member);
                    view.setNotice(notice);
                    noticeViewRepository.save(view);
                }
            }
        }

        return toNoticeResponse(notice);
    }

    @Transactional
    public StatusResponse deleteNotice(Long id, String loginId, String ip) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("notice not found"));

        accessLogService.logByLoginId(loginId, "NOTICE_DELETE", ip);
        noticeViewRepository.deleteByNotice(notice);
        noticeRepository.delete(notice);

        return StatusResponse.success();
    }

    private NoticeResponse toNoticeResponse(Notice notice) {
        return new NoticeResponse(
                notice.getId(),
                notice.getTag(),
                notice.getCategory(),
                notice.getTitle(),
                notice.getContent(),
                notice.getAuthor(),
                notice.getViews(),
                notice.getDate(),
                notice.getImages(),
                notice.isImportant(),
                notice.isPinned(),
                notice.getCreatedAt()
        );
    }
}

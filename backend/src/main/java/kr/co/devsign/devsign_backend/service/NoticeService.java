package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.entity.Notice;
import kr.co.devsign.devsign_backend.entity.NoticeAttachment;
import kr.co.devsign.devsign_backend.entity.NoticeView;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import kr.co.devsign.devsign_backend.repository.NoticeRepository;
import kr.co.devsign.devsign_backend.repository.NoticeViewRepository;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.notice.AttachmentResponse;
import kr.co.devsign.devsign_backend.dto.notice.NoticePinResponse;
import kr.co.devsign.devsign_backend.dto.notice.NoticeRequest;
import kr.co.devsign.devsign_backend.dto.notice.NoticeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final MemberRepository memberRepository;
    private final NoticeViewRepository noticeViewRepository;
    private final AccessLogService accessLogService;

    // ✨ application.properties에서 설정한 경로(/app/uploads)를 가져옵니다.
    @Value("${app.upload.base-dir}")
    private String uploadDir;

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

    // ✨ [수정] MultipartFile 리스트를 받아 물리 파일로 저장하도록 변경
    @Transactional
    public NoticeResponse createNotice(NoticeRequest payload, List<MultipartFile> files, List<MultipartFile> attachmentFiles, String loginId, String ip) {
        Notice notice = new Notice();
        notice.setTitle(payload.title());
        notice.setContent(payload.content());

        String category = payload.category();
        notice.setCategory(category);
        notice.setTag(category);

        // 🚀 다중 이미지 파일 저장 처리
        List<String> imageUrls = saveFiles(files);
        notice.setImages(imageUrls);

        // 🚀 [신규] 다운로드용 일반 첨부파일 저장 처리
        notice.setAttachments(saveAttachments(attachmentFiles));

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

    // ✨ [수정] 수정 시 기존 이미지 유지 + 새 파일 추가 로직 반영
    @Transactional
    public NoticeResponse updateNotice(Long id, NoticeRequest payload, List<MultipartFile> files, List<MultipartFile> attachmentFiles, String loginId, String ip) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("notice not found"));

        notice.setTitle(payload.title());
        notice.setContent(payload.content());

        String category = payload.category();
        notice.setCategory(category);
        notice.setTag(category);

        // 🚀 이미지 수정: 기존 이미지 URL 목록 + 새로 업로드된 파일 저장
        List<String> currentImages = payload.images() != null ? new ArrayList<>(payload.images()) : new ArrayList<>();
        currentImages.addAll(saveFiles(files));
        notice.setImages(currentImages);

        // 🚀 [신규] 첨부파일 수정: 기존에 유지할 첨부파일 목록 + 새로 업로드된 파일 저장
        List<NoticeAttachment> currentAttachments = new ArrayList<>();
        List<String> existingNames = payload.existingAttachmentNames();
        List<String> existingUrls = payload.existingAttachmentUrls();
        if (existingNames != null && existingUrls != null) {
            int count = Math.min(existingNames.size(), existingUrls.size());
            for (int i = 0; i < count; i++) {
                currentAttachments.add(new NoticeAttachment(existingNames.get(i), existingUrls.get(i)));
            }
        }
        currentAttachments.addAll(saveAttachments(attachmentFiles));
        notice.setAttachments(currentAttachments);

        notice.setImportant(Boolean.TRUE.equals(payload.important()));

        accessLogService.logByLoginId(loginId, "NOTICE_UPDATE", ip);
        return toNoticeResponse(noticeRepository.save(notice));
    }

    // ✨ [신규] 파일을 물리적으로 저장하고 URL 리스트를 반환하는 공통 메서드
    private List<String> saveFiles(List<MultipartFile> files) {
        List<String> urls = new ArrayList<>();
        if (files == null || files.isEmpty()) return urls;

        File directory = new File(uploadDir);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        for (MultipartFile file : files) {
            if (!file.isEmpty()) {
                String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
                File dest = new File(directory, fileName);
                try {
                    file.transferTo(dest);
                    urls.add("/uploads/" + fileName);
                } catch (IOException e) {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공지사항 이미지 저장 중 오류가 발생했습니다.");
                }
            }
        }
        return urls;
    }

    // ✨ [신규] 다운로드용 첨부파일을 물리적으로 저장하고, 원본 파일명 + URL 목록을 반환하는 메서드
    private List<NoticeAttachment> saveAttachments(List<MultipartFile> files) {
        List<NoticeAttachment> result = new ArrayList<>();
        if (files == null || files.isEmpty()) return result;

        File directory = new File(uploadDir);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        for (MultipartFile file : files) {
            if (!file.isEmpty()) {
                String originalName = file.getOriginalFilename();
                String storedName = UUID.randomUUID().toString() + "_" + originalName;
                File dest = new File(directory, storedName);
                try {
                    file.transferTo(dest);
                    result.add(new NoticeAttachment(originalName, "/uploads/" + storedName));
                } catch (IOException e) {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공지사항 첨부파일 저장 중 오류가 발생했습니다.");
                }
            }
        }
        return result;
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
        List<AttachmentResponse> attachmentResponses = notice.getAttachments() == null
                ? List.of()
                : notice.getAttachments().stream()
                        .map(a -> new AttachmentResponse(a.getOriginalName(), a.getUrl()))
                        .toList();

        return new NoticeResponse(
                notice.getId(),
                notice.getTag(),
                notice.getCategory(),
                notice.getTitle(),
                notice.getContent(),
                notice.getAuthor(),
                notice.getViews(),
                notice.getDate(),
                notice.getImages() == null ? List.of() : notice.getImages(),
                attachmentResponses,
                notice.isImportant(),
                notice.isPinned(),
                notice.getCreatedAt()
        );
    }
}

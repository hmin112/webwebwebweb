package kr.co.devsign.devsign_backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.devsign.devsign_backend.service.NoticeService;
import kr.co.devsign.devsign_backend.util.JwtUtil;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.notice.NoticePinResponse;
import kr.co.devsign.devsign_backend.dto.notice.NoticeRequest;
import kr.co.devsign.devsign_backend.dto.notice.NoticeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;
    private final JwtUtil jwtUtil;

    @GetMapping
    public List<NoticeResponse> getAllNotices() {
        return noticeService.getAllNotices();
    }

    @PutMapping("/{id}/pin")
    public NoticePinResponse togglePin(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return noticeService.togglePin(id, loginId, request.getRemoteAddr());
    }

    // ✨ 공지사항 내 이미지를 FormData 형식으로 빠르고 안정적으로 처리합니다.
    @PostMapping
    public NoticeResponse createNotice(
            @ModelAttribute NoticeRequest payload, 
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        // Service 단에서 파일을 저장할 수 있도록 files 인자를 추가 전달합니다.
        return noticeService.createNotice(payload, files, loginId, request.getRemoteAddr());
    }

    // ✨ 수정 시에도 새로운 이미지 파일을 처리할 수 있도록 적용되어 있습니다.
    @PutMapping("/{id}")
    public NoticeResponse updateNotice(
            @PathVariable Long id, 
            @ModelAttribute NoticeRequest payload, 
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return noticeService.updateNotice(id, payload, files, loginId, request.getRemoteAddr());
    }

    @GetMapping("/{id}")
    public NoticeResponse getNoticeDetail(@PathVariable Long id, HttpServletRequest request) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return noticeService.getNoticeDetail(id, loginId);
    }

    @DeleteMapping("/{id}")
    public StatusResponse deleteNotice(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return noticeService.deleteNotice(id, loginId, request.getRemoteAddr());
    }
}
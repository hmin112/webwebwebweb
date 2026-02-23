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

    @PostMapping
    public NoticeResponse createNotice(@RequestBody NoticeRequest payload, HttpServletRequest request) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return noticeService.createNotice(payload, loginId, request.getRemoteAddr());
    }

    @PutMapping("/{id}")
    public NoticeResponse updateNotice(@PathVariable Long id, @RequestBody NoticeRequest payload, HttpServletRequest request) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return noticeService.updateNotice(id, payload, loginId, request.getRemoteAddr());
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

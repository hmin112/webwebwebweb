package kr.co.devsign.devsign_backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.devsign.devsign_backend.service.EventService;
import kr.co.devsign.devsign_backend.util.JwtUtil;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.event.EventDetailResponse;
import kr.co.devsign.devsign_backend.dto.event.EventLikeResponse;
import kr.co.devsign.devsign_backend.dto.event.EventRequest;
import kr.co.devsign.devsign_backend.dto.event.EventResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final JwtUtil jwtUtil;

    @GetMapping
    public List<EventResponse> getAllEvents() {
        return eventService.getAllEvents();
    }

    // ✨ [수정] @RequestBody 대신 @ModelAttribute와 MultipartFile 리스트를 받습니다.
    // 행사 포스터나 이미지를 FormData 형식으로 안전하고 빠르게 처리합니다.
    @PostMapping
    public EventResponse createEvent(
            @ModelAttribute EventRequest payload, 
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        // Service 단에서 파일을 저장할 수 있도록 files 인자를 추가 전달합니다.
        return eventService.createEvent(payload, files, loginId, request.getRemoteAddr());
    }

    // ✨ [수정] 수정 시에도 새로운 이미지 파일을 처리할 수 있도록 변경했습니다.
    @PutMapping("/{id}")
    public EventResponse updateEvent(
            @PathVariable Long id, 
            @ModelAttribute EventRequest payload, 
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return eventService.updateEvent(id, payload, files, loginId, request.getRemoteAddr());
    }

    @GetMapping("/{id}")
    public EventDetailResponse getEventDetail(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return eventService.getEventDetail(id, loginId);
    }

    @PostMapping("/{id}/like")
    public EventLikeResponse toggleLike(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return eventService.toggleLike(id, loginId);
    }

    @DeleteMapping("/{id}")
    public StatusResponse deleteEvent(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return eventService.deleteEvent(id, loginId, request.getRemoteAddr());
    }
}
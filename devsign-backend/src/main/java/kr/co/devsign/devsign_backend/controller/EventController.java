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

    @PostMapping
    public EventResponse createEvent(@RequestBody EventRequest payload, HttpServletRequest request) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return eventService.createEvent(payload, loginId, request.getRemoteAddr());
    }

    @PutMapping("/{id}")
    public EventResponse updateEvent(@PathVariable Long id, @RequestBody EventRequest payload, HttpServletRequest request) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return eventService.updateEvent(id, payload, loginId, request.getRemoteAddr());
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

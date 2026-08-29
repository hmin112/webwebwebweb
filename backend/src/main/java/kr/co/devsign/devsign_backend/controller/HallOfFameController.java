package kr.co.devsign.devsign_backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.halloffame.HallOfFameRequest;
import kr.co.devsign.devsign_backend.dto.halloffame.HallOfFameResponse;
import kr.co.devsign.devsign_backend.service.HallOfFameService;
import kr.co.devsign.devsign_backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

// 조회(GET)는 누구나 가능, 작성/수정/삭제는 SecurityConfig에서 ROLE_ADMIN으로 제한됨
@RestController
@RequestMapping("/api/hall-of-fame")
@RequiredArgsConstructor
public class HallOfFameController {

    private final HallOfFameService hallOfFameService;
    private final JwtUtil jwtUtil;

    @GetMapping
    public List<HallOfFameResponse> getAll() {
        return hallOfFameService.getAllHallOfFame();
    }

    @PostMapping
    public HallOfFameResponse create(
            @ModelAttribute HallOfFameRequest payload,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @RequestParam(value = "participantLoginIds", required = false) List<String> participantLoginIds,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return hallOfFameService.createHallOfFame(payload, files, participantLoginIds, loginId, request.getRemoteAddr());
    }

    @PutMapping("/{id}")
    public HallOfFameResponse update(
            @PathVariable Long id,
            @ModelAttribute HallOfFameRequest payload,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @RequestParam(value = "participantLoginIds", required = false) List<String> participantLoginIds,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return hallOfFameService.updateHallOfFame(id, payload, files, participantLoginIds, loginId, request.getRemoteAddr());
    }

    @DeleteMapping("/{id}")
    public StatusResponse delete(@PathVariable Long id, HttpServletRequest request) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return hallOfFameService.deleteHallOfFame(id, loginId, request.getRemoteAddr());
    }
}

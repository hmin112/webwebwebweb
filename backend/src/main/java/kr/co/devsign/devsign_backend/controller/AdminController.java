package kr.co.devsign.devsign_backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.devsign.devsign_backend.dto.admin.AccessLogResponse;
import kr.co.devsign.devsign_backend.dto.admin.AdminDiscordCheckResponse;
import kr.co.devsign.devsign_backend.dto.admin.AdminMemberResponse;
import kr.co.devsign.devsign_backend.dto.admin.AdminPasswordVerifyRequest;
import kr.co.devsign.devsign_backend.dto.admin.AdminPeriodResponse;
import kr.co.devsign.devsign_backend.dto.admin.AdminPeriodSaveRequest;
import kr.co.devsign.devsign_backend.dto.admin.AdminPeriodSubmissionResponse;
import kr.co.devsign.devsign_backend.dto.admin.AdminPeriodZipRequest;
import kr.co.devsign.devsign_backend.dto.admin.HeroSettingsRequest;
import kr.co.devsign.devsign_backend.dto.admin.HeroSettingsResponse;
import kr.co.devsign.devsign_backend.dto.admin.NotifyMembersRequest;
import kr.co.devsign.devsign_backend.dto.admin.RestoreMemberRequest;
import kr.co.devsign.devsign_backend.dto.admin.SyncDiscordResponse;
import kr.co.devsign.devsign_backend.dto.admin.UpdateDiscordTagRequest;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/members")
    public List<AdminMemberResponse> getAllMembers() {
        return adminService.getAllMembers();
    }

    @GetMapping("/members/deleted")
    public List<AdminMemberResponse> getDeletedMembers() {
        return adminService.getDeletedMembers();
    }

    @GetMapping("/logs")
    public List<AccessLogResponse> getAllLogs() {
        return adminService.getAllLogs();
    }

    @GetMapping("/settings")
    public HeroSettingsResponse getHeroSettings() {
        return adminService.getHeroSettings();
    }

    @PostMapping("/settings")
    public StatusResponse updateHeroSettings(@RequestBody HeroSettingsRequest settings) {
        return adminService.updateHeroSettings(settings);
    }

    @GetMapping("/periods/{year}")
    public List<AdminPeriodResponse> getPeriods(@PathVariable int year) {
        return adminService.getPeriods(year);
    }

    @GetMapping("/periods/submissions")
    public List<AdminPeriodSubmissionResponse> getSubmittedMembers(
            @RequestParam int year,
            @RequestParam int semester,
            @RequestParam int month
    ) {
        return adminService.getSubmittedMembers(year, semester, month);
    }

    @PostMapping("/periods/save-all")
    public StatusResponse saveAllPeriods(@RequestBody List<AdminPeriodSaveRequest> periods) {
        return adminService.saveAllPeriods(periods);
    }

    @PostMapping("/periods/download-zip")
    public ResponseEntity<byte[]> downloadZip(@RequestBody AdminPeriodZipRequest request) {
        return adminService.downloadPeriodZip(request);
    }

    @GetMapping("/sync-discord")
    public SyncDiscordResponse syncDiscord() {
        return adminService.syncDiscord();
    }

    // ✨ [신규] 선택한 회원들에게 디스코드 DM으로 안내 메시지 일괄 발송
    @PostMapping("/notify")
    public ResponseEntity<?> notifyMembers(@RequestBody NotifyMembersRequest request) {
        try {
            return ResponseEntity.ok(adminService.notifyMembers(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    // ✨ [신규] 웹사이트 회원들이 실제로 동아리 디스코드 서버에 남아있는지 확인 (탈퇴자 파악용)
    @GetMapping("/discord-check")
    public ResponseEntity<?> checkDiscordMembership() {
        try {
            return ResponseEntity.ok(adminService.checkDiscordMembership());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PutMapping("/members/{id}/suspend")
    public StatusResponse toggleSuspension(@PathVariable Long id, HttpServletRequest request) {
        return adminService.toggleSuspension(id, request.getRemoteAddr());
    }

    // ✨ [신규] 관리자가 직접 회원의 디스코드 태그를 수정
    @PutMapping("/members/{id}/discord-tag")
    public StatusResponse updateDiscordTag(
            @PathVariable Long id,
            @RequestBody UpdateDiscordTagRequest request,
            HttpServletRequest httpRequest
    ) {
        return adminService.updateDiscordTag(id, request.discordTag(), httpRequest.getRemoteAddr());
    }

    @PostMapping("/members/restore")
    public StatusResponse restoreMember(@RequestBody RestoreMemberRequest member, HttpServletRequest request) {
        return adminService.restoreMember(member, request.getRemoteAddr());
    }

    @DeleteMapping("/members/{id}")
    public StatusResponse deleteMember(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean hard,
            HttpServletRequest request
    ) {
        return adminService.deleteMember(id, hard, request.getRemoteAddr());
    }

    @PostMapping("/verify-password")
    public StatusResponse verifyAdminPassword(
            @RequestBody AdminPasswordVerifyRequest request,
            Authentication authentication
    ) {
        return adminService.verifyAdminPassword(authentication, request);
    }
}

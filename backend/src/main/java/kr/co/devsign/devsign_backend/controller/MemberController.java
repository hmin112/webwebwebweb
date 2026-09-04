package kr.co.devsign.devsign_backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.devsign.devsign_backend.service.MemberService;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.member.ChangePasswordRequest;
import kr.co.devsign.devsign_backend.dto.member.DiscordLookupResponse;
import kr.co.devsign.devsign_backend.dto.member.FindDiscordByInfoRequest;
import kr.co.devsign.devsign_backend.dto.member.LoginRequest;
import kr.co.devsign.devsign_backend.dto.member.LoginResponse;
import kr.co.devsign.devsign_backend.dto.member.LogoutLogRequest;
import kr.co.devsign.devsign_backend.dto.member.MemberResponse;
import kr.co.devsign.devsign_backend.dto.member.ResetPasswordFinalRequest;
import kr.co.devsign.devsign_backend.dto.member.SendDiscordCodeRequest;
import kr.co.devsign.devsign_backend.dto.member.SendDiscordCodeResponse;
import kr.co.devsign.devsign_backend.dto.member.SignupRequest;
import kr.co.devsign.devsign_backend.dto.member.UpdateMemberRequest;
import kr.co.devsign.devsign_backend.dto.member.VerifyCodeRequest;
import kr.co.devsign.devsign_backend.dto.member.VerifyCodeResponse;
import kr.co.devsign.devsign_backend.dto.member.VerifyIdPwRequest;
import kr.co.devsign.devsign_backend.dto.member.VerifyIdPwResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @PostMapping("/signup")
    public ResponseEntity<MemberResponse> signup(@RequestBody SignupRequest payload, HttpServletRequest request) {
        MemberResponse saved = memberService.signup(payload, request.getRemoteAddr());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/all")
    public List<MemberResponse> getAllMembers() {
        return memberService.getAllMembers();
    }

    // ✨ [신규] 홈 화면 하단 연락처(회장/부회장/총무)용 — 비로그인 방문자도 조회 가능
    @GetMapping("/officers")
    public List<kr.co.devsign.devsign_backend.dto.member.OfficerContactResponse> getOfficerContacts() {
        return memberService.getOfficerContacts();
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        return memberService.login(loginRequest, request);
    }

    @PostMapping("/logout-log")
    public StatusResponse logoutLog(@RequestBody LogoutLogRequest requestData, HttpServletRequest request) {
        return memberService.logoutLog(requestData, request.getRemoteAddr());
    }

    // ✨ [수정 완료] 프론트엔드에서 쿼리 파라미터로 날아올 인증번호(authCode)를 받아서 Service(주방장)로 넘겨줍니다!
    @PutMapping("/update/{loginId}")
    public StatusResponse updateMember(
            @PathVariable String loginId, 
            @RequestBody UpdateMemberRequest updateData,
            @RequestParam(required = false) String authCode
    ) {
        return memberService.updateMember(loginId, updateData, authCode);
    }

    @PutMapping("/change-password/{loginId}")
    public StatusResponse changePassword(@PathVariable String loginId, @RequestBody ChangePasswordRequest request) {
        return memberService.changePassword(loginId, request);
    }

    @PostMapping("/find-discord-by-info")
    public DiscordLookupResponse findDiscordByInfo(@RequestBody FindDiscordByInfoRequest request) {
        return memberService.findDiscordByInfo(request);
    }

    @PostMapping("/verify-id-pw")
    public VerifyIdPwResponse verifyIdPw(@RequestBody VerifyIdPwRequest request) {
        return memberService.verifyIdPw(request);
    }

    @PutMapping("/reset-password-final")
    public StatusResponse resetPasswordFinal(@RequestBody ResetPasswordFinalRequest request) {
        return memberService.resetPasswordFinal(request);
    }

    @GetMapping("/check/{loginId}")
    public boolean checkId(@PathVariable String loginId) {
        return memberService.checkId(loginId);
    }

    @PostMapping("/discord-send")
    public SendDiscordCodeResponse sendDiscordCode(@RequestBody SendDiscordCodeRequest request) {
        return memberService.sendDiscordCode(request);
    }

    @PostMapping("/verify-code")
    public VerifyCodeResponse verifyCode(@RequestBody VerifyCodeRequest request) {
        return memberService.verifyCode(request);
    }
}
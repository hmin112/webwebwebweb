package kr.co.devsign.devsign_backend.service;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.devsign.devsign_backend.entity.AccessLog;
import kr.co.devsign.devsign_backend.entity.DiscordAuth;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.AccessLogRepository;
import kr.co.devsign.devsign_backend.repository.DiscordAuthRepository;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import kr.co.devsign.devsign_backend.util.JwtUtil;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MemberService {
    private static final String DEFAULT_AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/0.png";

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AccessLogRepository accessLogRepository;

    @Autowired
    private RestTemplate restTemplate;

    private final MemberRepository memberRepository;
    private final DiscordAuthRepository discordAuthRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    private final AccessLogService accessLogService;
    private final DiscordBotClient discordBotClient;

    public MemberResponse signup(SignupRequest payload, String ip) {
        String authCode = payload.authCode();

        DiscordAuth auth = discordAuthRepository.findByCode(authCode)
                .orElseThrow(() -> new RuntimeException("invalid or expired auth code"));

        Map<String, String> discordInfo = parseDiscordNickname(auth.getDiscordNickname());

        Member member = new Member();
        member.setLoginId(payload.loginId());
        member.setPassword(passwordEncoder.encode(payload.password()));
        member.setDept(payload.dept());
        member.setInterests(payload.interests());

        member.setName(discordInfo.get("name"));
        member.setStudentId(discordInfo.get("studentId"));
        member.setDiscordTag(auth.getDiscordTag());

        member.setRole(auth.getRole() != null ? auth.getRole() : "USER");
        member.setUserStatus(auth.getUserStatus() != null ? auth.getUserStatus() : "ATTENDING");
        member.setProfileImage(auth.getAvatarUrl());

        Member saved = memberRepository.save(member);

        accessLogService.logByMember(saved, "SIGNUP", ip);
        discordAuthRepository.delete(auth);

        return toMemberResponse(saved);
    }

    public List<MemberResponse> getAllMembers() {
        return memberRepository.findByDeletedFalseOrderByStudentIdDesc().stream()
                .map(this::toMemberResponse)
                .toList();
    }

    public LoginResponse login(LoginRequest loginRequest, HttpServletRequest request) {
        Optional<Member> memberOpt = memberRepository.findByLoginId(loginRequest.loginId());

        if (memberOpt.isPresent() && passwordEncoder.matches(loginRequest.password(), memberOpt.get().getPassword())) {
            Member m = memberOpt.get();

            if (m.isDeleted()) {
                return new LoginResponse(
                        "fail",
                        "account deleted",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                );
            }

            if (m.isSuspended()) {
                return new LoginResponse(
                        "suspended",
                        "account suspended",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                );
            }

            String token = jwtUtil.generateToken(m.getLoginId(), m.getRole());

            AccessLog log = new AccessLog();
            log.setName(m.getName());
            log.setStudentId(m.getStudentId());
            log.setType("LOGIN");
            log.setIp(request.getRemoteAddr());
            accessLogRepository.save(log);

            String avatarUrl = DEFAULT_AVATAR_URL;
            try {
                String botUrl = "http://127.0.0.1:8000/get-avatar/" + m.getDiscordTag();
                Map<String, Object> botResponse = restTemplate.getForObject(botUrl, Map.class);
                if (botResponse != null && "success".equals(botResponse.get("status"))) {
                    avatarUrl = asString(botResponse.get("avatarUrl"));
                }
            } catch (Exception ignored) {
            }

            return new LoginResponse(
                    "success",
                    null,
                    token,
                    m.getRole(),
                    m.getUserStatus(),
                    m.getName(),
                    m.getLoginId(),
                    m.getStudentId(),
                    m.getDept(),
                    m.getDiscordTag(),
                    avatarUrl
            );
        }

        return new LoginResponse(
                "fail",
                "invalid credentials",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    public StatusResponse logoutLog(LogoutLogRequest requestData, String ip) {
        accessLogService.logRaw(requestData.name(), requestData.studentId(), "LOGOUT", ip);
        return StatusResponse.success();
    }

    public StatusResponse updateMember(String loginId, UpdateMemberRequest updateData) {
        Optional<Member> memberOpt = memberRepository.findByLoginId(loginId);
        if (memberOpt.isEmpty()) {
            return StatusResponse.fail("member not found");
        }

        String newDiscordTag = updateData.discordTag();

        try {
            Map<String, Object> botRes = discordBotClient.checkMember(newDiscordTag);
            boolean exists = botRes != null && Boolean.TRUE.equals(botRes.get("exists"));
            if (!exists) {
                return StatusResponse.fail("discord member not found");
            }
        } catch (Exception e) {
            return StatusResponse.error("discord verification failed");
        }

        Member member = memberOpt.get();
        member.setDept(updateData.dept());
        member.setDiscordTag(newDiscordTag);
        memberRepository.save(member);

        return StatusResponse.success();
    }

    public StatusResponse changePassword(String loginId, ChangePasswordRequest request) {
        Optional<Member> memberOpt = memberRepository.findByLoginId(loginId);

        if (memberOpt.isEmpty()) {
            return StatusResponse.fail("member not found");
        }

        Member member = memberOpt.get();
        if (!passwordEncoder.matches(request.currentPassword(), member.getPassword())) {
            return StatusResponse.fail("current password mismatch");
        }

        member.setPassword(passwordEncoder.encode(request.newPassword()));
        memberRepository.save(member);

        return StatusResponse.success();
    }

    public DiscordLookupResponse findDiscordByInfo(FindDiscordByInfoRequest request) {
        return memberRepository.findByNameAndStudentId(request.name(), request.studentId())
                .map(m -> new DiscordLookupResponse("success", m.getDiscordTag()))
                .orElseGet(() -> new DiscordLookupResponse("fail", null));
    }

    public VerifyIdPwResponse verifyIdPw(VerifyIdPwRequest request) {
        Optional<Member> memberOpt = memberRepository.findByNameAndStudentId(request.name(), request.studentId());
        if (memberOpt.isEmpty()) {
            return new VerifyIdPwResponse("fail", null);
        }

        String discordTag = memberOpt.get().getDiscordTag();
        boolean ok = checkVerificationInternal(discordTag, request.code());
        if (!ok) {
            return new VerifyIdPwResponse("fail", null);
        }

        return new VerifyIdPwResponse("success", memberOpt.get().getLoginId());
    }

    public StatusResponse resetPasswordFinal(ResetPasswordFinalRequest request) {
        Optional<Member> memberOpt = memberRepository.findByNameAndStudentId(request.name(), request.studentId());
        if (memberOpt.isEmpty()) {
            return StatusResponse.fail("member not found");
        }

        Member member = memberOpt.get();
        member.setPassword(passwordEncoder.encode(request.newPassword()));
        memberRepository.save(member);

        return StatusResponse.success();
    }

    public boolean checkId(String loginId) {
        return memberRepository.findByLoginId(loginId).isPresent();
    }

    public SendDiscordCodeResponse sendDiscordCode(SendDiscordCodeRequest request) {
        String discordTag = request.discordTag();
        String randomCode = String.format("%06d", (int) (Math.random() * 1000000));

        try {
            Map<String, Object> botRes = discordBotClient.sendCode(discordTag, randomCode);

            if (botRes != null && "success".equals(botRes.get("status"))) {
                DiscordAuth auth = new DiscordAuth();
                auth.setDiscordTag(discordTag);
                auth.setCode(randomCode);
                auth.setExpiry(LocalDateTime.now().plusMinutes(5));

                String nickname = botRes.get("studentId") + " " + botRes.get("name");
                auth.setDiscordNickname(nickname);
                auth.setRole((String) botRes.get("role"));
                auth.setUserStatus((String) botRes.get("userStatus"));
                auth.setAvatarUrl((String) botRes.get("avatarUrl"));

                discordAuthRepository.save(auth);
            }

            return new SendDiscordCodeResponse(
                    asString(botRes != null ? botRes.get("status") : null),
                    asString(botRes != null ? botRes.get("message") : null),
                    asString(botRes != null ? botRes.get("name") : null),
                    asString(botRes != null ? botRes.get("studentId") : null),
                    asString(botRes != null ? botRes.get("userStatus") : null),
                    asString(botRes != null ? botRes.get("role") : null),
                    asString(botRes != null ? botRes.get("avatarUrl") : null)
            );

        } catch (Exception e) {
            return new SendDiscordCodeResponse("bot_error", null, null, null, null, null, null);
        }
    }

    public VerifyCodeResponse verifyCode(VerifyCodeRequest request) {
        Optional<DiscordAuth> authOpt =
                discordAuthRepository.findTopByDiscordTagOrderByExpiryDesc(request.discordTag().trim());

        if (authOpt.isPresent()) {
            DiscordAuth auth = authOpt.get();
            boolean ok = auth.getCode().equals(request.code().trim())
                    && auth.getExpiry().isAfter(LocalDateTime.now());

            if (ok) {
                Map<String, String> discordInfo = parseDiscordNickname(auth.getDiscordNickname());
                return new VerifyCodeResponse(
                        "success",
                        discordInfo.get("name"),
                        discordInfo.get("studentId"),
                        auth.getUserStatus(),
                        auth.getRole()
                );
            }
        }

        return new VerifyCodeResponse("fail", null, null, null, null);
    }

    private boolean checkVerificationInternal(String discordTag, String code) {
        return discordAuthRepository.findTopByDiscordTagOrderByExpiryDesc(discordTag.trim())
                .map(auth -> auth.getCode().equals(code.trim()) && auth.getExpiry().isAfter(LocalDateTime.now()))
                .orElse(false);
    }

    private Map<String, String> parseDiscordNickname(String nickname) {
        Map<String, String> info = new HashMap<>();
        if (nickname != null && nickname.contains(" ")) {
            String[] parts = nickname.split(" ", 2);
            info.put("studentId", parts[0]);
            info.put("name", parts[1]);
        } else {
            info.put("studentId", "Unknown");
            info.put("name", nickname != null ? nickname : "Unknown");
        }
        return info;
    }

    private MemberResponse toMemberResponse(Member member) {
        return new MemberResponse(
                member.getId(),
                member.getLoginId(),
                member.getName(),
                member.getStudentId(),
                member.getDept(),
                member.getInterests(),
                member.getDiscordTag(),
                member.getUserStatus(),
                member.getRole(),
                member.isSuspended(),
                member.getProfileImage()
        );
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }
}

package kr.co.devsign.devsign_backend.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import kr.co.devsign.devsign_backend.entity.AccessLog;
import kr.co.devsign.devsign_backend.entity.DiscordAuth;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.entity.VerificationGrant;
import kr.co.devsign.devsign_backend.repository.AccessLogRepository;
import kr.co.devsign.devsign_backend.repository.DiscordAuthRepository;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import kr.co.devsign.devsign_backend.repository.VerificationGrantRepository;
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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MemberService {
    private static final String DEFAULT_AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/0.png";
    private static final String PURPOSE_SIGNUP = "SIGNUP";
    private static final String PURPOSE_PASSWORD_RESET = "PASSWORD_RESET";
    private static final long VERIFICATION_GRANT_TTL_SECONDS = 300;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AccessLogRepository accessLogRepository;

    @Autowired
    private RestTemplate restTemplate;

    private final MemberRepository memberRepository;
    private final DiscordAuthRepository discordAuthRepository;
    private final VerificationGrantRepository verificationGrantRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    private final AccessLogService accessLogService;
    private final DiscordBotClient discordBotClient;

    @Transactional
    public MemberResponse signup(SignupRequest payload, String ip) {
        VerificationGrant grant = consumeVerificationGrant(payload.verificationToken(), PURPOSE_SIGNUP);
        String discordTag = grant.getSubject();

        if (memberRepository.findByDiscordTag(discordTag).isPresent()) {
            throw new RuntimeException("이미 가입된 디스코드 계정입니다. 다른 계정으로 인증해주세요.");
        }

        Member member = new Member();
        member.setLoginId(payload.loginId());
        member.setPassword(passwordEncoder.encode(payload.password()));
        member.setDept(payload.dept());
        member.setInterests(payload.interests());
        member.setName(grant.getNameSnapshot());
        member.setStudentId(grant.getStudentIdSnapshot());
        member.setDiscordTag(discordTag);
        member.setRole(grant.getRoleSnapshot() != null ? grant.getRoleSnapshot() : "USER");
        member.setUserStatus(grant.getUserStatusSnapshot() != null ? grant.getUserStatusSnapshot() : "ATTENDING");
        member.setProfileImage(grant.getAvatarUrlSnapshot());

        Member saved = memberRepository.save(member);
        accessLogService.logByMember(saved, "SIGNUP", ip);

        return toMemberResponse(saved);
    }

    public List<MemberResponse> getAllMembers() {
        return memberRepository.findByDeletedFalseOrderByStudentIdDesc().stream()
                .map(this::toMemberResponse)
                .toList();
    }

    // ✨ [신규] 홈 화면 하단 연락처용 — 회장/부회장/총무만 뽑아서 공개. 임원진은 이름에
    // "김형민(회장)"처럼 직책이 붙어 저장되는 관례(디스코드 별명 동기화)를 그대로 이용해 찾는다.
    // 회원 전체 목록(/members/all)은 인증이 필요하지만, 이 엔드포인트는 이름+학번만 공개하므로
    // 비로그인 방문자도 볼 수 있는 홈 화면 하단에서 안전하게 쓸 수 있다.
    public List<kr.co.devsign.devsign_backend.dto.member.OfficerContactResponse> getOfficerContacts() {
        List<Member> activeMembers = memberRepository.findByDeletedFalseOrderByStudentIdDesc();
        List<kr.co.devsign.devsign_backend.dto.member.OfficerContactResponse> result = new java.util.ArrayList<>();

        for (String role : List.of("회장", "부회장", "총무")) {
            String suffix = "(" + role + ")";
            activeMembers.stream()
                    .filter(m -> m.getName() != null && m.getName().contains(suffix))
                    .findFirst()
                    .ifPresent(m -> result.add(new kr.co.devsign.devsign_backend.dto.member.OfficerContactResponse(
                            role, m.getName().replace(suffix, "").trim(), m.getStudentId()
                    )));
        }
        return result;
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
                Map<String, Object> botResponse = discordBotClient.getAvatar(m.getDiscordTag());
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

    public StatusResponse updateMember(String loginId, UpdateMemberRequest updateData, String authCode) {
        Optional<Member> memberOpt = memberRepository.findByLoginId(loginId);
        if (memberOpt.isEmpty()) {
            return StatusResponse.fail("member not found");
        }

        Member member = memberOpt.get();
        String newDiscordTag = updateData.discordTag();

        if (newDiscordTag != null && !newDiscordTag.equals(member.getDiscordTag())) {
            
            if (memberRepository.findByDiscordTag(newDiscordTag).isPresent()) {
                return StatusResponse.fail("이미 다른 사용자가 등록한 디스코드 계정입니다.");
            }

            if (authCode == null || authCode.trim().isEmpty()) {
                return StatusResponse.fail("디스코드 계정 변경을 위한 인증번호가 필요합니다.");
            }

            Optional<DiscordAuth> authOpt = discordAuthRepository.findByCode(authCode);
            if (authOpt.isEmpty() || 
                !authOpt.get().getDiscordTag().equals(newDiscordTag) || 
                authOpt.get().getExpiry().isBefore(LocalDateTime.now())) {
                return StatusResponse.fail("유효하지 않거나 만료된 인증번호입니다.");
            }

            discordAuthRepository.delete(authOpt.get());
        }

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
            return new VerifyIdPwResponse("fail", null, null, null);
        }

        Member member = memberOpt.get();
        boolean ok = checkVerificationInternal(member.getDiscordTag(), request.code());
        if (!ok) {
            return new VerifyIdPwResponse("fail", null, null, null);
        }

        if ("id".equalsIgnoreCase(request.type())) {
            return new VerifyIdPwResponse("success", member.getLoginId(), null, null);
        }

        VerificationTokenIssue issued = issueVerificationGrant(
                PURPOSE_PASSWORD_RESET,
                String.valueOf(member.getId()),
                member.getName(),
                member.getStudentId(),
                member.getRole(),
                member.getUserStatus(),
                member.getProfileImage()
        );

        return new VerifyIdPwResponse("success", member.getLoginId(), issued.token(), issued.expiresInSeconds());
    }

    @Transactional
    public StatusResponse resetPasswordFinal(ResetPasswordFinalRequest request) {
        VerificationGrant grant = consumeVerificationGrant(request.verificationToken(), PURPOSE_PASSWORD_RESET);

        Optional<Member> memberOpt = memberRepository.findByNameAndStudentId(request.name(), request.studentId());
        if (memberOpt.isEmpty()) {
            return StatusResponse.fail("member not found");
        }

        Member member = memberOpt.get();
        if (!String.valueOf(member.getId()).equals(grant.getSubject())) {
            return StatusResponse.fail("verification mismatch");
        }

        if (grant.getNameSnapshot() != null && !grant.getNameSnapshot().equals(request.name())) {
            return StatusResponse.fail("verification mismatch");
        }

        if (grant.getStudentIdSnapshot() != null && !grant.getStudentIdSnapshot().equals(request.studentId())) {
            return StatusResponse.fail("verification mismatch");
        }

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
                VerificationTokenIssue issued = issueVerificationGrant(
                        PURPOSE_SIGNUP,
                        auth.getDiscordTag(),
                        discordInfo.get("name"),
                        discordInfo.get("studentId"),
                        auth.getRole(),
                        auth.getUserStatus(),
                        auth.getAvatarUrl()
                );

                return new VerifyCodeResponse(
                        "success",
                        discordInfo.get("name"),
                        discordInfo.get("studentId"),
                        auth.getUserStatus(),
                        auth.getRole(),
                        issued.token(),
                        issued.expiresInSeconds()
                );
            }
        }

        return new VerifyCodeResponse("fail", null, null, null, null, null, null);
    }

    private boolean checkVerificationInternal(String discordTag, String code) {
        return discordAuthRepository.findTopByDiscordTagOrderByExpiryDesc(discordTag.trim())
                .map(auth -> auth.getCode().equals(code.trim()) && auth.getExpiry().isAfter(LocalDateTime.now()))
                .orElse(false);
    }

    private VerificationTokenIssue issueVerificationGrant(
            String purpose,
            String subject,
            String nameSnapshot,
            String studentIdSnapshot,
            String roleSnapshot,
            String userStatusSnapshot,
            String avatarUrlSnapshot
    ) {
        String rawToken = generateRawToken();
        VerificationGrant grant = new VerificationGrant();
        grant.setPurpose(purpose);
        grant.setSubject(subject);
        grant.setTokenHash(hashToken(rawToken));
        grant.setNameSnapshot(nameSnapshot);
        grant.setStudentIdSnapshot(studentIdSnapshot);
        grant.setRoleSnapshot(roleSnapshot);
        grant.setUserStatusSnapshot(userStatusSnapshot);
        grant.setAvatarUrlSnapshot(avatarUrlSnapshot);
        grant.setCreatedAt(LocalDateTime.now());
        grant.setExpiresAt(LocalDateTime.now().plusSeconds(VERIFICATION_GRANT_TTL_SECONDS));
        verificationGrantRepository.save(grant);

        return new VerificationTokenIssue(rawToken, VERIFICATION_GRANT_TTL_SECONDS);
    }

    @Transactional
    private VerificationGrant consumeVerificationGrant(String verificationToken, String requiredPurpose) {
        if (verificationToken == null || verificationToken.trim().isEmpty()) {
            throw new RuntimeException("verification token required");
        }

        String tokenHash = hashToken(verificationToken.trim());
        VerificationGrant grant = verificationGrantRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new RuntimeException("invalid verification token"));

        if (!requiredPurpose.equals(grant.getPurpose())) {
            throw new RuntimeException("invalid verification token");
        }

        if (grant.getUsedAt() != null) {
            throw new RuntimeException("verification token");
        }

        if (grant.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("verification token");
        }

        grant.setUsedAt(LocalDateTime.now());
        verificationGrantRepository.save(grant);
        return grant;
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("unable to hash verification token", e);
        }
    }

    private record VerificationTokenIssue(String token, Long expiresInSeconds) {}

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


package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.attendance.AdminAttendanceStatusResponse;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceHistoryItem;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceHistoryTargetItem;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceStartResponse;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceTargetInfo;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceTargetStatus;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceValidationException;
import kr.co.devsign.devsign_backend.dto.attendance.CheckInResponse;
import kr.co.devsign.devsign_backend.dto.attendance.MemberAttendanceStatusResponse;
import kr.co.devsign.devsign_backend.entity.AttendanceRecord;
import kr.co.devsign.devsign_backend.entity.AttendanceSession;
import kr.co.devsign.devsign_backend.entity.AttendanceTarget;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.AttendanceRecordRepository;
import kr.co.devsign.devsign_backend.repository.AttendanceSessionRepository;
import kr.co.devsign.devsign_backend.repository.AttendanceTargetRepository;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_CLOSED = "CLOSED";
    private static final int DURATION_SECONDS = 600;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String WHITE_CHECK_MARK = "✅"; // ✅

    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceTargetRepository targetRepository;
    private final AttendanceRecordRepository recordRepository;
    private final MemberRepository memberRepository;
    private final DiscordBotClient discordBotClient;

    // ✨ [신규] 디스코드 메시지 ID를 받아, 그 메시지에 ✅ 반응을 남긴 사람들을 대상자로 출석을 시작.
    // 엑셀 업로드와 달리 "반응"은 관리자가 직접 정리한 공식 명단이 아니라 자연스러운 사용자 행동이므로
    // (동아리원이 아닌 사람이 실수로 반응했거나, 아직 웹사이트에 가입하지 않은 경우가 있을 수 있음)
    // 엑셀처럼 한 명이라도 문제 있으면 전체를 막지 않고, 매칭 안 되는 사람만 제외하고 시작한 뒤
    // 제외된 목록을 응답에 담아 관리자에게 안내한다.
    public AttendanceStartResponse startSessionFromDiscordMessage(String messageId, String adminLoginId) {
        Optional<AttendanceSession> currentOpt = sessionRepository.findTopByOrderByIdDesc();
        currentOpt.ifPresent(this::autoCloseIfExpired);
        if (currentOpt.isPresent() && STATUS_ACTIVE.equals(currentOpt.get().getStatus())) {
            throw new AttendanceValidationException("이미 진행 중인 출석이 있습니다. 먼저 종료해주세요.");
        }
        if (!StringUtils.hasText(messageId)) {
            throw new AttendanceValidationException("디스코드 메시지 ID를 입력해주세요.");
        }

        Map<String, Object> result;
        try {
            result = discordBotClient.getMessageReactors(messageId.trim(), WHITE_CHECK_MARK);
        } catch (Exception e) {
            throw new AttendanceValidationException("디스코드 봇과 통신할 수 없습니다: " + e.getMessage());
        }

        String status = String.valueOf(result.get("status"));
        if (!"success".equals(status)) {
            String message = result.get("message") != null ? result.get("message").toString() : "메시지에서 반응자를 가져오지 못했습니다.";
            throw new AttendanceValidationException(message);
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> reactors = (List<Map<String, Object>>) result.getOrDefault("members", List.of());

        Map<String, Member> validMembers = new LinkedHashMap<>();
        List<String> skipped = new ArrayList<>();
        for (Map<String, Object> reactor : reactors) {
            Object tagObj = reactor.get("discordTag");
            String discordTag = tagObj != null ? tagObj.toString() : null;
            if (!StringUtils.hasText(discordTag)) continue;

            Optional<Member> memberOpt = memberRepository.findByDiscordTag(discordTag);
            if (memberOpt.isEmpty() || memberOpt.get().isDeleted()) {
                skipped.add(discordTag);
                continue;
            }
            validMembers.put(memberOpt.get().getLoginId(), memberOpt.get());
        }

        if (validMembers.isEmpty()) {
            throw new AttendanceValidationException("해당 메시지에 ✅ 반응을 남긴 사람 중 웹사이트 회원으로 확인된 대상자가 없습니다.");
        }

        String title = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + " 총회 출석 (디스코드)";
        return createSession(validMembers, adminLoginId, title, skipped);
    }

    private AttendanceStartResponse createSession(Map<String, Member> validMembers, String adminLoginId, String title, List<String> skippedReactors) {
        AttendanceSession session = new AttendanceSession();
        session.setCode(String.valueOf(100 + RANDOM.nextInt(900)));
        session.setStatus(STATUS_ACTIVE);
        session.setTitle(title);
        session.setCreatedBy(adminLoginId);
        session.setStartedAt(LocalDateTime.now());
        session.setDurationSeconds(DURATION_SECONDS);
        session = sessionRepository.save(session);

        List<AttendanceTargetInfo> targetInfos = new ArrayList<>();
        List<AttendanceTarget> targets = new ArrayList<>();
        for (Member m : validMembers.values()) {
            AttendanceTarget target = new AttendanceTarget();
            target.setSession(session);
            target.setLoginId(m.getLoginId());
            target.setName(m.getName());
            target.setStudentId(m.getStudentId());
            target.setDept(m.getDept());
            target.setProfileImage(m.getProfileImage());
            targets.add(target);
            targetInfos.add(new AttendanceTargetInfo(m.getLoginId(), m.getName(), m.getStudentId(), m.getDept(), m.getProfileImage()));
        }
        targetRepository.saveAll(targets);

        return new AttendanceStartResponse(session.getId(), session.getCode(), session.getStartedAt(), session.getDurationSeconds(), targetInfos, skippedReactors);
    }

    public AdminAttendanceStatusResponse getAdminStatus() {
        Optional<AttendanceSession> sessionOpt = sessionRepository.findTopByOrderByIdDesc();
        if (sessionOpt.isEmpty()) {
            return AdminAttendanceStatusResponse.empty();
        }
        AttendanceSession session = sessionOpt.get();
        autoCloseIfExpired(session);

        List<AttendanceTarget> targets = targetRepository.findBySession_Id(session.getId());
        List<AttendanceRecord> records = recordRepository.findBySession_Id(session.getId());
        Map<String, LocalDateTime> checkedMap = records.stream()
                .collect(Collectors.toMap(AttendanceRecord::getLoginId, AttendanceRecord::getCheckedInAt, (a, b) -> a));

        List<AttendanceTargetStatus> targetStatuses = targets.stream()
                .map(t -> new AttendanceTargetStatus(
                        t.getLoginId(),
                        t.getName(),
                        t.getStudentId(),
                        t.getDept(),
                        t.getProfileImage(),
                        checkedMap.containsKey(t.getLoginId()),
                        checkedMap.get(t.getLoginId())
                ))
                .toList();

        int remaining = 0;
        if (STATUS_ACTIVE.equals(session.getStatus()) && session.getStartedAt() != null) {
            long elapsed = java.time.Duration.between(session.getStartedAt(), LocalDateTime.now()).getSeconds();
            remaining = (int) Math.max(0, session.getDurationSeconds() - elapsed);
        }

        return new AdminAttendanceStatusResponse(
                session.getId(),
                session.getCode(),
                session.getStatus(),
                session.getStartedAt(),
                remaining,
                checkedMap.size(),
                targets.size(),
                targetStatuses
        );
    }

    public void closeSession(Long sessionId) {
        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("출석 세션을 찾을 수 없습니다."));
        if (!STATUS_ACTIVE.equals(session.getStatus())) {
            return;
        }
        session.setStatus(STATUS_CLOSED);
        session.setClosedAt(LocalDateTime.now());
        sessionRepository.save(session);
    }

    public MemberAttendanceStatusResponse getMemberStatus(String loginId) {
        Optional<AttendanceSession> sessionOpt = sessionRepository.findTopByOrderByIdDesc();
        if (sessionOpt.isEmpty()) {
            return MemberAttendanceStatusResponse.inactive();
        }
        AttendanceSession session = sessionOpt.get();
        autoCloseIfExpired(session);
        if (!STATUS_ACTIVE.equals(session.getStatus())) {
            return MemberAttendanceStatusResponse.inactive();
        }

        List<AttendanceTarget> targets = targetRepository.findBySession_Id(session.getId());
        boolean isTarget = targets.stream().anyMatch(t -> t.getLoginId().equals(loginId));
        boolean alreadyChecked = isTarget && recordRepository.existsBySession_IdAndLoginId(session.getId(), loginId);
        int checkedCount = recordRepository.findBySession_Id(session.getId()).size();

        return new MemberAttendanceStatusResponse(true, isTarget, alreadyChecked, checkedCount, targets.size());
    }

    public CheckInResponse checkIn(String loginId, String code) {
        Optional<AttendanceSession> sessionOpt = sessionRepository.findTopByOrderByIdDesc();
        if (sessionOpt.isEmpty()) {
            return new CheckInResponse("no_active_session", "진행 중인 출석이 없습니다.");
        }
        AttendanceSession session = sessionOpt.get();
        boolean wasActive = STATUS_ACTIVE.equals(session.getStatus());
        autoCloseIfExpired(session);
        if (!STATUS_ACTIVE.equals(session.getStatus())) {
            if (wasActive) {
                return new CheckInResponse("expired", "출석 인증 시간이 종료되었습니다.");
            }
            return new CheckInResponse("no_active_session", "진행 중인 출석이 없습니다.");
        }

        Optional<AttendanceTarget> targetOpt = targetRepository.findBySession_IdAndLoginId(session.getId(), loginId);
        if (targetOpt.isEmpty()) {
            return new CheckInResponse("not_target", "이번 출석 대상자가 아닙니다.");
        }
        if (!session.getCode().equals(code)) {
            return new CheckInResponse("wrong_code", "인증번호가 올바르지 않습니다.");
        }
        if (recordRepository.existsBySession_IdAndLoginId(session.getId(), loginId)) {
            return new CheckInResponse("already_checked", "이미 출석 처리되었습니다.");
        }

        AttendanceRecord record = new AttendanceRecord();
        record.setSession(session);
        record.setLoginId(loginId);
        record.setCheckedInAt(LocalDateTime.now());
        recordRepository.save(record);

        return new CheckInResponse("success", "출석 처리되었습니다.");
    }

    // ✨ 관리자가 지각자 등을 수기로 출석/미출석 처리 — 세션이 이미 CLOSED여도 동작함
    // (자동 만료·수동 종료 이후에도 관리자가 직접 정정할 수 있어야 하므로 상태를 가리지 않음)
    // deleteBySession_IdAndLoginId가 파생 delete 쿼리라 트랜잭션 밖에서 호출하면
    // TransactionRequiredException이 발생하므로 @Transactional 필요 (TeamService의 기존 관례와 동일)
    @Transactional
    public void setManualAttendance(Long sessionId, String loginId, boolean checkedIn) {
        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("출석 세션을 찾을 수 없습니다."));
        AttendanceTarget target = targetRepository.findBySession_IdAndLoginId(sessionId, loginId)
                .orElseThrow(() -> new IllegalArgumentException("이 세션의 출석 대상자가 아닙니다."));

        boolean exists = recordRepository.existsBySession_IdAndLoginId(sessionId, loginId);
        if (checkedIn && !exists) {
            AttendanceRecord record = new AttendanceRecord();
            record.setSession(session);
            record.setLoginId(target.getLoginId());
            record.setCheckedInAt(LocalDateTime.now());
            recordRepository.save(record);
        } else if (!checkedIn && exists) {
            recordRepository.deleteBySession_IdAndLoginId(sessionId, loginId);
        }
    }

    // ✨ 이력에서 세션 자체를 완전히 삭제 — 진행 중인(ACTIVE) 세션은 이력 목록에 애초에 노출되지
    // 않지만, 방어적으로 한 번 더 막는다. 연관된 target/record부터 지운 뒤 세션을 지운다
    // (FK 제약 순서), 파생 delete 쿼리라 @Transactional 필요.
    @Transactional
    public void deleteHistorySession(Long sessionId) {
        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("출석 세션을 찾을 수 없습니다."));
        if (STATUS_ACTIVE.equals(session.getStatus())) {
            throw new IllegalArgumentException("진행 중인 출석은 삭제할 수 없습니다. 먼저 종료해주세요.");
        }
        recordRepository.deleteBySession_Id(sessionId);
        targetRepository.deleteBySession_Id(sessionId);
        sessionRepository.delete(session);
    }

    public List<AttendanceHistoryItem> getHistory() {
        List<AttendanceSession> sessions = sessionRepository.findByStatusOrderByStartedAtDesc(STATUS_CLOSED);
        List<AttendanceHistoryItem> items = new ArrayList<>();
        for (AttendanceSession session : sessions) {
            List<AttendanceTarget> targets = targetRepository.findBySession_Id(session.getId());
            Set<String> checkedLoginIds = recordRepository.findBySession_Id(session.getId()).stream()
                    .map(AttendanceRecord::getLoginId)
                    .collect(Collectors.toSet());

            List<AttendanceHistoryTargetItem> targetItems = targets.stream()
                    .map(t -> new AttendanceHistoryTargetItem(t.getLoginId(), t.getName(), t.getStudentId(), t.getDept(), t.getProfileImage(), checkedLoginIds.contains(t.getLoginId())))
                    .toList();

            items.add(new AttendanceHistoryItem(
                    session.getId(),
                    session.getTitle(),
                    session.getStartedAt(),
                    session.getClosedAt(),
                    checkedLoginIds.size(),
                    targets.size(),
                    targetItems
            ));
        }
        return items;
    }

    public ResponseEntity<byte[]> downloadHistoryExcel(Long sessionId) {
        AttendanceSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new byte[0]);
        }

        List<AttendanceTarget> targets = targetRepository.findBySession_Id(sessionId);
        Map<String, LocalDateTime> checkedMap = recordRepository.findBySession_Id(sessionId).stream()
                .collect(Collectors.toMap(AttendanceRecord::getLoginId, AttendanceRecord::getCheckedInAt, (a, b) -> a));

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("출석");

            Font boldFont = workbook.createFont();
            boldFont.setBold(true);
            XSSFCellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(boldFont);

            Row header = sheet.createRow(0);
            String[] headers = {"이름", "학번", "학과", "출석여부", "체크시각"};
            for (int i = 0; i < headers.length; i++) {
                var cell = header.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (AttendanceTarget target : targets) {
                LocalDateTime checkedAt = checkedMap.get(target.getLoginId());
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(target.getName());
                row.createCell(1).setCellValue(target.getStudentId());
                row.createCell(2).setCellValue(target.getDept());
                row.createCell(3).setCellValue(checkedAt != null ? "출석" : "미출석");
                row.createCell(4).setCellValue(checkedAt != null ? checkedAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(buffer);

            String fileName = (StringUtils.hasText(session.getTitle()) ? session.getTitle() : "출석") + ".xlsx";
            HttpHeaders responseHeaders = new HttpHeaders();
            responseHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            responseHeaders.setContentDisposition(ContentDisposition.attachment()
                    .filename(fileName, StandardCharsets.UTF_8)
                    .build());

            return new ResponseEntity<>(buffer.toByteArray(), responseHeaders, HttpStatus.OK);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(new byte[0]);
        }
    }

    private void autoCloseIfExpired(AttendanceSession session) {
        if (STATUS_ACTIVE.equals(session.getStatus()) && session.getStartedAt() != null) {
            LocalDateTime expiresAt = session.getStartedAt().plusSeconds(session.getDurationSeconds());
            if (LocalDateTime.now().isAfter(expiresAt)) {
                session.setStatus(STATUS_CLOSED);
                session.setClosedAt(expiresAt);
                sessionRepository.save(session);
            }
        }
    }

}

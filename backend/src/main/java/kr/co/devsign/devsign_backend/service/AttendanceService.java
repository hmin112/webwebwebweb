package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.attendance.AdminAttendanceStatusResponse;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceHistoryItem;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceHistoryTargetItem;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceProblem;
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
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
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
    // ✨ 엑셀 셀을 화면에 보이는 그대로(텍스트)로 읽기 위한 포맷터 — 학번 등 숫자로 자동 인식된 셀도
    // "20233088.0" 같은 형태 없이 그대로 텍스트로 변환됨
    private static final DataFormatter DATA_FORMATTER = new DataFormatter();

    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceTargetRepository targetRepository;
    private final AttendanceRecordRepository recordRepository;
    private final MemberRepository memberRepository;

    public AttendanceStartResponse startSession(MultipartFile file, String adminLoginId) {
        Optional<AttendanceSession> currentOpt = sessionRepository.findTopByOrderByIdDesc();
        currentOpt.ifPresent(this::autoCloseIfExpired);
        if (currentOpt.isPresent() && STATUS_ACTIVE.equals(currentOpt.get().getStatus())) {
            throw new AttendanceValidationException("이미 진행 중인 출석이 있습니다. 먼저 종료해주세요.", List.of());
        }

        List<AttendanceProblem> problems = new ArrayList<>();
        Map<String, Member> validMembers = new LinkedHashMap<>();

        try (InputStream is = file.getInputStream(); XSSFWorkbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            int nameCol = 0;
            int studentIdCol = 1;
            int deptCol = 2;

            Row header = sheet.getRow(sheet.getFirstRowNum());
            if (header != null) {
                for (Cell cell : header) {
                    String value = cellToString(cell).trim();
                    if ("이름".equals(value)) nameCol = cell.getColumnIndex();
                    if ("학번".equals(value)) studentIdCol = cell.getColumnIndex();
                    if ("학과".equals(value)) deptCol = cell.getColumnIndex();
                }
            }

            for (int r = sheet.getFirstRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowBlank(row)) continue;

                String name = cellToString(row.getCell(nameCol)).trim();
                // 엑셀의 학번은 8자리 전체 학번(예: 20223203) — 사이트 Member.studentId는 디스코드
                // 닉네임에서 파싱된 2자리 입학연도 코드(예: "22")만 저장하므로, 8자리 중 3~4번째
                // 문자를 잘라 비교한다 (CommunityTab/TeamTab의 formatStudentId와 동일한 규칙).
                String fullStudentId = cellToString(row.getCell(studentIdCol)).trim();
                String dept = cellToString(row.getCell(deptCol)).trim();
                int excelRowNum = row.getRowNum() + 1;
                String displayName = StringUtils.hasText(name) ? name : "(이름 없음)";

                if (!StringUtils.hasText(fullStudentId)) {
                    problems.add(new AttendanceProblem(excelRowNum, displayName, "학번 없음"));
                    continue;
                }
                if (!StringUtils.hasText(dept)) {
                    problems.add(new AttendanceProblem(excelRowNum, displayName, "학과 없음"));
                    continue;
                }

                String yearCode;
                if (fullStudentId.length() == 8) {
                    yearCode = fullStudentId.substring(2, 4);
                } else if (fullStudentId.length() == 2) {
                    yearCode = fullStudentId;
                } else {
                    problems.add(new AttendanceProblem(excelRowNum, displayName, "학번 형식을 확인할 수 없음 (" + fullStudentId + ")"));
                    continue;
                }

                List<Member> candidates = memberRepository.findByNameStartingWithAndStudentIdAndDeletedFalse(name, yearCode);
                if (candidates.isEmpty()) {
                    problems.add(new AttendanceProblem(excelRowNum, displayName, "일치하는 회원 없음 (이름·학번 확인 필요, " + yearCode + "학번)"));
                    continue;
                }

                Member matched;
                if (candidates.size() == 1) {
                    // 이름+학번(입학연도)만으로 이미 유일하게 특정됨. DB의 학과는 정식 명칭
                    // ("AI소프트웨어학부(컴퓨터공학전공)")으로, 엑셀의 약칭("컴공")과 표기가
                    // 달라 문자열이 정확히 일치하지 않는 게 정상이므로 여기서는 막지 않는다.
                    matched = candidates.get(0);
                } else {
                    // 동명이인(같은 이름+같은 학번)이 여러 명 있는 경우에만 학과로 특정 시도
                    List<Member> byDept = candidates.stream()
                            .filter(m -> StringUtils.hasText(m.getDept()) && (m.getDept().contains(dept) || dept.contains(m.getDept())))
                            .toList();
                    if (byDept.size() != 1) {
                        problems.add(new AttendanceProblem(excelRowNum, displayName,
                                "동명이인이 있어 학과로도 특정할 수 없음 (관리자 확인 필요)"));
                        continue;
                    }
                    matched = byDept.get(0);
                }

                validMembers.put(matched.getLoginId(), matched);
            }
        } catch (IOException e) {
            throw new AttendanceValidationException("엑셀 파일을 읽을 수 없습니다. .xlsx 형식인지 확인해주세요.", List.of());
        }

        if (!problems.isEmpty()) {
            throw new AttendanceValidationException(problems.size() + "명의 대상자에 문제가 있어 출석을 시작할 수 없습니다.", problems);
        }
        if (validMembers.isEmpty()) {
            throw new AttendanceValidationException("엑셀에서 유효한 대상자를 찾을 수 없습니다.", List.of());
        }

        AttendanceSession session = new AttendanceSession();
        session.setCode(String.valueOf(100 + RANDOM.nextInt(900)));
        session.setStatus(STATUS_ACTIVE);
        session.setTitle(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + " 총회 출석");
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

        return new AttendanceStartResponse(session.getId(), session.getCode(), session.getStartedAt(), session.getDurationSeconds(), targetInfos);
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

    private boolean isRowBlank(Row row) {
        for (Cell cell : row) {
            if (StringUtils.hasText(cellToString(cell))) {
                return false;
            }
        }
        return true;
    }

    private String cellToString(Cell cell) {
        if (cell == null) return "";
        // 엑셀에 보이는 그대로 텍스트로 변환 (학번처럼 숫자로 자동 인식된 셀도 "20233088.0" 없이
        // 정수 텍스트 그대로 읽힘)
        return DATA_FORMATTER.formatCellValue(cell).trim();
    }
}

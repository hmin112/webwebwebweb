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
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
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
            int idCol = 1;

            Row header = sheet.getRow(sheet.getFirstRowNum());
            if (header != null) {
                for (Cell cell : header) {
                    String value = cellToString(cell).trim();
                    if ("이름".equals(value)) nameCol = cell.getColumnIndex();
                    if ("아이디".equals(value)) idCol = cell.getColumnIndex();
                }
            }

            for (int r = sheet.getFirstRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowBlank(row)) continue;

                String name = cellToString(row.getCell(nameCol)).trim();
                // 엑셀의 "아이디" 컬럼은 웹사이트 로그인 아이디가 아니라 디스코드 태그(예: hmin112, 22tank)다.
                // 실제 확인: DB에서 discord_tag='hmin112'인 회원의 login_id는 'gudals'였음.
                String discordTag = cellToString(row.getCell(idCol)).trim();
                int excelRowNum = row.getRowNum() + 1;

                if (!StringUtils.hasText(discordTag)) {
                    problems.add(new AttendanceProblem(excelRowNum, StringUtils.hasText(name) ? name : "(이름 없음)", "디스코드 태그 없음"));
                    continue;
                }

                Optional<Member> memberOpt = memberRepository.findByDiscordTagAndDeletedFalse(discordTag);
                if (memberOpt.isEmpty()) {
                    problems.add(new AttendanceProblem(excelRowNum, StringUtils.hasText(name) ? name : discordTag, "가입되지 않은 디스코드 태그 (" + discordTag + ")"));
                    continue;
                }

                validMembers.put(memberOpt.get().getLoginId(), memberOpt.get());
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
            target.setProfileImage(m.getProfileImage());
            targets.add(target);
            targetInfos.add(new AttendanceTargetInfo(m.getLoginId(), m.getName(), m.getStudentId(), m.getProfileImage()));
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

    public List<AttendanceHistoryItem> getHistory() {
        List<AttendanceSession> sessions = sessionRepository.findByStatusOrderByStartedAtDesc(STATUS_CLOSED);
        List<AttendanceHistoryItem> items = new ArrayList<>();
        for (AttendanceSession session : sessions) {
            List<AttendanceTarget> targets = targetRepository.findBySession_Id(session.getId());
            Set<String> checkedLoginIds = recordRepository.findBySession_Id(session.getId()).stream()
                    .map(AttendanceRecord::getLoginId)
                    .collect(Collectors.toSet());

            List<AttendanceHistoryTargetItem> targetItems = targets.stream()
                    .map(t -> new AttendanceHistoryTargetItem(t.getName(), t.getStudentId(), t.getProfileImage(), checkedLoginIds.contains(t.getLoginId())))
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
        if (cell.getCellType() == CellType.STRING) {
            return cell.getStringCellValue();
        }
        if (cell.getCellType() == CellType.NUMERIC) {
            double value = cell.getNumericCellValue();
            if (value == Math.floor(value) && !Double.isInfinite(value)) {
                return String.valueOf((long) value);
            }
            return String.valueOf(value);
        }
        if (cell.getCellType() == CellType.BOOLEAN) {
            return String.valueOf(cell.getBooleanCellValue());
        }
        if (cell.getCellType() == CellType.FORMULA) {
            try {
                return cell.getStringCellValue();
            } catch (Exception e) {
                return "";
            }
        }
        return "";
    }
}

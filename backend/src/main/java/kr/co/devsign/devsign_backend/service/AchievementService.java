package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.achievement.AchievementDtos.*;
import kr.co.devsign.devsign_backend.entity.*;
import kr.co.devsign.devsign_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

// ✨ [2026-10-05 신규] 관리자 "실적" — 해마다 대회·총회·교육·행사와 그 파일을 모아 두고 폴더 구조 그대로 압축해 내려준다.
@Service
@RequiredArgsConstructor
public class AchievementService {

    public static final Map<String, String> TYPE_LABEL = new LinkedHashMap<>();
    public static final Map<String, String> CATEGORY_LABEL = new LinkedHashMap<>();

    static {
        TYPE_LABEL.put("COMPETITION", "대회");
        TYPE_LABEL.put("ASSEMBLY", "총회");
        TYPE_LABEL.put("EDUCATION", "교육");
        TYPE_LABEL.put("EVENT", "행사");
        CATEGORY_LABEL.put("CERTIFICATE", "상장");
        CATEGORY_LABEL.put("PLAN", "기획서");
        CATEGORY_LABEL.put("RESULT", "결과물");
        CATEGORY_LABEL.put("PHOTO", "사진");
        CATEGORY_LABEL.put("ETC", "기타");
    }

    private static final long MAX_FILE_BYTES = 500L * 1024 * 1024;
    private static final Set<String> IMAGE_EXT = Set.of("jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp");
    private static final DateTimeFormatter DOT = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    private final AchievementRepository achievementRepository;
    private final AchievementFileRepository fileRepository;
    private final AchievementEntryRepository entryRepository;
    private final MemberRepository memberRepository;
    private final HallOfFameRepository hallOfFameRepository;
    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceTargetRepository targetRepository;
    private final AttendanceRecordRepository recordRepository;
    private final AttendanceService attendanceService;
    private final DiscordBotClient discordBotClient;

    @Value("${app.achievement.base-dir:achievement-data}")
    private String baseDir;

    @Value("${app.upload.base-dir:uploads}")
    private String uploadBaseDir;

    private Path base() {
        return Paths.get(baseDir).toAbsolutePath().normalize();
    }

    private Path resolve(String rel) {
        Path p = base().resolve(rel).normalize();
        if (!p.startsWith(base())) throw new IllegalArgumentException("잘못된 경로");
        return p;
    }

    // ---------- 조회 ----------

    public List<YearCount> years() {
        Map<Integer, Long> counts = new TreeMap<>(Comparator.reverseOrder());
        for (Object[] row : achievementRepository.countByYear()) counts.put((Integer) row[0], (Long) row[1]);
        // 명예의 전당에만 있는 해도 보여준다 (열면 자동으로 들어온다)
        for (HallOfFame h : hallOfFameRepository.findAll()) {
            Integer y = hofYear(h);
            if (y != null) counts.putIfAbsent(y, 0L);
        }
        counts.putIfAbsent(LocalDate.now().getYear(), 0L);
        return counts.entrySet().stream().map(e -> new YearCount(e.getKey(), e.getValue())).toList();
    }

    @Transactional
    public List<AchievementDto> list(int year, String loginId) {
        syncHallOfFame(year, loginId);
        List<Achievement> list = achievementRepository.findByYearAndDeletedFalseOrderByStartDateAscIdAsc(year);
        return toDtos(list);
    }

    @Transactional(readOnly = true)
    public AchievementDto get(Long id) {
        return toDtos(List.of(find(id))).get(0);
    }

    private Achievement find(Long id) {
        return achievementRepository.findById(id).filter(a -> !a.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("실적을 찾을 수 없어요."));
    }

    private List<AchievementDto> toDtos(List<Achievement> list) {
        if (list.isEmpty()) return List.of();
        Map<Long, List<AchievementFile>> filesByAchievement = fileRepository
                .findByAchievementIdInOrderByIdAsc(list.stream().map(Achievement::getId).toList())
                .stream().collect(Collectors.groupingBy(AchievementFile::getAchievementId));
        Set<Long> hofIds = hallOfFameRepository.findAll().stream().map(HallOfFame::getId).collect(Collectors.toSet());

        List<AchievementDto> out = new ArrayList<>();
        for (Achievement a : list) {
            List<AchievementFile> files = filesByAchievement.getOrDefault(a.getId(), List.of());
            Map<Long, List<FileDto>> byEntry = new HashMap<>();
            List<FileDto> recordFiles = new ArrayList<>();
            for (AchievementFile f : files) {
                FileDto dto = toFileDto(f);
                if (f.getEntryId() == null) recordFiles.add(dto);
                else byEntry.computeIfAbsent(f.getEntryId(), k -> new ArrayList<>()).add(dto);
            }
            List<EntryDto> entries = a.getEntries().stream().map(e -> new EntryDto(e.getId(), e.getName(), e.getAward(),
                    e.getMembers().stream().map(m -> new MemberRef(m.getLoginId(), m.getName(), m.getStudentId())).toList(),
                    byEntry.getOrDefault(e.getId(), List.of()))).toList();
            out.add(new AchievementDto(a.getId(), a.getYear(), a.getType(), a.getTitle(),
                    fmt(a.getStartDate()), fmt(a.getEndDate()), a.getOrganizer(), a.getMemo(),
                    a.getHallOfFameId(), a.getHallOfFameId() != null && hofIds.contains(a.getHallOfFameId()),
                    attendance(a.getAttendanceSessionId()), entries, recordFiles,
                    a.getParticipants().stream().map(m -> new MemberRef(m.getLoginId(), m.getName(), m.getStudentId())).toList(),
                    a.getSourceUrl(), a.getDiscordMessageId() != null,
                    a.getUpdatedAt() == null ? null : a.getUpdatedAt().toString()));
        }
        return out;
    }

    private FileDto toFileDto(AchievementFile f) {
        return new FileDto(f.getId(), f.getEntryId(), f.getCategory(), f.getOriginalName(), f.getSize(),
                f.getContentType(), isImage(f.getOriginalName(), f.getContentType()), f.getThumbPath() != null,
                f.getUploadedAt() == null ? null : f.getUploadedAt().toString());
    }

    private AttendanceDto attendance(Long sessionId) {
        if (sessionId == null) return null;
        AttendanceSession s = sessionRepository.findById(sessionId).orElse(null);
        if (s == null) return null;
        List<AttendanceTarget> targets = targetRepository.findBySession_Id(sessionId);
        Set<String> checked = recordRepository.findBySession_Id(sessionId).stream()
                .map(AttendanceRecord::getLoginId).collect(Collectors.toSet());
        List<String> attendees = targets.stream().filter(t -> checked.contains(t.getLoginId()))
                .map(t -> shortId(t.getStudentId()) + t.getName()).toList();
        return new AttendanceDto(s.getId(), s.getTitle(), s.getStartedAt() == null ? null : s.getStartedAt().toString(),
                attendees.size(), targets.size(), attendees);
    }

    // 그해 출석 기록 — 총회·교육에 연결할 후보
    public List<SessionOption> sessions(int year) {
        Map<Long, Long> linked = new HashMap<>();
        for (Achievement a : achievementRepository.findAll()) {
            if (!a.isDeleted() && a.getAttendanceSessionId() != null) linked.put(a.getAttendanceSessionId(), a.getId());
        }
        return sessionRepository.findAll().stream()
                .filter(s -> s.getStartedAt() != null && s.getStartedAt().getYear() == year)
                .sorted(Comparator.comparing(AttendanceSession::getStartedAt).reversed())
                .map(s -> {
                    List<AttendanceTarget> targets = targetRepository.findBySession_Id(s.getId());
                    int checked = recordRepository.findBySession_Id(s.getId()).size();
                    return new SessionOption(s.getId(), s.getTitle(), s.getStartedAt().toString(), checked, targets.size(),
                            linked.get(s.getId()));
                }).toList();
    }

    // ---------- 실적 저장 ----------

    @Transactional
    public AchievementDto create(SaveRequest req, String loginId) {
        Achievement a = new Achievement();
        a.setCreatedBy(loginId);
        apply(a, req);
        // 총회·교육은 날짜에 맞는 출석 기록을 알아서 붙인다 (나중에 바꿀 수 있음)
        if (a.getAttendanceSessionId() == null && !"COMPETITION".equals(a.getType()) && a.getStartDate() != null) {
            a.setAttendanceSessionId(guessSession(a));
        }
        achievementRepository.save(a);
        return get(a.getId());
    }

    @Transactional
    public AchievementDto update(Long id, SaveRequest req) {
        Achievement a = find(id);
        apply(a, req);
        a.setUpdatedAt(LocalDateTime.now());
        achievementRepository.save(a);
        return get(a.getId());
    }

    private void apply(Achievement a, SaveRequest req) {
        String type = req.type() == null ? "COMPETITION" : req.type().toUpperCase(Locale.ROOT);
        if (!TYPE_LABEL.containsKey(type)) throw new IllegalArgumentException("구분을 골라주세요.");
        String title = req.title() == null ? "" : req.title().trim();
        if (title.isEmpty()) throw new IllegalArgumentException("이름을 입력해주세요.");
        LocalDate start = parseDate(req.startDate());
        LocalDate end = parseDate(req.endDate());
        if (start != null && end != null && end.isBefore(start)) throw new IllegalArgumentException("끝나는 날이 시작일보다 빨라요.");
        a.setType(type);
        a.setTitle(title.length() > 200 ? title.substring(0, 200) : title);
        a.setStartDate(start);
        a.setEndDate(end != null && end.equals(start) ? null : end);
        a.setOrganizer(blankToNull(req.organizer()));
        a.setMemo(blankToNull(req.memo()));
        a.setAttendanceSessionId("COMPETITION".equals(type) ? null : req.attendanceSessionId());
        int year = start != null ? start.getYear() : req.year() != null ? req.year() : LocalDate.now().getYear();
        a.setYear(year);
    }

    private Long guessSession(Achievement a) {
        YearMonth ym = YearMonth.from(a.getStartDate());
        Set<Long> used = achievementRepository.findAll().stream().map(Achievement::getAttendanceSessionId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        boolean assembly = "ASSEMBLY".equals(a.getType());
        return sessionRepository.findAll().stream()
                .filter(s -> s.getStartedAt() != null && YearMonth.from(s.getStartedAt()).equals(ym) && !used.contains(s.getId()))
                .min(Comparator
                        .comparing((AttendanceSession s) -> assembly && (s.getTitle() == null || !s.getTitle().contains("총회")))
                        .thenComparing(s -> Math.abs(s.getStartedAt().toLocalDate().toEpochDay() - a.getStartDate().toEpochDay())))
                .map(AttendanceSession::getId).orElse(null);
    }

    @Transactional
    public void delete(Long id) {
        Achievement a = find(id);
        for (AchievementFile f : fileRepository.findByAchievementIdOrderByIdAsc(id)) removeFile(f);
        if (a.getHallOfFameId() != null || a.getSourceKey() != null) {
            a.getEntries().clear();
            a.getParticipants().clear();
            a.setDeleted(true);
            a.setAttendanceSessionId(null);
            touch(a);
        } else {
            achievementRepository.delete(a);
        }
    }

    // ---------- 참가 팀/개인 ----------

    @Transactional
    public AchievementDto addEntry(Long achievementId, EntryRequest req) {
        Achievement a = find(achievementId);
        AchievementEntry e = new AchievementEntry();
        e.setAchievement(a);
        e.setSortOrder(a.getEntries().stream().mapToInt(AchievementEntry::getSortOrder).max().orElse(0) + 1);
        applyEntry(e, req);
        a.getEntries().add(e);
        touch(a);
        return get(a.getId());
    }

    @Transactional
    public AchievementDto updateEntry(Long entryId, EntryRequest req) {
        AchievementEntry e = findEntry(entryId);
        applyEntry(e, req);
        touch(e.getAchievement());
        return get(e.getAchievement().getId());
    }

    // 여러 명이 한 칸에 묶여 있으면 한 사람씩 나눈다 (상은 그대로, 파일은 첫 사람에게 남는다)
    @Transactional
    public AchievementDto splitEntry(Long entryId) {
        AchievementEntry e = findEntry(entryId);
        Achievement a = e.getAchievement();
        List<AchievementMember> members = new ArrayList<>(e.getMembers());
        if (members.size() < 2) return get(a.getId());
        e.setMembers(new ArrayList<>(List.of(members.get(0))));
        e.setName(null);
        int order = e.getSortOrder();
        for (AchievementEntry other : a.getEntries()) {
            if (other.getSortOrder() > order) other.setSortOrder(other.getSortOrder() + members.size() - 1);
        }
        for (int i = 1; i < members.size(); i++) {
            AchievementEntry n = new AchievementEntry();
            n.setAchievement(a);
            n.setAward(e.getAward());
            n.setSortOrder(order + i);
            n.setMembers(new ArrayList<>(List.of(members.get(i))));
            a.getEntries().add(n);
        }
        a.getEntries().sort(Comparator.comparingInt(AchievementEntry::getSortOrder));
        touch(a);
        return get(a.getId());
    }

    @Transactional
    public AchievementDto deleteEntry(Long entryId) {
        AchievementEntry e = findEntry(entryId);
        Achievement a = e.getAchievement();
        for (AchievementFile f : fileRepository.findByEntryId(entryId)) removeFile(f);
        a.getEntries().remove(e);
        touch(a);
        return get(a.getId());
    }

    private AchievementEntry findEntry(Long entryId) {
        return entryRepository.findById(entryId).orElseThrow(() -> new IllegalArgumentException("참가 팀을 찾을 수 없어요."));
    }

    private void applyEntry(AchievementEntry e, EntryRequest req) {
        e.setName(blankToNull(req.name()));
        e.setAward(blankToNull(req.award()));
        List<AchievementMember> members = resolveMembers(req.members());
        e.getMembers().clear();
        e.getMembers().addAll(members);
    }

    @Transactional
    public AchievementDto setParticipants(Long id, ParticipantsRequest req) {
        Achievement a = find(id);
        a.getParticipants().clear();
        a.getParticipants().addAll(resolveMembers(req.members()));
        touch(a);
        return get(a.getId());
    }

    // 부원은 지금 이름·학번으로 다시 채우고, 부원이 아닌 사람은 이름만
    private List<AchievementMember> resolveMembers(List<MemberRef> refs) {
        List<AchievementMember> members = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (MemberRef m : Optional.ofNullable(refs).orElse(List.of())) {
            if (m == null) continue;
            if (m.loginId() != null && !m.loginId().isBlank()) {
                if (!seen.add(m.loginId())) continue;
                Member member = memberRepository.findByLoginId(m.loginId()).orElse(null);
                members.add(member != null
                        ? new AchievementMember(member.getLoginId(), plainName(member.getName()), member.getStudentId())
                        : new AchievementMember(m.loginId(), m.name(), m.studentId()));
            } else if (m.name() != null && !m.name().isBlank()) {
                members.add(new AchievementMember(null, m.name().trim(), blankToNull(m.studentId())));
            }
        }
        return members;
    }

    // 새 참가 칸의 id가 바로 응답에 실리도록 즉시 반영한다
    private void touch(Achievement a) {
        a.setUpdatedAt(LocalDateTime.now());
        achievementRepository.saveAndFlush(a);
    }

    // ---------- 파일 ----------

    @Transactional
    public FileDto upload(Long achievementId, Long entryId, String category, MultipartFile file, MultipartFile thumb,
                          String loginId) throws IOException {
        Achievement a = find(achievementId);
        if (entryId != null && a.getEntries().stream().noneMatch(e -> e.getId().equals(entryId))) {
            throw new IllegalArgumentException("참가 팀을 찾을 수 없어요.");
        }
        String cat = category == null ? "ETC" : category.toUpperCase(Locale.ROOT);
        if (!CATEGORY_LABEL.containsKey(cat)) throw new IllegalArgumentException("파일 칸을 골라주세요.");
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("빈 파일이에요.");
        if (file.getSize() > MAX_FILE_BYTES) throw new IllegalArgumentException("파일 하나는 500MB까지 올릴 수 있어요.");

        String original = cleanName(Optional.ofNullable(file.getOriginalFilename()).orElse("file"));
        String ext = ext(original);
        String rel = "files/" + achievementId + "/" + UUID.randomUUID().toString().replace("-", "") + (ext.isEmpty() ? "" : "." + ext);
        Path dest = resolve(rel);
        Files.createDirectories(dest.getParent());
        file.transferTo(dest.toFile());

        AchievementFile f = new AchievementFile();
        f.setAchievementId(achievementId);
        f.setEntryId(entryId);
        f.setCategory(cat);
        f.setOriginalName(original);
        f.setStoredPath(rel);
        f.setSize(file.getSize());
        f.setContentType(file.getContentType());
        f.setUploadedBy(loginId);
        fileRepository.save(f);

        // 사진 미리보기 — 브라우저가 만든 작은 그림(사진 방향이 맞게 돌려진 것)을 같이 받아 둔다
        if (thumb != null && !thumb.isEmpty() && thumb.getSize() < 2 * 1024 * 1024) {
            String thumbRel = "thumbs/" + f.getId() + ".jpg";
            Path t = resolve(thumbRel);
            Files.createDirectories(t.getParent());
            thumb.transferTo(t.toFile());
            f.setThumbPath(thumbRel);
            fileRepository.save(f);
        }
        touch(a);
        return toFileDto(f);
    }

    @Transactional
    public FileDto moveFile(Long fileId, String category) {
        AchievementFile f = fileRepository.findById(fileId).orElseThrow(() -> new IllegalArgumentException("파일을 찾을 수 없어요."));
        String cat = category == null ? "" : category.toUpperCase(Locale.ROOT);
        if (!CATEGORY_LABEL.containsKey(cat)) throw new IllegalArgumentException("파일 칸을 골라주세요.");
        f.setCategory(cat);
        return toFileDto(fileRepository.save(f));
    }

    @Transactional
    public void deleteFile(Long fileId) {
        AchievementFile f = fileRepository.findById(fileId).orElseThrow(() -> new IllegalArgumentException("파일을 찾을 수 없어요."));
        removeFile(f);
    }

    private void removeFile(AchievementFile f) {
        try {
            Files.deleteIfExists(resolve(f.getStoredPath()));
            if (f.getThumbPath() != null) Files.deleteIfExists(resolve(f.getThumbPath()));
        } catch (Exception e) {
            System.err.println("실적 파일 삭제 실패: " + e.getMessage());
        }
        fileRepository.delete(f);
    }

    public AchievementFile fileMeta(Long fileId) {
        return fileRepository.findById(fileId).orElseThrow(() -> new IllegalArgumentException("파일을 찾을 수 없어요."));
    }

    public Path filePath(AchievementFile f) {
        return resolve(f.getStoredPath());
    }

    // 미리보기 — 받아 둔 게 없으면 서버에서 한 번 만들어 둔다 (못 읽는 형식이면 null)
    @Transactional
    public byte[] thumbnail(Long fileId) {
        AchievementFile f = fileMeta(fileId);
        try {
            if (f.getThumbPath() != null && Files.exists(resolve(f.getThumbPath()))) return Files.readAllBytes(resolve(f.getThumbPath()));
            if (!isImage(f.getOriginalName(), f.getContentType())) return null;
            BufferedImage src = ImageIO.read(resolve(f.getStoredPath()).toFile());
            if (src == null) return null;
            int w = Math.min(640, src.getWidth());
            int h = Math.max(1, (int) Math.round(src.getHeight() * (w / (double) src.getWidth())));
            BufferedImage dst = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = dst.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setColor(java.awt.Color.WHITE);
            g.fillRect(0, 0, w, h);
            g.drawImage(src, 0, 0, w, h, null);
            g.dispose();
            String thumbRel = "thumbs/" + f.getId() + ".jpg";
            Path t = resolve(thumbRel);
            Files.createDirectories(t.getParent());
            ImageIO.write(dst, "jpg", t.toFile());
            f.setThumbPath(thumbRel);
            fileRepository.save(f);
            return Files.readAllBytes(t);
        } catch (Exception e) {
            return null;
        }
    }

    // ---------- 명예의 전당 연동 ----------

    private Integer hofYear(HallOfFame h) {
        Matcher m = Pattern.compile("(\\d{4})").matcher(Optional.ofNullable(h.getDate()).orElse(""));
        if (m.find()) return Integer.parseInt(m.group(1));
        return h.getCreatedAt() == null ? null : h.getCreatedAt().getYear();
    }

    // 그해 명예의 전당 글 중 아직 실적에 없는 것을 대회로 넣는다 — 상·수상자·대표 사진까지
    private void syncHallOfFame(int year, String loginId) {
        Set<Long> imported = achievementRepository.findByHallOfFameIdNotNull().stream()
                .map(Achievement::getHallOfFameId).collect(Collectors.toSet());
        for (HallOfFame h : hallOfFameRepository.findAll()) {
            if (imported.contains(h.getId()) || !Objects.equals(hofYear(h), year)) continue;
            try {
                importHallOfFame(h, loginId);
            } catch (Exception e) {
                System.err.println("명예의 전당 가져오기 실패 #" + h.getId() + ": " + e.getMessage());
            }
        }
    }

    private void importHallOfFame(HallOfFame h, String loginId) {
        Achievement a = new Achievement();
        String[] range = Optional.ofNullable(h.getDate()).orElse("").split("\\s*[~〜]\\s*");
        LocalDate start = parseDate(range.length > 0 ? range[0] : null);
        LocalDate end = range.length > 1 ? parseDate(range[1]) : null;
        a.setType("COMPETITION");
        a.setTitle(firstNonBlank(h.getCompetitionName(), h.getTitle(), "명예의 전당 #" + h.getId()));
        a.setStartDate(start);
        a.setEndDate(end != null && start != null && !end.isAfter(start) ? null : end);
        a.setYear(start != null ? start.getYear() : hofYear(h));
        a.setMemo(blankToNull(h.getContent()));
        a.setHallOfFameId(h.getId());
        a.setCreatedBy(loginId);
        applyHofAwards(a, h);
        achievementRepository.save(a);
        copyHofImage(a, h, loginId);
    }

    // 명예의 전당의 상·수상자를 다시 맞춘다 — 같은 상 이름 칸이 있으면 사람만 바꾸고, 없으면 새로 만든다 (파일은 그대로)
    @Transactional
    public AchievementDto resyncHallOfFame(Long id) {
        Achievement a = find(id);
        if (a.getHallOfFameId() == null) throw new IllegalArgumentException("명예의 전당에서 온 실적이 아니에요.");
        HallOfFame h = hallOfFameRepository.findById(a.getHallOfFameId())
                .orElseThrow(() -> new IllegalArgumentException("명예의 전당 글이 지워졌어요."));
        applyHofAwards(a, h);
        touch(a);
        return get(a.getId());
    }

    private void applyHofAwards(Achievement a, HallOfFame h) {
        List<Map.Entry<String, List<String>>> awards = new ArrayList<>();
        if (h.getAwards() != null && !h.getAwards().isEmpty()) {
            for (HallOfFameAward aw : h.getAwards()) awards.add(Map.entry(aw.getAwardName(), new ArrayList<>(aw.getParticipantLoginIds())));
        } else if (h.getAwardName() != null || (h.getParticipantLoginIds() != null && !h.getParticipantLoginIds().isEmpty())) {
            awards.add(Map.entry(Optional.ofNullable(h.getAwardName()).orElse(""), new ArrayList<>(h.getParticipantLoginIds())));
        }
        int order = a.getEntries().stream().mapToInt(AchievementEntry::getSortOrder).max().orElse(0);
        for (Map.Entry<String, List<String>> aw : awards) {
            AchievementEntry e = a.getEntries().stream()
                    .filter(x -> Objects.equals(blankToNull(x.getAward()), blankToNull(aw.getKey())))
                    .findFirst().orElse(null);
            if (e == null) {
                e = new AchievementEntry();
                e.setAchievement(a);
                e.setAward(blankToNull(aw.getKey()));
                e.setSortOrder(++order);
                a.getEntries().add(e);
            }
            List<MemberRef> refs = aw.getValue().stream().map(l -> new MemberRef(l, null, null)).toList();
            applyEntry(e, new EntryRequest(e.getName(), e.getAward(), refs));
        }
    }

    private void copyHofImage(Achievement a, HallOfFame h, String loginId) {
        String img = h.getImage();
        if (img == null || img.isBlank()) return;
        try {
            byte[] bytes;
            String ext = "jpg";
            if (img.startsWith("data:")) {
                int comma = img.indexOf(',');
                String header = img.substring(5, comma);
                if (header.contains("png")) ext = "png";
                else if (header.contains("webp")) ext = "webp";
                bytes = Base64.getDecoder().decode(img.substring(comma + 1));
            } else {
                int at = img.indexOf("/uploads/");
                if (at < 0) return;
                Path uploads = Paths.get(uploadBaseDir).toAbsolutePath().normalize();
                Path src = uploads.resolve(img.substring(at + "/uploads/".length())).normalize();
                if (!src.startsWith(uploads) || !Files.exists(src)) return;
                bytes = Files.readAllBytes(src);
                String e = ext(src.getFileName().toString());
                if (!e.isEmpty()) ext = e;
            }
            String rel = "files/" + a.getId() + "/" + UUID.randomUUID().toString().replace("-", "") + "." + ext;
            Path dest = resolve(rel);
            Files.createDirectories(dest.getParent());
            Files.write(dest, bytes);
            AchievementFile f = new AchievementFile();
            f.setAchievementId(a.getId());
            f.setCategory("PHOTO");
            f.setOriginalName(cleanName(a.getTitle()) + " 대표사진." + ext);
            f.setStoredPath(rel);
            f.setSize(bytes.length);
            f.setContentType("image/" + ("jpg".equals(ext) ? "jpeg" : ext));
            f.setUploadedBy(loginId);
            fileRepository.save(f);
        } catch (Exception e) {
            System.err.println("명예의 전당 사진 복사 실패 #" + h.getId() + ": " + e.getMessage());
        }
    }

    // ---------- 디스코드 총회 가져오기 ----------

    private static final String NOTICE_CHANNEL = "동아리공지";
    private static final java.time.ZoneId KST = java.time.ZoneId.of("Asia/Seoul");
    private static final Pattern ASSEMBLY_TITLE = Pattern.compile("(?<!\\d)(\\d{1,2})\\s*월\\s*(정기\\s*)?총회");

    private record NoticeCandidate(int month, Map<String, Object> message, LocalDate created, int reactions) {
    }

    // 동아리공지 채널에서 그해 총회 공지를 달마다 하나씩 찾아 총회 실적을 만든다.
    // 이미 가져온 달(지운 것 포함)과 직접 만든 같은 달 총회는 그대로 두고, 아직 안 열린 총회는 건너뛴다.
    @Transactional
    @SuppressWarnings("unchecked")
    public DiscordImportResult importAssembliesFromDiscord(int year, String loginId) {
        Map<String, Object> res = discordBotClient.getChannelMessages(NOTICE_CHANNEL, 300);
        if (res == null || !"success".equals(String.valueOf(res.get("status")))) {
            throw new IllegalArgumentException(res != null && res.get("message") != null
                    ? res.get("message").toString() : "디스코드 공지 채널을 읽지 못했어요. 봇 상태를 확인해주세요.");
        }
        String jumpBase = "https://discord.com/channels/" + res.get("guildId") + "/" + res.get("channelId") + "/";

        // 달마다 반응이 가장 많은 공지 하나 (같은 달 공지가 여러 번 올라와도 투표 받은 본 공지가 뽑힌다)
        Map<Integer, NoticeCandidate> best = new TreeMap<>();
        for (Map<String, Object> m : (List<Map<String, Object>>) res.getOrDefault("messages", List.of())) {
            String content = String.valueOf(m.getOrDefault("content", ""));
            LocalDate created = java.time.OffsetDateTime.parse(String.valueOf(m.get("createdAt"))).atZoneSameInstant(KST).toLocalDate();
            int count = ((List<Map<String, Object>>) m.getOrDefault("reactions", List.of())).stream()
                    .mapToInt(r -> r.get("count") instanceof Number n ? n.intValue() : 0).sum();
            if (count == 0) continue;
            Matcher t = ASSEMBLY_TITLE.matcher(content);
            Set<Integer> months = new HashSet<>();
            while (t.find()) months.add(Integer.parseInt(t.group(1)));
            for (int month : months) {
                if (month < 1 || month > 12) continue;
                // 공지는 그 달 1일 50일 전 ~ 그 달 말일 사이에 올라온다 (12월에 올린 1월 총회는 다음 해)
                LocalDate first = LocalDate.of(year, month, 1);
                if (created.isBefore(first.minusDays(50)) || created.isAfter(first.plusMonths(1).minusDays(1))) continue;
                NoticeCandidate prev = best.get(month);
                if (prev == null || count > prev.reactions()) best.put(month, new NoticeCandidate(month, m, created, count));
            }
        }

        List<Achievement> all = achievementRepository.findAll();
        Set<String> keys = all.stream().map(Achievement::getSourceKey).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, Member> byTag = new HashMap<>();
        for (Member mem : memberRepository.findAll()) {
            if (mem.getDiscordTag() != null && !mem.isDeleted()) byTag.put(mem.getDiscordTag().toLowerCase(Locale.ROOT), mem);
        }

        List<String> created = new ArrayList<>(), skipped = new ArrayList<>(), upcoming = new ArrayList<>(), notes = new ArrayList<>();
        LocalDate today = LocalDate.now(KST);
        for (NoticeCandidate c : best.values()) {
            String label = c.month() + "월 정기총회";
            String key = "discord-assembly:" + year + "-" + String.format("%02d", c.month());
            boolean manual = all.stream().anyMatch(a -> !a.isDeleted() && a.getSourceKey() == null && "ASSEMBLY".equals(a.getType())
                    && a.getYear() == year && sameAssemblyMonth(a, c.month()));
            if (keys.contains(key) || manual) {
                skipped.add(label);
                continue;
            }
            String content = String.valueOf(c.message().getOrDefault("content", ""));
            LocalDate date = assemblyDate(content, year, c.month(), c.created());
            if (date.isAfter(today)) {
                upcoming.add(label + " (" + fmt(date) + ")");
                continue;
            }

            List<String> reactionEmojis = ((List<Map<String, Object>>) c.message().getOrDefault("reactions", List.of())).stream()
                    .map(r -> String.valueOf(r.get("emoji"))).toList();
            String attend = attendingEmoji(content, reactionEmojis);
            String messageId = String.valueOf(c.message().get("id"));

            Achievement a = new Achievement();
            a.setType("ASSEMBLY");
            a.setTitle(label);
            a.setYear(year);
            a.setStartDate(date);
            a.setSourceKey(key);
            a.setDiscordMessageId(messageId);
            a.setSourceUrl(jumpBase + messageId);
            a.setMemo(noticeMemo(content));
            a.setCreatedBy(loginId);
            if (attend != null) {
                a.getParticipants().addAll(attendees(messageId, attend, byTag));
            } else {
                notes.add(label + ": 공지에서 '총회 참석' 이모지를 못 찾아 참석 인원은 비워 뒀어요.");
            }
            a.setAttendanceSessionId(guessSession(a));
            achievementRepository.save(a);
            keys.add(key);
            created.add(label + " · " + a.getParticipants().size() + "명");
        }
        return new DiscordImportResult(year, created, skipped, upcoming, notes);
    }

    // 디스코드 공지의 반응을 다시 읽어 참석 인원을 새로 맞춘다
    @Transactional
    public AchievementDto resyncDiscord(Long id) {
        Achievement a = find(id);
        if (a.getDiscordMessageId() == null) throw new IllegalArgumentException("디스코드에서 가져온 총회가 아니에요.");
        Map<String, Object> res = discordBotClient.getChannelMessages(NOTICE_CHANNEL, 300);
        String content = "";
        List<String> emojis = List.of();
        if (res != null) {
            for (Object o : (List<?>) res.getOrDefault("messages", List.of())) {
                Map<?, ?> m = (Map<?, ?>) o;
                if (!a.getDiscordMessageId().equals(String.valueOf(m.get("id")))) continue;
                content = String.valueOf(m.get("content"));
                emojis = ((List<?>) m.get("reactions")).stream().map(r -> String.valueOf(((Map<?, ?>) r).get("emoji"))).toList();
            }
        }
        String attend = attendingEmoji(content, emojis);
        if (attend == null) throw new IllegalArgumentException("공지에서 '총회 참석' 이모지를 찾지 못했어요.");
        Map<String, Member> byTag = new HashMap<>();
        for (Member mem : memberRepository.findAll()) {
            if (mem.getDiscordTag() != null && !mem.isDeleted()) byTag.put(mem.getDiscordTag().toLowerCase(Locale.ROOT), mem);
        }
        a.getParticipants().clear();
        a.getParticipants().addAll(attendees(a.getDiscordMessageId(), attend, byTag));
        touch(a);
        return get(a.getId());
    }

    @SuppressWarnings("unchecked")
    private List<AchievementMember> attendees(String messageId, String attendEmoji, Map<String, Member> byTag) {
        Map<String, Object> res = discordBotClient.getAllReactors(messageId);
        List<Map<String, Object>> reactors = res == null ? List.of() : (List<Map<String, Object>>) res.getOrDefault("members", List.of());
        List<AchievementMember> out = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (Map<String, Object> r : reactors) {
            List<String> es = ((List<Object>) r.getOrDefault("emojis", List.of())).stream().map(x -> plainEmoji(String.valueOf(x))).toList();
            if (!es.contains(attendEmoji)) continue;
            String tag = r.get("discordTag") == null ? "" : r.get("discordTag").toString().toLowerCase(Locale.ROOT);
            Member mem = byTag.get(tag);
            if (mem != null) {
                if (seen.add(mem.getLoginId())) out.add(new AchievementMember(mem.getLoginId(), plainName(mem.getName()), mem.getStudentId()));
            } else {
                // 웹 회원이 아닌 사람은 디스코드 별명 ("25 홍길동" 꼴이면 이름만)
                String nick = String.valueOf(r.getOrDefault("name", tag)).trim();
                Matcher m = Pattern.compile("^(\\d{2})\\s*(.+)$").matcher(nick);
                String name = plainName(m.matches() ? m.group(2) : nick);
                if (seen.add("ext:" + nick)) out.add(new AchievementMember(null, name, m.matches() ? "20" + m.group(1) : null));
            }
        }
        out.sort(Comparator.comparing((AchievementMember x) -> Optional.ofNullable(x.getStudentId()).orElse("9999"))
                .thenComparing(x -> Optional.ofNullable(x.getName()).orElse("")));
        return out;
    }

    private boolean sameAssemblyMonth(Achievement a, int month) {
        Matcher t = ASSEMBLY_TITLE.matcher(Optional.ofNullable(a.getTitle()).orElse(""));
        if (t.find()) return Integer.parseInt(t.group(1)) == month;
        return a.getStartDate() != null && a.getStartDate().getMonthValue() == month;
    }

    // 공지 본문에서 총회 날짜 — "10월 27일", "4월 총회를 5월 3일", "총회를 20일" … 못 찾으면 공지 올린 날
    static LocalDate assemblyDate(String content, int year, int month, LocalDate created) {
        Matcher md = Pattern.compile("(?<!\\d)(\\d{1,2})\\s*월\\s*(\\d{1,2})\\s*일").matcher(content);
        while (md.find()) {
            int mo = Integer.parseInt(md.group(1)), d = Integer.parseInt(md.group(2));
            if (mo != month && mo != month % 12 + 1) continue; // 시험 기간 등으로 다음 달에 여는 경우까지만
            int y = mo < month ? year + 1 : year;
            LocalDate date = parseDate(y + "." + mo + "." + d);
            if (date != null) return date;
        }
        Matcher dOnly = Pattern.compile("총회[를는을]?\\s*(\\d{1,2})\\s*일").matcher(content);
        if (dOnly.find()) {
            LocalDate date = parseDate(year + "." + month + "." + dOnly.group(1));
            if (date != null) return date;
        }
        return created;
    }

    // 공지마다 참석 이모지가 달라서(⭕, ✅ …) 본문의 안내 줄에서 "총회 참석"에 붙은 이모지를 찾는다.
    // "총회 참석:⭕" 처럼 글자 뒤에 오거나, "✅ 총회 참석" 처럼 앞에 오는 두 꼴을 모두 읽는다.
    static String attendingEmoji(String content, List<String> reactionEmojis) {
        List<String> emojis = reactionEmojis.stream().map(AchievementService::plainEmoji).distinct().toList();
        for (String raw : content.split("\\R")) {
            String line = plainEmoji(raw);
            List<int[]> hits = new ArrayList<>(); // {시작, 끝, 이모지 번호}
            for (int i = 0; i < emojis.size(); i++) {
                String e = emojis.get(i);
                for (int at = line.indexOf(e); at >= 0; at = line.indexOf(e, at + e.length())) {
                    hits.add(new int[]{at, at + e.length(), i});
                }
            }
            if (hits.isEmpty()) continue;
            hits.sort(Comparator.comparingInt(h -> h[0]));
            boolean emojiFirst = line.replaceAll("^[\\s\\-•*·>]+", "").length() > 0
                    && hits.get(0)[0] == line.length() - line.replaceAll("^[\\s\\-•*·>]+", "").length();
            for (int k = 0; k < hits.size(); k++) {
                int[] h = hits.get(k);
                String label = emojiFirst
                        ? line.substring(h[1], k + 1 < hits.size() ? hits.get(k + 1)[0] : line.length())
                        : line.substring(k > 0 ? hits.get(k - 1)[1] : 0, h[0]);
                String compact = label.replaceAll("[\\s:：\\-()]", "");
                if (compact.contains("총회참석") && !compact.contains("불참")) return emojis.get(h[2]);
            }
        }
        return null;
    }

    private static String plainEmoji(String s) {
        return s == null ? "" : s.replace("\uFE0F", "");
    }

    private static String noticeMemo(String content) {
        String text = content.replace("@everyone", "").replaceAll("<@!?\\d+>", "@관리자").trim();
        return text.length() > 2000 ? text.substring(0, 2000) + "…" : text;
    }

    // ---------- 내려받기 (한 번 쓰는 주소) ----------

    public record Ticket(String kind, Integer year, Long id, long expiresAt) {
    }

    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public String issueTicket(DownloadRequest req) {
        String kind = req.kind() == null ? "" : req.kind().toUpperCase(Locale.ROOT);
        if (!Set.of("YEAR", "RECORD", "FILE").contains(kind)) throw new IllegalArgumentException("잘못된 요청");
        if ("YEAR".equals(kind) && req.year() == null) throw new IllegalArgumentException("연도를 골라주세요.");
        if (!"YEAR".equals(kind) && req.id() == null) throw new IllegalArgumentException("잘못된 요청");
        long now = System.currentTimeMillis();
        tickets.values().removeIf(t -> t.expiresAt() < now);
        byte[] b = new byte[24];
        random.nextBytes(b);
        String token = HexFormat.of().formatHex(b);
        tickets.put(token, new Ticket(kind, req.year(), req.id(), now + 120_000));
        return token;
    }

    public Ticket redeem(String token) {
        Ticket t = token == null ? null : tickets.remove(token);
        if (t == null || t.expiresAt() < System.currentTimeMillis()) throw new IllegalArgumentException("내려받기 주소가 만료됐어요. 다시 눌러주세요.");
        return t;
    }

    // 압축 파일에 넣을 것 — 파일은 경로, 출석부·요약·정보는 미리 만든 내용
    public record ExportItem(String path, Path file, byte[] bytes) {
    }

    public record ExportPlan(String zipName, List<ExportItem> items) {
    }

    @Transactional(readOnly = true)
    public ExportPlan planYear(int year) {
        List<Achievement> list = achievementRepository.findByYearAndDeletedFalseOrderByStartDateAscIdAsc(year);
        String root = "DEVSIGN_" + year + "_실적";
        List<ExportItem> items = new ArrayList<>();
        items.add(new ExportItem(root + "/00_실적요약.xlsx", null, summaryExcel(year, list)));
        Set<String> folders = new HashSet<>();
        for (Achievement a : list) {
            // 같은 날 같은 이름의 실적이 여러 개면 폴더를 "(2)"로 나눈다
            String base = root + "/" + TYPE_LABEL.get(a.getType()) + "/" + folderName(a);
            String folder = base;
            for (int n = 2; !folders.add(folder); n++) folder = base + " (" + n + ")";
            addAchievement(items, folder + "/", a);
        }
        return new ExportPlan(root + ".zip", dedupe(items));
    }

    @Transactional(readOnly = true)
    public ExportPlan planRecord(Long id) {
        Achievement a = find(id);
        String root = a.getYear() + "_" + TYPE_LABEL.get(a.getType()) + "_" + folderName(a);
        List<ExportItem> items = new ArrayList<>();
        addAchievement(items, root + "/", a);
        return new ExportPlan(root + ".zip", dedupe(items));
    }

    private void addAchievement(List<ExportItem> items, String folder, Achievement a) {
        List<AchievementFile> files = fileRepository.findByAchievementIdOrderByIdAsc(a.getId());
        items.add(new ExportItem(folder + "00_정보.txt", null, infoText(a).getBytes(StandardCharsets.UTF_8)));
        if (a.getAttendanceSessionId() != null) {
            try {
                byte[] xlsx = attendanceService.downloadHistoryExcel(a.getAttendanceSessionId()).getBody();
                if (xlsx != null && xlsx.length > 0) items.add(new ExportItem(folder + "출석부.xlsx", null, xlsx));
            } catch (Exception ignored) {
            }
        }
        if (!a.getParticipants().isEmpty()) {
            items.add(new ExportItem(folder + "참석자.xlsx", null, participantsExcel(a)));
        }
        for (AchievementFile f : files) {
            if (f.getEntryId() != null) continue;
            items.add(new ExportItem(folder + CATEGORY_LABEL.get(f.getCategory()) + "/" + f.getOriginalName(), resolve(f.getStoredPath()), null));
        }
        for (AchievementEntry e : a.getEntries()) {
            String ef = folder + safe(entryFolderName(e)) + "/";
            items.add(new ExportItem(ef, null, null)); // 파일이 없어도 사람 폴더는 만든다
            for (AchievementFile f : files) {
                if (!e.getId().equals(f.getEntryId())) continue;
                items.add(new ExportItem(ef + CATEGORY_LABEL.get(f.getCategory()) + "/" + f.getOriginalName(), resolve(f.getStoredPath()), null));
            }
        }
    }

    // 같은 폴더에 같은 이름이 있으면 "이름 (2).확장자"
    private List<ExportItem> dedupe(List<ExportItem> items) {
        Set<String> used = new HashSet<>();
        List<ExportItem> out = new ArrayList<>();
        for (ExportItem it : items) {
            String p = it.path();
            if (!p.endsWith("/")) {
                int n = 2;
                String stem = p.contains(".") && p.lastIndexOf('.') > p.lastIndexOf('/') ? p.substring(0, p.lastIndexOf('.')) : p;
                String ext = stem.length() < p.length() ? p.substring(stem.length()) : "";
                while (used.contains(p)) p = stem + " (" + n++ + ")" + ext;
            } else if (used.contains(p)) {
                continue;
            }
            used.add(p);
            out.add(new ExportItem(p, it.file(), it.bytes()));
        }
        return out;
    }

    public void writeZip(ExportPlan plan, OutputStream out) throws IOException {
        ZipOutputStream zip = new ZipOutputStream(out, StandardCharsets.UTF_8);
        zip.setLevel(1); // 사진·PDF는 이미 압축돼 있어서 빠르게만
        for (ExportItem it : plan.items()) {
            if (it.path().endsWith("/")) {
                zip.putNextEntry(new ZipEntry(it.path()));
                zip.closeEntry();
                continue;
            }
            if (it.file() != null && !Files.exists(it.file())) continue;
            zip.putNextEntry(new ZipEntry(it.path()));
            if (it.bytes() != null) zip.write(it.bytes());
            else Files.copy(it.file(), zip);
            zip.closeEntry();
        }
        zip.finish();
        zip.flush();
    }

    private String infoText(Achievement a) {
        StringBuilder sb = new StringBuilder();
        sb.append("구분: ").append(TYPE_LABEL.get(a.getType())).append('\n');
        sb.append("이름: ").append(a.getTitle()).append('\n');
        sb.append("날짜: ").append(dateRange(a)).append('\n');
        if (a.getOrganizer() != null) sb.append("주최: ").append(a.getOrganizer()).append('\n');
        if (a.getAttendanceSessionId() != null) {
            AttendanceDto att = attendance(a.getAttendanceSessionId());
            if (att != null) sb.append("출석: ").append(att.checked()).append(" / ").append(att.total()).append("명\n");
        }
        if (!a.getParticipants().isEmpty()) {
            sb.append("참석: ").append(a.getParticipants().size()).append("명\n");
        }
        if (a.getSourceUrl() != null) sb.append("디스코드 공지: ").append(a.getSourceUrl()).append('\n');
        if (!a.getEntries().isEmpty()) {
            sb.append("\n[참가]\n");
            for (AchievementEntry e : a.getEntries()) {
                sb.append("- ").append(e.getAward() == null ? "" : e.getAward() + " · ")
                        .append(e.getName() == null ? "" : e.getName() + " · ")
                        .append(memberNames(e)).append('\n');
            }
        }
        if (a.getMemo() != null) sb.append("\n[메모]\n").append(a.getMemo()).append('\n');
        return sb.toString().replace("\n", "\r\n");
    }

    private byte[] summaryExcel(int year, List<Achievement> list) {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream buf = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet(year + " 실적");
            var bold = wb.createFont();
            bold.setBold(true);
            XSSFCellStyle head = wb.createCellStyle();
            head.setFont(bold);
            String[] headers = {"구분", "날짜", "실적", "주최", "수상", "팀", "참가자", "인원", "출석", "파일 수"};
            Row hr = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                hr.createCell(i).setCellValue(headers[i]);
                hr.getCell(i).setCellStyle(head);
            }
            Map<Long, Long> fileCounts = list.isEmpty() ? Map.of() : fileRepository
                    .findByAchievementIdInOrderByIdAsc(list.stream().map(Achievement::getId).toList()).stream()
                    .collect(Collectors.groupingBy(f -> f.getEntryId() == null ? -f.getAchievementId() : f.getEntryId(), Collectors.counting()));
            int r = 1;
            for (Achievement a : list) {
                AttendanceDto att = attendance(a.getAttendanceSessionId());
                String attText = att == null ? "" : att.checked() + " / " + att.total();
                if (a.getEntries().isEmpty()) {
                    Row row = sheet.createRow(r++);
                    String names = a.getParticipants().stream().map(this::memberName).collect(Collectors.joining(", "));
                    fillRow(row, a, "", "", names, a.getParticipants().size(), attText, fileCounts.getOrDefault(-a.getId(), 0L));
                } else {
                    boolean first = true;
                    for (AchievementEntry e : a.getEntries()) {
                        Row row = sheet.createRow(r++);
                        long files = fileCounts.getOrDefault(e.getId(), 0L) + (first ? fileCounts.getOrDefault(-a.getId(), 0L) : 0);
                        fillRow(row, a, Optional.ofNullable(e.getAward()).orElse(""), Optional.ofNullable(e.getName()).orElse(""),
                                memberNames(e), e.getMembers().size(), first ? attText : "", files);
                        first = false;
                    }
                }
            }
            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            wb.write(buf);
            return buf.toByteArray();
        } catch (IOException e) {
            return new byte[0];
        }
    }

    private void fillRow(Row row, Achievement a, String award, String team, String members, int count, String att, long files) {
        row.createCell(0).setCellValue(TYPE_LABEL.get(a.getType()));
        row.createCell(1).setCellValue(dateRange(a));
        row.createCell(2).setCellValue(a.getTitle());
        row.createCell(3).setCellValue(Optional.ofNullable(a.getOrganizer()).orElse(""));
        row.createCell(4).setCellValue(award);
        row.createCell(5).setCellValue(team);
        row.createCell(6).setCellValue(members);
        if (count > 0) row.createCell(7).setCellValue(count);
        row.createCell(8).setCellValue(att);
        row.createCell(9).setCellValue(files);
    }

    // ---------- 도움 함수 ----------

    private String memberNames(AchievementEntry e) {
        return e.getMembers().stream().map(this::memberName).collect(Collectors.joining(", "));
    }

    private String memberName(AchievementMember m) {
        return shortId(m.getStudentId()) + Optional.ofNullable(m.getName()).orElse("");
    }

    private byte[] participantsExcel(Achievement a) {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream buf = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("참석자");
            var bold = wb.createFont();
            bold.setBold(true);
            XSSFCellStyle head = wb.createCellStyle();
            head.setFont(bold);
            String[] headers = {"번호", "이름", "학번", "비고"};
            Row hr = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                hr.createCell(i).setCellValue(headers[i]);
                hr.getCell(i).setCellStyle(head);
            }
            int r = 1;
            for (AchievementMember m : a.getParticipants()) {
                Row row = sheet.createRow(r);
                row.createCell(0).setCellValue(r);
                row.createCell(1).setCellValue(Optional.ofNullable(m.getName()).orElse(""));
                row.createCell(2).setCellValue(Optional.ofNullable(m.getStudentId()).orElse(""));
                row.createCell(3).setCellValue(m.getLoginId() == null ? "부원 계정 없음" : "");
                r++;
            }
            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            wb.write(buf);
            return buf.toByteArray();
        } catch (IOException e) {
            return new byte[0];
        }
    }

    private String entryFolderName(AchievementEntry e) {
        String who = e.getName() != null ? e.getName() : memberNames(e);
        if (who.isBlank()) who = "참가 " + e.getSortOrder();
        if (who.length() > 60) who = who.substring(0, 60) + "…";
        return e.getAward() == null ? who : e.getAward() + "_" + who;
    }

    private String folderName(Achievement a) {
        String date = a.getStartDate() == null ? "날짜미정" : a.getStartDate().format(DateTimeFormatter.ofPattern("MM.dd"));
        return safe(date + "_" + a.getTitle());
    }

    private String dateRange(Achievement a) {
        if (a.getStartDate() == null) return "";
        return fmt(a.getStartDate()) + (a.getEndDate() == null ? "" : " ~ " + fmt(a.getEndDate()));
    }

    private static String shortId(String studentId) {
        String s = studentId == null ? "" : studentId.trim();
        return s.length() >= 4 ? s.substring(2, 4) + " " : "";
    }

    private static String safe(String s) {
        String out = s.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", " ").replaceAll("\\s+", " ").trim();
        out = out.replaceAll("[. ]+$", "");
        if (out.length() > 80) out = out.substring(0, 80).trim();
        return out.isEmpty() ? "이름없음" : out;
    }

    private static String cleanName(String name) {
        String n = name.replace('\\', '/');
        n = n.substring(n.lastIndexOf('/') + 1);
        n = n.replaceAll("[:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (n.length() > 150) {
            String e = ext(n);
            n = n.substring(0, 140) + (e.isEmpty() ? "" : "." + e);
        }
        return n.isEmpty() ? "file" : n;
    }

    private static String ext(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 || dot == name.length() - 1 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static boolean isImage(String name, String contentType) {
        return (contentType != null && contentType.startsWith("image/")) || IMAGE_EXT.contains(ext(Optional.ofNullable(name).orElse("")));
    }

    private static String fmt(LocalDate d) {
        return d == null ? null : d.format(DOT);
    }

    // "2026.04.27", "2026-4-27", "2026.06.31"(없는 날은 그 달 마지막 날로) → LocalDate
    static LocalDate parseDate(String raw) {
        if (raw == null) return null;
        Matcher m = Pattern.compile("(\\d{4})\\D+(\\d{1,2})\\D+(\\d{1,2})").matcher(raw);
        if (!m.find()) return null;
        int y = Integer.parseInt(m.group(1)), mo = Integer.parseInt(m.group(2)), d = Integer.parseInt(m.group(3));
        if (mo < 1 || mo > 12 || d < 1) return null;
        YearMonth ym = YearMonth.of(y, mo);
        return ym.atDay(Math.min(d, ym.lengthOfMonth()));
    }

    // 부원 이름 뒤의 "(회장)" 같은 표시는 실적에 남기지 않는다
    private static String plainName(String name) {
        return name == null ? null : name.replaceAll("\\s*\\([^)]*\\)\\s*$", "").trim();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) if (v != null && !v.isBlank()) return v.trim();
        return "";
    }
}

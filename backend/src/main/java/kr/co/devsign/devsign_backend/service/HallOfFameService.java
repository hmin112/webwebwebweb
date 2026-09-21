package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.devsign.devsign_backend.dto.halloffame.HallOfFameAwardPayload;
import kr.co.devsign.devsign_backend.dto.halloffame.HallOfFameAwardResponse;
import kr.co.devsign.devsign_backend.dto.halloffame.HallOfFameParticipantResponse;
import kr.co.devsign.devsign_backend.dto.halloffame.HallOfFameRequest;
import kr.co.devsign.devsign_backend.dto.halloffame.HallOfFameResponse;
import kr.co.devsign.devsign_backend.entity.HallOfFame;
import kr.co.devsign.devsign_backend.entity.HallOfFameAward;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.HallOfFameRepository;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HallOfFameService {

    private final HallOfFameRepository hallOfFameRepository;
    private final MemberRepository memberRepository;
    private final AccessLogService accessLogService;
    // 이 프로젝트 설정에서는 ObjectMapper가 Spring 빈으로 등록되지 않아, 수상 항목 JSON 파싱에만 직접 사용한다.
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.upload.base-dir}")
    private String uploadDir;

    public List<HallOfFameResponse> getAllHallOfFame() {
        return hallOfFameRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public HallOfFameResponse createHallOfFame(HallOfFameRequest payload, List<MultipartFile> files,
                                                List<String> participantLoginIds, String loginId, String ip) {
        HallOfFame entry = new HallOfFame();
        entry.setCompetitionName(payload.competitionName());
        entry.setAwardName(payload.awardName());
        entry.setTitle(payload.title());
        entry.setContent(payload.content());
        entry.setDate(payload.date());
        entry.setImage(saveFile(files));
        replaceAwards(entry, parseAwards(payload.awardsJson(), payload.awardName(), participantLoginIds));

        HallOfFame saved = hallOfFameRepository.save(entry);
        accessLogService.logByLoginId(loginId, "HALL_OF_FAME_CREATE", ip);
        return toResponse(saved);
    }

    @Transactional
    public HallOfFameResponse updateHallOfFame(Long id, HallOfFameRequest payload, List<MultipartFile> files,
                                                List<String> participantLoginIds, String loginId, String ip) {
        HallOfFame entry = hallOfFameRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("hall of fame entry not found"));

        entry.setCompetitionName(payload.competitionName());
        entry.setAwardName(payload.awardName());
        entry.setTitle(payload.title());
        entry.setContent(payload.content());
        entry.setDate(payload.date());

        String newImageUrl = saveFile(files);
        if (newImageUrl != null) {
            entry.setImage(newImageUrl);
        } else {
            entry.setImage(payload.image());
        }

        replaceAwards(entry, parseAwards(payload.awardsJson(), payload.awardName(), participantLoginIds));

        accessLogService.logByLoginId(loginId, "HALL_OF_FAME_UPDATE", ip);
        return toResponse(hallOfFameRepository.save(entry));
    }

    @Transactional
    public StatusResponse deleteHallOfFame(Long id, String loginId, String ip) {
        HallOfFame entry = hallOfFameRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("hall of fame entry not found"));

        accessLogService.logByLoginId(loginId, "HALL_OF_FAME_DELETE", ip);
        hallOfFameRepository.delete(entry);
        return StatusResponse.success();
    }

    private List<String> sanitizeParticipants(List<String> participantLoginIds) {
        if (participantLoginIds == null) return new ArrayList<>();
        return participantLoginIds.stream()
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .toList();
    }

    private List<HallOfFameAwardPayload> parseAwards(String awardsJson, String legacyAwardName, List<String> legacyParticipants) {
        if (awardsJson != null && !awardsJson.isBlank()) {
            try {
                List<HallOfFameAwardPayload> parsed = objectMapper.readValue(awardsJson, new TypeReference<>() {});
                List<HallOfFameAwardPayload> cleaned = parsed.stream()
                        .filter(a -> a.awardName() != null && !a.awardName().isBlank())
                        .map(a -> new HallOfFameAwardPayload(a.awardName().trim(), sanitizeParticipants(a.participantLoginIds())))
                        .toList();
                if (!cleaned.isEmpty()) return cleaned;
            } catch (Exception e) {
                throw new IllegalArgumentException("수상 항목 정보를 읽을 수 없습니다.");
            }
        }
        if (legacyAwardName == null || legacyAwardName.isBlank()) {
            throw new IllegalArgumentException("수상 내역을 하나 이상 입력해주세요.");
        }
        return List.of(new HallOfFameAwardPayload(legacyAwardName.trim(), sanitizeParticipants(legacyParticipants)));
    }

    private void replaceAwards(HallOfFame entry, List<HallOfFameAwardPayload> awards) {
        entry.getAwards().clear();
        for (int index = 0; index < awards.size(); index++) {
            HallOfFameAwardPayload payload = awards.get(index);
            HallOfFameAward award = new HallOfFameAward();
            award.setHallOfFame(entry);
            award.setAwardName(payload.awardName());
            award.setDisplayOrder(index);
            award.setParticipantLoginIds(sanitizeParticipants(payload.participantLoginIds()));
            entry.getAwards().add(award);
        }
        // 기존 목록/홈 배너는 첫 번째(가장 높은) 상을 대표값으로 사용한다.
        HallOfFameAwardPayload primary = awards.get(0);
        entry.setAwardName(primary.awardName());
        entry.setParticipantLoginIds(sanitizeParticipants(primary.participantLoginIds()));
    }

    private String saveFile(List<MultipartFile> files) {
        if (files == null || files.isEmpty() || files.get(0).isEmpty()) {
            return null;
        }

        File directory = new File(uploadDir);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        MultipartFile file = files.get(0); // 대표 사진 하나만 사용
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        File dest = new File(directory, fileName);

        try {
            file.transferTo(dest);
            return "/uploads/" + fileName;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "명예의 전당 사진 저장 중 오류가 발생했습니다.");
        }
    }

    // 수상자 정보는 스냅샷이 아니라 조회 시점의 Member 최신 정보(이름/학번/프로필사진)를 사용
    private HallOfFameResponse toResponse(HallOfFame entry) {
        List<HallOfFameParticipantResponse> participants = entry.getParticipantLoginIds().stream()
                .map(memberRepository::findByLoginId)
                .flatMap(java.util.Optional::stream)
                .filter(m -> !m.isDeleted())
                .map(this::toParticipantResponse)
                .toList();

        List<HallOfFameAwardResponse> awards = entry.getAwards().isEmpty()
                ? List.of(new HallOfFameAwardResponse(entry.getAwardName(), participants))
                : entry.getAwards().stream()
                .map(award -> new HallOfFameAwardResponse(
                        award.getAwardName(),
                        award.getParticipantLoginIds().stream()
                                .map(memberRepository::findByLoginId)
                                .flatMap(java.util.Optional::stream)
                                .filter(m -> !m.isDeleted())
                                .map(this::toParticipantResponse)
                                .toList()
                ))
                .toList();

        return new HallOfFameResponse(
                entry.getId(),
                entry.getCompetitionName(),
                entry.getAwardName(),
                entry.getTitle(),
                entry.getContent(),
                entry.getDate(),
                entry.getImage(),
                participants,
                awards,
                entry.getCreatedAt()
        );
    }

    private HallOfFameParticipantResponse toParticipantResponse(Member member) {
        return new HallOfFameParticipantResponse(
                member.getLoginId(),
                member.getName(),
                member.getStudentId(),
                member.getProfileImage()
        );
    }
}

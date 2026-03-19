package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.entity.Event;
import kr.co.devsign.devsign_backend.entity.EventLike;
import kr.co.devsign.devsign_backend.entity.EventView;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.EventLikeRepository;
import kr.co.devsign.devsign_backend.repository.EventRepository;
import kr.co.devsign.devsign_backend.repository.EventViewRepository;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.event.EventDetailResponse;
import kr.co.devsign.devsign_backend.dto.event.EventLikeResponse;
import kr.co.devsign.devsign_backend.dto.event.EventRequest;
import kr.co.devsign.devsign_backend.dto.event.EventResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final MemberRepository memberRepository;
    private final EventViewRepository eventViewRepository;
    private final EventLikeRepository eventLikeRepository;

    private final AccessLogService accessLogService;

    // ✨ 설정파일의 저장 경로(/app/uploads)를 가져옵니다.
    @Value("${app.upload.base-dir}")
    private String uploadDir;

    public List<EventResponse> getAllEvents() {
        return eventRepository.findAll().stream()
                .map(this::toEventResponse)
                .toList();
    }

    // ✨ [수정] 파일 업로드 로직 통합
    @Transactional
    public EventResponse createEvent(EventRequest payload, List<MultipartFile> files, String loginId, String ip) {
        Event event = new Event();
        event.setCategory(payload.category());
        event.setTitle(payload.title());
        event.setDate(payload.date());
        event.setLocation(payload.location());
        event.setContent(payload.content());
        
        // 🚀 포스터 이미지 저장 (파일이 있으면 저장하고 경로 반환)
        String imageUrl = saveFile(files);
        event.setImage(imageUrl);
        
        event.setViews(0);
        event.setLikes(0);

        Event saved = eventRepository.save(event);
        accessLogService.logByLoginId(loginId, "EVENT_CREATE", ip);
        return toEventResponse(saved);
    }

    // ✨ [수정] 수정 시 기존 이미지 유지 혹은 새 이미지 교체 로직 반영
    @Transactional
    public EventResponse updateEvent(Long id, EventRequest payload, List<MultipartFile> files, String loginId, String ip) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("event not found"));

        event.setCategory(payload.category());
        event.setTitle(payload.title());
        event.setDate(payload.date());
        event.setLocation(payload.location());
        event.setContent(payload.content());

        // 🚀 새 파일이 들어왔다면 교체, 없다면 기존 URL(payload.image) 유지
        String newImageUrl = saveFile(files);
        if (newImageUrl != null) {
            event.setImage(newImageUrl);
        } else {
            event.setImage(payload.image());
        }

        accessLogService.logByLoginId(loginId, "EVENT_UPDATE", ip);
        return toEventResponse(eventRepository.save(event));
    }

    // ✨ [신규] 파일을 서버에 물리적으로 저장하는 공통 메서드
    private String saveFile(List<MultipartFile> files) {
        if (files == null || files.isEmpty() || files.get(0).isEmpty()) {
            return null;
        }

        File directory = new File(uploadDir);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        MultipartFile file = files.get(0); // 행사는 대표 이미지 하나만 사용
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        File dest = new File(directory, fileName);

        try {
            file.transferTo(dest);
            return "/uploads/" + fileName;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "행사 이미지 저장 중 오류가 발생했습니다.");
        }
    }

    @Transactional
    public EventDetailResponse getEventDetail(Long id, String loginId) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("event not found"));

        boolean isLiked = false;

        if (loginId != null && !loginId.isBlank()) {
            Optional<Member> memberOpt = memberRepository.findByLoginId(loginId);
            if (memberOpt.isPresent()) {
                Member member = memberOpt.get();

                if (!eventViewRepository.existsByMemberAndEvent(member, event)) {
                    event.setViews(event.getViews() + 1);
                    eventRepository.save(event);

                    EventView view = new EventView();
                    view.setMember(member);
                    view.setEvent(event);
                    eventViewRepository.save(view);
                }

                isLiked = eventLikeRepository.existsByMemberAndEvent(member, event);
            }
        }

        return new EventDetailResponse(toEventResponse(event), isLiked);
    }

    @Transactional
    public EventLikeResponse toggleLike(Long id, String loginId) {
        if (loginId == null || loginId.isBlank()) {
            return new EventLikeResponse("error", "login required", null, null);
        }

        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("event not found"));
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new RuntimeException("member not found"));

        boolean liked;
        if (eventLikeRepository.existsByMemberAndEvent(member, event)) {
            eventLikeRepository.deleteByMemberAndEvent(member, event);
            event.setLikes(Math.max(0, event.getLikes() - 1));
            liked = false;
        } else {
            EventLike like = new EventLike();
            like.setMember(member);
            like.setEvent(event);
            eventLikeRepository.save(like);

            event.setLikes(event.getLikes() + 1);
            liked = true;
        }

        eventRepository.save(event);
        return new EventLikeResponse("success", null, liked, event.getLikes());
    }

    @Transactional
    public StatusResponse deleteEvent(Long id, String loginId, String ip) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("event not found"));

        accessLogService.logByLoginId(loginId, "EVENT_DELETE", ip);

        eventLikeRepository.deleteByEvent(event);
        eventViewRepository.deleteByEvent(event);

        eventRepository.delete(event);

        return StatusResponse.success();
    }

    private EventResponse toEventResponse(Event event) {
        return new EventResponse(
                event.getId(),
                event.getCategory(),
                event.getTitle(),
                event.getDate(),
                event.getLocation(),
                event.getContent(),
                event.getImage(),
                event.getViews(),
                event.getLikes()
        );
    }
}
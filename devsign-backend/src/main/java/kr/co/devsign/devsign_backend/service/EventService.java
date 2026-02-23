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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final MemberRepository memberRepository;
    private final EventViewRepository eventViewRepository;
    private final EventLikeRepository eventLikeRepository;

    private final AccessLogService accessLogService;

    public List<EventResponse> getAllEvents() {
        return eventRepository.findAll().stream()
                .map(this::toEventResponse)
                .toList();
    }

    public EventResponse createEvent(EventRequest payload, String loginId, String ip) {
        Event event = new Event();
        event.setCategory(payload.category());
        event.setTitle(payload.title());
        event.setDate(payload.date());
        event.setLocation(payload.location());
        event.setContent(payload.content());
        event.setImage(payload.image());
        event.setViews(0);
        event.setLikes(0);

        Event saved = eventRepository.save(event);
        accessLogService.logByLoginId(loginId, "EVENT_CREATE", ip);
        return toEventResponse(saved);
    }

    public EventResponse updateEvent(Long id, EventRequest payload, String loginId, String ip) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("event not found"));

        event.setCategory(payload.category());
        event.setTitle(payload.title());
        event.setDate(payload.date());
        event.setLocation(payload.location());
        event.setContent(payload.content());
        event.setImage(payload.image());

        accessLogService.logByLoginId(loginId, "EVENT_UPDATE", ip);
        return toEventResponse(eventRepository.save(event));
    }

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

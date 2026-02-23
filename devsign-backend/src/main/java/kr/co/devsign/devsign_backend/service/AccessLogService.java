package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.entity.AccessLog;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.AccessLogRepository;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AccessLogService {

    private final MemberRepository memberRepository;
    private final AccessLogRepository accessLogRepository;

    public void logByLoginId(String loginId, String type, String ip) {
        if (loginId == null || loginId.isBlank()) return;

        memberRepository.findByLoginId(loginId).ifPresent(member -> {
            AccessLog log = new AccessLog();
            log.setName(member.getName());
            log.setStudentId(member.getStudentId());
            log.setType(type);
            log.setIp(ip);
            log.setTimestamp(LocalDateTime.now());
            accessLogRepository.save(log);
        });
    }

    public void logByMember(Member member, String type, String ip) {
        if (member == null) return;

        AccessLog log = new AccessLog();
        log.setName(member.getName());
        log.setStudentId(member.getStudentId());
        log.setType(type);
        log.setIp(ip);
        log.setTimestamp(LocalDateTime.now());
        accessLogRepository.save(log);
    }

    public void logRaw(String name, String studentId, String type, String ip) {
        AccessLog log = new AccessLog();
        log.setName(name);
        log.setStudentId(studentId);
        log.setType(type);
        log.setIp(ip);
        log.setTimestamp(LocalDateTime.now());
        accessLogRepository.save(log);
    }
}


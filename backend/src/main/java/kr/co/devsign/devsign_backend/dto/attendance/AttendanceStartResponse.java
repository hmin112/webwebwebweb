package kr.co.devsign.devsign_backend.dto.attendance;

import java.time.LocalDateTime;
import java.util.List;

public record AttendanceStartResponse(
        Long sessionId,
        String code,
        LocalDateTime startedAt,
        int durationSeconds,
        List<AttendanceTargetInfo> targets,
        // ✨ [신규] 디스코드 메시지로 출석을 시작했을 때, ✅ 반응은 남겼지만 웹사이트 회원과
        // 매칭되지 않아 대상자에서 제외된 디스코드 태그 목록(전체 시작을 막지는 않고 안내만 함)
        List<String> skippedReactors
) {
}

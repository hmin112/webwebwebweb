package kr.co.devsign.devsign_backend.dto.attendance;

public record MemberAttendanceStatusResponse(
        boolean active,
        boolean isTarget,
        boolean alreadyChecked,
        int checkedCount,
        int totalCount
) {
    public static MemberAttendanceStatusResponse inactive() {
        return new MemberAttendanceStatusResponse(false, false, false, 0, 0);
    }
}

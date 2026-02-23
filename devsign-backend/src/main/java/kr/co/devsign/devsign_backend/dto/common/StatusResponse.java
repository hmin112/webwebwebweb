package kr.co.devsign.devsign_backend.dto.common;

public record StatusResponse(
        String status,
        String message
) {
    public static StatusResponse success() {
        return new StatusResponse("success", null);
    }

    public static StatusResponse success(String message) {
        return new StatusResponse("success", message);
    }

    public static StatusResponse fail(String message) {
        return new StatusResponse("fail", message);
    }

    public static StatusResponse error(String message) {
        return new StatusResponse("error", message);
    }
}

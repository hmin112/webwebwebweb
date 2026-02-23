package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<StatusResponse> handleMaxUploadSizeExceeded() {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(StatusResponse.fail("파일 크기가 너무 큽니다. 파일당 최대 1GB까지 업로드할 수 있습니다."));
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<StatusResponse> handleMultipartException() {
        return ResponseEntity.badRequest()
                .body(StatusResponse.fail("업로드 요청 형식이 올바르지 않습니다. 파일을 다시 선택해 주세요."));
    }
}

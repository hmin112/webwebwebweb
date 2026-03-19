package kr.co.devsign.devsign_backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.devsign.devsign_backend.service.BoardService;
import kr.co.devsign.devsign_backend.util.JwtUtil;
import kr.co.devsign.devsign_backend.dto.board.CreateCommentRequest;
import kr.co.devsign.devsign_backend.dto.board.CreatePostRequest;
import kr.co.devsign.devsign_backend.dto.board.PostResponse;
import kr.co.devsign.devsign_backend.dto.board.UpdatePostRequest;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;
    private final JwtUtil jwtUtil;

    @GetMapping
    public List<PostResponse> getAllPosts() {
        return boardService.getAllPosts();
    }

    // ✨ [수정] @RequestBody 대신 @ModelAttribute와 MultipartFile 리스트를 받습니다.
    @PostMapping
    public PostResponse createPost(
            @ModelAttribute CreatePostRequest payload,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return boardService.createPost(payload, files, loginId, request.getRemoteAddr());
    }

    @GetMapping("/{id}")
    public PostResponse getPostDetail(@PathVariable Long id, HttpServletRequest request) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return boardService.getPostDetail(id, loginId);
    }

    // ✨ [수정] 수정 시에도 새롭게 추가된 파일들을 받을 수 있도록 변경했습니다.
    @PutMapping("/{id}")
    public PostResponse updatePost(
            @PathVariable Long id,
            @ModelAttribute UpdatePostRequest payload,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return boardService.updatePost(id, payload, files, loginId, request.getRemoteAddr());
    }

    @DeleteMapping("/{id}")
    public StatusResponse deletePost(
            @PathVariable Long id,
            HttpServletRequest request // ✨ [수정 완료] @ 제거하여 컴파일 에러 해결
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return boardService.deletePost(id, loginId, request.getRemoteAddr());
    }

    @PostMapping("/{id}/like")
    public PostResponse toggleLike(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return boardService.toggleLike(id, loginId, request.getRemoteAddr());
    }

    @PostMapping("/{id}/comments")
    public PostResponse addComment(
            @PathVariable Long id,
            @RequestBody CreateCommentRequest payload,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return boardService.addComment(id, payload, loginId, request.getRemoteAddr());
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    public PostResponse deleteComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return boardService.deleteComment(postId, commentId, loginId, request.getRemoteAddr());
    }

    @PostMapping("/{postId}/comments/{commentId}/like")
    public PostResponse toggleCommentLike(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            HttpServletRequest request
    ) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return boardService.toggleCommentLike(postId, commentId, loginId);
    }
}
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

    @PostMapping
    public PostResponse createPost(@RequestBody CreatePostRequest payload, HttpServletRequest request) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return boardService.createPost(payload, loginId, request.getRemoteAddr());
    }

    @GetMapping("/{id}")
    public PostResponse getPostDetail(@PathVariable Long id, HttpServletRequest request) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return boardService.getPostDetail(id, loginId);
    }

    @PutMapping("/{id}")
    public PostResponse updatePost(@PathVariable Long id, @RequestBody UpdatePostRequest payload, HttpServletRequest request) {
        String loginId = jwtUtil.getLoginIdFromRequest(request);
        return boardService.updatePost(id, payload, loginId, request.getRemoteAddr());
    }

    @DeleteMapping("/{id}")
    public StatusResponse deletePost(
            @PathVariable Long id,
            HttpServletRequest request
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

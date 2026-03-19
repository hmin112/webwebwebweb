package kr.co.devsign.devsign_backend.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import kr.co.devsign.devsign_backend.entity.Comment;
import kr.co.devsign.devsign_backend.entity.CommentLike;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.entity.Post;
import kr.co.devsign.devsign_backend.entity.PostLike;
import kr.co.devsign.devsign_backend.entity.PostView;
import kr.co.devsign.devsign_backend.repository.CommentLikeRepository;
import kr.co.devsign.devsign_backend.repository.CommentRepository;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import kr.co.devsign.devsign_backend.repository.PostLikeRepository;
import kr.co.devsign.devsign_backend.repository.PostRepository;
import kr.co.devsign.devsign_backend.repository.PostViewRepository;
import kr.co.devsign.devsign_backend.dto.board.CommentResponse;
import kr.co.devsign.devsign_backend.dto.board.CreateCommentRequest;
import kr.co.devsign.devsign_backend.dto.board.CreatePostRequest;
import kr.co.devsign.devsign_backend.dto.board.PostResponse;
import kr.co.devsign.devsign_backend.dto.board.UpdatePostRequest;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final PostRepository postRepository;
    private final MemberRepository memberRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostViewRepository postViewRepository;
    private final CommentLikeRepository commentLikeRepository;

    private final AccessLogService accessLogService;

    // ✨ application.properties에서 설정한 저장 경로를 가져옵니다.
    @Value("${app.upload.base-dir}")
    private String uploadDir;

    @PersistenceContext
    private EntityManager entityManager;

    public List<PostResponse> getAllPosts() {
        return postRepository.findAllByOrderByIdDesc().stream()
                .map(this::toPostResponse)
                .toList();
    }

    // ✨ [수정] MultipartFile 리스트를 받아 파일로 저장하는 로직이 추가되었습니다.
    @Transactional
    public PostResponse createPost(CreatePostRequest payload, List<MultipartFile> files, String loginId, String ip) {
        Member member = memberRepository.findByLoginId(loginId).orElseThrow();

        Post post = new Post();
        post.setTitle(payload.title());
        post.setContent(payload.content());
        post.setCategory(payload.category());

        // 🚀 이미지 파일 저장 처리
        List<String> imageUrls = saveFiles(files);
        post.setImages(imageUrls);

        post.setAuthor(member.getName());
        post.setLoginId(member.getLoginId());
        post.setStudentId(member.getStudentId());
        post.setProfileImage(member.getProfileImage());
        post.setDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("MM.dd HH:mm")));

        Post saved = postRepository.save(post);
        accessLogService.logByLoginId(loginId, "POST_CREATE", ip);
        return toPostResponse(saved);
    }

    @Transactional
    public PostResponse getPostDetail(Long id, String loginId) {
        Post post = postRepository.findById(id).orElseThrow();
        Member member = memberRepository.findByLoginId(loginId != null ? loginId : "").orElse(null);

        if (member != null) {
            if (!postViewRepository.existsByMemberAndPost(member, post)) {
                post.setViews(post.getViews() + 1);
                postRepository.save(post);

                PostView view = new PostView();
                view.setMember(member);
                view.setPost(post);
                postViewRepository.save(view);
            }
            syncLikedStatus(post, member);
        }
        return toPostResponse(post);
    }

    // ✨ [수정] 수정 시 기존 이미지 유지 + 새 파일 추가 로직이 반영되었습니다.
    @Transactional
    public PostResponse updatePost(Long id, UpdatePostRequest payload, List<MultipartFile> files, String loginId, String ip) {
        Post post = postRepository.findById(id).orElseThrow();
        validatePostOwnership(post, loginId);

        post.setTitle(payload.title());
        post.setContent(payload.content());
        post.setCategory(payload.category());

        // 🚀 이미지 수정 로직: 기존 이미지(프론트에서 남겨둔 것) + 새로 업로드한 파일
        List<String> currentImages = payload.images() != null ? new ArrayList<>(payload.images()) : new ArrayList<>();
        currentImages.addAll(saveFiles(files));
        post.setImages(currentImages);

        accessLogService.logByLoginId(loginId, "POST_UPDATE", ip);
        return toPostResponse(postRepository.save(post));
    }

    // ✨ [신규] 파일을 물리적으로 저장하고 접근 가능한 URL 리스트를 반환하는 공통 메서드
    private List<String> saveFiles(List<MultipartFile> files) {
        List<String> urls = new ArrayList<>();
        if (files == null || files.isEmpty()) return urls;

        File directory = new File(uploadDir);
        if (!directory.exists()) {
            directory.mkdirs(); // /app/uploads 폴더가 없으면 생성
        }

        for (MultipartFile file : files) {
            if (!file.isEmpty()) {
                // 파일명 중복 방지를 위한 UUID 적용
                String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
                File dest = new File(directory, fileName);
                try {
                    file.transferTo(dest); // 실제 서버 폴더로 파일 이동
                    urls.add("/uploads/" + fileName); // 브라우저에서 접근할 URL 경로 저장
                } catch (IOException e) {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 저장 중 오류가 발생했습니다.");
                }
            }
        }
        return urls;
    }

    @Transactional
    public StatusResponse deletePost(Long id, String loginId, String ip) {
        Post post = postRepository.findById(id).orElseThrow();
        validatePostOwnership(post, loginId);

        postLikeRepository.deleteByPost(post);
        postViewRepository.deleteByPost(post);

        if (post.getCommentsList() != null) {
            for (Comment comment : post.getCommentsList()) {
                commentLikeRepository.deleteByComment(comment);
            }
        }
        commentRepository.deleteByPost(post);
        postRepository.delete(post);

        accessLogService.logByLoginId(loginId, "POST_DELETE", ip);
        return StatusResponse.success();
    }

    @Transactional
    public PostResponse toggleLike(Long id, String loginId, String ip) {
        Post post = postRepository.findById(id).orElseThrow();
        Member member = memberRepository.findByLoginId(loginId).orElseThrow();

        Optional<PostLike> existingLike = postLikeRepository.findByMemberAndPost(member, post);

        if (existingLike.isPresent()) {
            postLikeRepository.delete(existingLike.get());
            post.setLikes(Math.max(0, post.getLikes() - 1));
        } else {
            PostLike newLike = new PostLike();
            newLike.setMember(member);
            newLike.setPost(post);
            postLikeRepository.save(newLike);
            post.setLikes(post.getLikes() + 1);
            accessLogService.logByLoginId(loginId, "LIKE", ip);
        }

        postRepository.save(post);

        entityManager.flush();
        entityManager.clear();

        Post updatedPost = postRepository.findById(id).orElseThrow();
        Member freshMember = memberRepository.findByLoginId(loginId).orElseThrow();
        syncLikedStatus(updatedPost, freshMember);
        return toPostResponse(updatedPost);
    }

    @Transactional
    public PostResponse addComment(Long postId, CreateCommentRequest payload, String loginId, String ip) {
        Post post = postRepository.findById(postId).orElseThrow();
        Member member = memberRepository.findByLoginId(loginId).orElseThrow();

        Comment comment = new Comment();
        comment.setContent(payload.content());
        comment.setAuthor(member.getName());
        comment.setLoginId(member.getLoginId());
        comment.setStudentId(member.getStudentId());
        comment.setProfileImage(member.getProfileImage());
        comment.setDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("MM.dd HH:mm")));
        comment.setPost(post);

        if (payload.parentId() != null) {
            Comment parent = commentRepository.findById(payload.parentId()).orElseThrow();
            comment.setParent(parent);
            comment.setReply(true);
        }

        commentRepository.save(comment);
        accessLogService.logByLoginId(loginId, "COMMENT_CREATE", ip);

        entityManager.flush();
        entityManager.clear();

        Post updatedPost = postRepository.findById(postId).orElseThrow();
        Member freshMember = memberRepository.findByLoginId(loginId).orElseThrow();
        syncLikedStatus(updatedPost, freshMember);
        return toPostResponse(updatedPost);
    }

    @Transactional
    public PostResponse deleteComment(Long postId, Long commentId, String loginId, String ip) {
        Comment comment = commentRepository.findById(commentId).orElseThrow();
        validateCommentOwnership(postId, comment, loginId);

        List<Comment> deleteTargets = new ArrayList<>();
        collectCommentsForDelete(comment, deleteTargets);

        for (Comment target : deleteTargets) {
            commentLikeRepository.deleteByComment(target);
        }
        for (Comment target : deleteTargets) {
            commentRepository.delete(target);
        }

        accessLogService.logByLoginId(loginId, "COMMENT_DELETE", ip);

        entityManager.flush();
        entityManager.clear();

        Post post = postRepository.findById(postId).orElseThrow();
        Member freshMember = memberRepository.findByLoginId(loginId).orElse(null);
        syncLikedStatus(post, freshMember);
        return toPostResponse(post);
    }

    private void collectCommentsForDelete(Comment current, List<Comment> result) {
        if (current.getReplies() != null && !current.getReplies().isEmpty()) {
            for (Comment reply : current.getReplies()) {
                collectCommentsForDelete(reply, result);
            }
        }
        result.add(current);
    }

    @Transactional
    public PostResponse toggleCommentLike(Long postId, Long commentId, String loginId) {
        Comment comment = commentRepository.findById(commentId).orElseThrow();
        Member member = memberRepository.findByLoginId(loginId).orElseThrow();

        Optional<CommentLike> existing = commentLikeRepository.findByMemberAndComment(member, comment);

        if (existing.isPresent()) {
            commentLikeRepository.delete(existing.get());
            comment.setLikes(Math.max(0, comment.getLikes() - 1));
        } else {
            CommentLike cl = new CommentLike();
            cl.setMember(member);
            cl.setComment(comment);
            commentLikeRepository.save(cl);
            comment.setLikes(comment.getLikes() + 1);
        }
        commentRepository.save(comment);

        entityManager.flush();
        entityManager.clear();

        Post post = postRepository.findById(postId).orElseThrow();
        Member freshMember = memberRepository.findByLoginId(loginId).orElseThrow();
        syncLikedStatus(post, freshMember);
        return toPostResponse(post);
    }

    private void syncLikedStatus(Post post, Member member) {
        if (member == null) return;

        post.setLikedByMe(postLikeRepository.existsByMemberAndPost(member, post));

        if (post.getCommentsList() != null) {
            post.getCommentsList().forEach(comment -> {
                comment.setLikedByMe(commentLikeRepository.existsByMemberAndComment(member, comment));

                if (comment.getReplies() != null) {
                    comment.getReplies().forEach(reply ->
                            reply.setLikedByMe(commentLikeRepository.existsByMemberAndComment(member, reply))
                    );
                }
            });
        }
    }

    private void validatePostOwnership(Post post, String loginId) {
        if (loginId == null || loginId.isBlank() || !loginId.equals(post.getLoginId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 글만 수정/삭제할 수 있습니다.");
        }
    }

    private void validateCommentOwnership(Long postId, Comment comment, String loginId) {
        if (comment.getPost() == null || !comment.getPost().getId().equals(postId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 게시글의 댓글이 아닙니다.");
        }

        if (loginId == null || loginId.isBlank() || !loginId.equals(comment.getLoginId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 댓글/대댓글만 삭제할 수 있습니다.");
        }
    }

    private PostResponse toPostResponse(Post post) {
        List<CommentResponse> comments = post.getCommentsList() == null
                ? List.of()
                : post.getCommentsList().stream().map(this::toCommentResponse).toList();

        return new PostResponse(
                post.getId(),
                post.getTitle(),
                post.getContent(),
                post.getCategory(),
                post.getAuthor(),
                post.getLoginId(),
                post.getStudentId(),
                post.getProfileImage(),
                post.getViews(),
                post.getLikes(),
                post.isLikedByMe(),
                post.getImages() == null ? List.of() : post.getImages(),
                comments,
                post.getCreatedAt(),
                post.getDate()
        );
    }

    private CommentResponse toCommentResponse(Comment comment) {
        List<CommentResponse> replies = comment.getReplies() == null
                ? List.of()
                : comment.getReplies().stream().map(this::toCommentResponse).toList();

        return new CommentResponse(
                comment.getId(),
                comment.getContent(),
                comment.getAuthor(),
                comment.getLoginId(),
                comment.getStudentId(),
                comment.getProfileImage(),
                comment.getDate(),
                comment.getCreatedAt(),
                comment.getLikes(),
                comment.isLikedByMe(),
                comment.isReply(),
                replies
        );
    }
}
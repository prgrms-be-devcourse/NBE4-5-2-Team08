package com.team8.project2.domain.comment.controller;

import com.team8.project2.domain.comment.dto.CommentDto;
import com.team8.project2.domain.comment.service.CommentService;
import com.team8.project2.domain.member.entity.Member;
import com.team8.project2.global.Rq;
import com.team8.project2.global.dto.RsData;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 댓글(Comment) API 컨트롤러 클래스입니다.
 * 댓글 생성, 조회 및 삭제 기능을 제공합니다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/curations/{curationId}/comments")
public class ApiV1CommentController {

	private final CommentService commentService;

	private final Rq rq;

	/**
	 * 새로운 댓글을 생성합니다.
	 * @param commentDto 댓글 생성 요청 데이터
	 * @return 생성된 댓글 정보를 포함한 응답
	 */
	@PostMapping
	public RsData<CommentDto> createComment(@PathVariable Long curationId, @RequestBody CommentDto commentDto) {
		Member actor = rq.getActor();
		CommentDto createdComment = commentService.createComment(actor, curationId, commentDto);
		return new RsData("200-2", "댓글이 작성되었습니다.", createdComment);
	}

	/**
	 * 특정 큐레이션에 속한 댓글 목록을 조회합니다.
	 * @param curationId 큐레이션 ID
	 * @return 해당 큐레이션의 댓글 목록을 포함한 응답
	 */
	@GetMapping
	public RsData<List<CommentDto>> getCommentsByCurationId(@PathVariable Long curationId) {
		List<CommentDto> comments = commentService.getCommentsByCurationId(curationId);
		return new RsData("200-2", "댓글이 조회되었습니다.", comments);
	}

	/**
	 * 특정 댓글을 수정합니다.
	 * @param commentId 수정할 댓글 ID
	 * @param commentDto 댓글 수정 요청 데이터
	 * @return 수정된 댓글
	 */
	@PutMapping("/{id}")
	@PreAuthorize("@commentService.canEdit(#commentId, #userDetails)")
	public RsData<CommentDto> updateComment(
		@PathVariable(name = "id") Long commentId,
		@RequestBody CommentDto commentDto,
		@AuthenticationPrincipal UserDetails userDetails
	) {
		CommentDto updatedComment = commentService.updateComment(commentId, commentDto, userDetails.getUsername());
		return new RsData("200-2", "댓글이 수정되었습니다.", updatedComment);
	}

	/**
	 * 특정 댓글을 삭제합니다.
	 * @param commentId 삭제할 댓글 ID
	 * @return 빈 응답 객체를 포함한 응답
	 */
	@DeleteMapping("/{id}")
	@PreAuthorize("@commentService.canDelete(#commentId, #userDetails)")
	public RsData<Void> deleteComment(
		@PathVariable(name = "id") Long commentId,
		@AuthenticationPrincipal UserDetails userDetails
	) {
		commentService.deleteComment(commentId, userDetails.getUsername());
		return new RsData<>("200-1", "댓글이 삭제되었습니다.");
	}
}


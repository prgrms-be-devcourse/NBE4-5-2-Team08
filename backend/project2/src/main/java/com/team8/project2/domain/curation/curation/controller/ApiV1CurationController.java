package com.team8.project2.domain.curation.curation.controller;

import com.team8.project2.domain.curation.curation.dto.CurationDetailResDto;
import com.team8.project2.domain.curation.curation.dto.CurationReqDTO;
import com.team8.project2.domain.curation.curation.dto.CurationResDto;
import com.team8.project2.domain.curation.curation.dto.TrendingCurationResDto;
import com.team8.project2.domain.curation.curation.entity.Curation;
import com.team8.project2.domain.curation.curation.entity.SearchOrder;
import com.team8.project2.domain.curation.curation.service.CurationService;
import com.team8.project2.domain.curation.report.entity.ReportType;
import com.team8.project2.domain.curation.tag.dto.TagResDto;
import com.team8.project2.domain.curation.tag.service.TagService;
import com.team8.project2.domain.member.entity.Member;
import com.team8.project2.domain.member.service.MemberService;
import com.team8.project2.domain.playlist.dto.PlaylistDto;
import com.team8.project2.domain.playlist.service.PlaylistService;
import com.team8.project2.global.Rq;
import com.team8.project2.global.dto.RsData;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 큐레이션(Curation) API 컨트롤러 클래스입니다.
 * 큐레이션 생성, 수정, 삭제, 조회 및 검색 기능을 제공합니다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/curation")
public class ApiV1CurationController {

    private final CurationService curationService;

    private final Rq rq;
    private final PlaylistService playlistService;
    private final TagService tagService;

    /**
     * 새로운 큐레이션을 생성합니다.
     * @param curationReq 큐레이션 생성 요청 데이터
     * @return 생성된 큐레이션 정보 응답
     */
    @PostMapping
    public RsData<CurationResDto> createCuration(@RequestBody CurationReqDTO curationReq) {
        Member member = rq.getActor();

        Curation createdCuration = curationService.createCuration(
                curationReq.getTitle(),
                curationReq.getContent(),
                curationReq.getLinkReqDtos().stream().map(url -> url.getUrl()).collect(Collectors.toUnmodifiableList()),
                curationReq.getTagReqDtos().stream().map(tag -> tag.getName()).collect(Collectors.toUnmodifiableList()),
                member
        );
        return new RsData<>("201-1", "글이 성공적으로 생성되었습니다.", new CurationResDto(createdCuration));
    }

    /**
     * 기존 큐레이션을 수정합니다.
     * @param id 큐레이션 ID
     * @param curationReq 큐레이션 수정 요청 데이터
     * @return 수정된 큐레이션 정보 응답
     */
    @PutMapping("/{id}")
    public RsData<CurationResDto> updateCuration(@PathVariable Long id, @RequestBody CurationReqDTO curationReq) {
        Member member = rq.getActor();

        Curation updatedCuration = curationService.updateCuration(
                id,
                curationReq.getTitle(),
                curationReq.getContent(),
                curationReq.getLinkReqDtos().stream().map(url -> url.getUrl()).collect(Collectors.toUnmodifiableList()),
                curationReq.getTagReqDtos().stream().map(tag -> tag.getName()).collect(Collectors.toUnmodifiableList()),
                member
        );
        return new RsData<>("200-1", "글이 성공적으로 수정되었습니다.", new CurationResDto(updatedCuration));
    }

    /**
     * 특정 큐레이션을 삭제합니다.
     * @param id 큐레이션 ID
     * @return 삭제 성공 응답
     */
    @DeleteMapping("/{id}")
    public RsData<Void> deleteCuration(@PathVariable Long id) {
        Member member = rq.getActor();
        curationService.deleteCuration(id, member);
        return new RsData<>("204-1", "글이 성공적으로 삭제되었습니다.", null);
    }

    /**
     * 특정 큐레이션을 조회합니다.
     * @param id 큐레이션 ID
     * @return 조회된 큐레이션 정보 응답
     */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public RsData<CurationDetailResDto> getCuration(@PathVariable Long id, HttpServletRequest request) {
        // 큐레이션 서비스 호출 시 IP를 전달
        CurationDetailResDto curationDetailResDto = curationService.getCuration(id, request);

        return new RsData<>("200-1", "조회 성공", curationDetailResDto);
    }

    /**
     * 큐레이션을 검색하거나 전체 조회합니다.
     * @param tags 태그 목록 (선택적)
     * @param title 제목 검색어 (선택적)
     * @param content 내용 검색어 (선택적)
     * @param order 정렬 기준 (기본값: 최신순)
     * @return 검색된 큐레이션 목록 응답
     */
    @GetMapping
    @Transactional(readOnly = true)
    public RsData<List<CurationResDto>> searchCuration(
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String content,
            @RequestParam(required = false) String author,
            @RequestParam(required = false, defaultValue = "LATEST") SearchOrder order,
            @RequestParam(defaultValue = "0") int page,  // 기본값 0
            @RequestParam(defaultValue = "20") int size // 기본값 20
    ) {
        List<CurationResDto> result = curationService.searchCurations(tags, title, content, author, order, page, size)
                .stream()
                .map(CurationResDto::new)
                .collect(Collectors.toUnmodifiableList());

        return new RsData<>("200-1", "글이 검색되었습니다.", result);
    }

    @GetMapping("/author/{username}")
    public RsData<List<CurationResDto>> searchCurationByUserName(@PathVariable String username) {
        List<CurationResDto> result = curationService.searchCurationByUserName(username);
        return new RsData<>("200-1", "작성자로 큐레이션이 검색되었습니다.", result);
    }

    /**
     * 특정 큐레이션에 좋아요를 추가합니다.
     * @param id 큐레이션 ID
     * @return 좋아요 성공 응답
     */
    @PostMapping("/like/{id}")
    @PreAuthorize("isAuthenticated()")
    public RsData<Void> likeCuration(@PathVariable Long id) {
       Long memberId = rq.getActor().getId();
        curationService.likeCuration(id, memberId);
        return new RsData<>("200-1", "글에 좋아요를 했습니다.", null);
    }

    /**
     * 특정 큐레이션에 대해 사용자가 좋아요를 눌렀는지 확인합니다.
     * @param id 큐레이션 ID
     * @return 좋아요 여부 응답 (true: 좋아요 누름, false: 좋아요 안 누름)
     */
    @GetMapping("/like/{id}/status")
    public RsData<Boolean> isCurationLiked(@PathVariable Long id) {
       Long memberId = rq.getActor().getId();
        boolean isLiked = curationService.isLikedByMember(id, memberId);
        return new RsData<>("200-1", "좋아요 여부 확인 성공", isLiked);
    }
  
    @GetMapping("/following")
    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public RsData<List<CurationResDto>> followingCuration() {
        Member actor = rq.getActor();
        List<CurationResDto> curations = curationService.getFollowingCurations(actor);
        return new RsData<>("200-1", "팔로우중인 큐레이터의 큐레이션이 조회되었습니다.", curations);
    }

    record CurationReportReqDto(@NotNull String reportType) {
    }

    @PostMapping("/{id}/report")
    @PreAuthorize("isAuthenticated()")
    public RsData<Void> reportCuration(@PathVariable Long id, @RequestBody @Valid CurationReportReqDto curationReportReqDto) {
        ReportType reportType = ReportType.fromString(curationReportReqDto.reportType());
        curationService.reportCuration(id, reportType);
        return new RsData<>("200-1", "신고가 접수되었습니다.");
    }

    /**
     * 특정 큐레이션에 속한 플레이리스트 목록을 조회합니다.
     * @param curationId
     * @return
     */
    @GetMapping("/{curationId}/playlists")
    @Transactional(readOnly = true)
    public RsData<List<PlaylistDto>> getPlaylistsForCuration(@PathVariable Long curationId) {
        Member member = rq.getActor();
        List<PlaylistDto> playlists = playlistService.getPlaylistsByMemberAndCuration(member, curationId);
        return RsData.success("플레이리스트 조회 성공", playlists);
    }

    @GetMapping("/trending-tag")
    public RsData<TagResDto> trendingTag() {
        TagResDto tagResDto = tagService.getTrendingTag();
        return new RsData<>("200-1", "트렌딩 태그가 조회되었습니다.", tagResDto);
    }

    @GetMapping("/trending-curation")
    public RsData<TrendingCurationResDto> trendingCuration() {
        TrendingCurationResDto trendingCurationResDto = curationService.getTrendingCuration();
        return new RsData<>("200-1", "트렌딩 큐레이션이 조회되었습니다.", trendingCurationResDto);
    }
}

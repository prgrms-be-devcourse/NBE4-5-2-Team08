package com.team8.project2.domain.curation.curation.repository;

import com.team8.project2.domain.curation.curation.entity.Curation;
import com.team8.project2.domain.member.entity.Member;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 큐레이션(Curation) 데이터를 관리하는 레포지토리 인터페이스입니다.
 * 큐레이션 검색 기능을 포함하고 있습니다.
 */
@Repository
public interface CurationRepository extends JpaRepository<Curation, Long> {

	@Query("SELECT COUNT(c) FROM Curation c WHERE c.member.memberId = :memberId")
	long countByMemberId(@Param("memberId") String memberId);

	/**
	 * 필터 조건을 기반으로 큐레이션을 검색하는 메서드입니다.
	 * 제목, 내용, 태그를 기준으로 검색하며, 정렬 방식(최신순, 오래된순, 좋아요순)을 지원합니다.
	 *
	 * @param tags 태그 목록 (선택적)
	 * @param title 제목 검색어 (선택적)
	 * @param content 내용 검색어 (선택적)
	 * @return 검색된 큐레이션 목록
	 */
	@Query("SELECT c FROM Curation c " +
		"LEFT JOIN c.tags ct " +
		"LEFT JOIN ct.tag t " +
		"WHERE (:title IS NULL OR c.title LIKE %:title%) " +
		"AND (:content IS NULL OR c.content LIKE %:content%) " +
		"AND (:author IS NULL OR c.member.username LIKE %:author%) " +
		"AND (:tags IS NULL OR t.name IN :tags) " +
		"GROUP BY c.id " +
		"HAVING COUNT(DISTINCT t.name) = :tagsSize")
	Page<Curation> searchByFilters(@Param("tags") List<String> tags,
		@Param("tagsSize") int tagsSize,
		@Param("title") String title,
		@Param("content") String content,
		@Param("author") String author,
		Pageable pageable);

	@Query("SELECT c FROM Curation c " +
		"LEFT JOIN c.tags ct " +
		"LEFT JOIN ct.tag t " +
		"WHERE (:title IS NULL OR c.title LIKE %:title%) " +
		"AND (:content IS NULL OR c.content LIKE %:content%) " +
		"AND (:author IS NULL OR c.member.username LIKE %:author%) " +
		"AND (:tags IS NULL OR t.name IN :tags)")
	Page<Curation> searchByFiltersWithoutTags(@Param("tags") List<String> tags,
		@Param("title") String title,
		@Param("content") String content,
		@Param("author") String author,
		Pageable pageable);

	@Query("SELECT c FROM Curation c WHERE c.member IN (SELECT f.followee FROM Follow f WHERE f.follower.id = :userId) ORDER BY c.createdAt DESC")
	List<Curation> findFollowingCurations(@Param("userId") Long userId);

	/**
	 * 일정 개수 이상 신고된 큐레이션을 조회하는 메서드
	 *
	 * @param minReports 최소 신고 개수
	 * @return 일정 개수 이상 신고된 큐레이션 목록
	 */
	@Query("SELECT c FROM Curation c WHERE " +
			"(SELECT COUNT(r) FROM Report r WHERE r.curation.id = c.id) >= :minReports")
	List<Curation> findReportedCurations(int minReports);

	/**
	 * 전체 큐레이션의 조회수를 합산하는 메서드입니다.
	 * 조회수가 없을 경우 0을 반환합니다.
	 *
	 * @return 전체 큐레이션의 조회수 합산 값
	 */
	@Query("SELECT COALESCE(SUM(c.viewCount), 0) FROM Curation c")
	long sumTotalViews();

	/**
	 * 전체 큐레이션의 좋아요 수를 합산하는 메서드입니다.
	 * 좋아요 수가 없을 경우 0을 반환합니다.
	 *
	 * @return 전체 큐레이션의 좋아요 합산 값
	 */
	@Query("SELECT COALESCE(SUM(c.likeCount), 0) FROM Curation c")
	long sumTotalLikes();

	long countByMember(Member member);

    List<Curation> findAllByMember(Member member);

	void deleteByMember(Member member);

	List<Curation> findTop3ByOrderByViewCountDesc();
}

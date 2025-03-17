package com.team8.project2.domain.curation.curation.service;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.team8.project2.domain.curation.curation.dto.CurationDetailResDto;
import com.team8.project2.domain.curation.curation.dto.CurationResDto;
import com.team8.project2.domain.curation.curation.dto.TrendingCurationResDto;
import com.team8.project2.domain.curation.curation.entity.Curation;
import com.team8.project2.domain.curation.curation.entity.CurationLink;
import com.team8.project2.domain.curation.curation.entity.CurationTag;
import com.team8.project2.domain.curation.curation.entity.SearchOrder;
import com.team8.project2.domain.curation.curation.event.CurationDeleteEvent;
import com.team8.project2.domain.curation.curation.event.CurationUpdateEvent;
import com.team8.project2.domain.curation.curation.repository.CurationLinkRepository;
import com.team8.project2.domain.curation.curation.repository.CurationRepository;
import com.team8.project2.domain.curation.curation.repository.CurationTagRepository;
import com.team8.project2.domain.curation.like.entity.Like;
import com.team8.project2.domain.curation.like.repository.LikeRepository;
import com.team8.project2.domain.curation.report.entity.Report;
import com.team8.project2.domain.curation.report.entity.ReportType;
import com.team8.project2.domain.curation.report.repository.ReportRepository;
import com.team8.project2.domain.curation.tag.service.TagService;
import com.team8.project2.domain.image.entity.CurationImage;
import com.team8.project2.domain.image.repository.CurationImageRepository;
import com.team8.project2.domain.link.service.LinkService;
import com.team8.project2.domain.member.entity.Member;
import com.team8.project2.domain.member.repository.FollowRepository;
import com.team8.project2.domain.member.repository.MemberRepository;
import com.team8.project2.domain.member.service.MemberService;
import com.team8.project2.global.Rq;
import com.team8.project2.global.exception.ServiceException;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

/**
 * 큐레이션 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 * 큐레이션 생성, 수정, 삭제, 조회 및 좋아요 기능을 제공합니다.
 */
@Service
@RequiredArgsConstructor
public class CurationService {

	private final CurationRepository curationRepository;
	private final CurationLinkRepository curationLinkRepository;
	private final CurationTagRepository curationTagRepository;
	private final CurationImageRepository curationImageRepository;
	private final LinkService linkService;
	private final TagService tagService;
	private final MemberRepository memberRepository;
	private final LikeRepository likeRepository;
	private final ApplicationEventPublisher eventPublisher;
	private final CurationViewService curationViewService;
	private final Rq rq;

	private final RedisTemplate<String, String> redisTemplate;
	private static final String VIEW_COUNT_KEY = "view_count:"; // Redis 키 접두사
	private static final String DAY_VIEW_COUNT_KEY = "day_view_count:"; // Redis 키 접두사
	private static final String LIKE_COUNT_KEY = "curation:like_count"; // 좋아요 수 저장
	private final FollowRepository followRepository;
	private final MemberService memberService;
	private final ReportRepository reportRepository;

	/**
	 * ✅ 특정 큐레이터의 큐레이션 개수를 반환하는 메서드 추가
	 * @param member 조회할 큐레이터의 memberId
	 * @return 해당 큐레이터가 작성한 큐레이션 개수
	 */
	@Transactional
	public long countByMember(Member member) {
		return curationRepository.countByMemberId(member.getMemberId());
	}

	/**
	 * 큐레이션을 생성합니다.
	 * @param title 큐레이션 제목
	 * @param content 큐레이션 내용
	 * @param urls 연결된 링크 목록
	 * @param tags 연결된 태그 목록
	 * @return 생성된 큐레이션 객체
	 */
	@Transactional
	public Curation createCuration(String title, String content, List<String> urls, List<String> tags, Member member) {
		Curation curation = Curation.builder()
			.member(member)
			.title(title)
			.content(content)
			.comments(List.of())
			.build();
		curationRepository.save(curation);

		// 큐레이션 - 링크 연결
		List<CurationLink> curationLinks = urls.stream()
			.map(url -> {
				CurationLink curationLink = new CurationLink();
				return curationLink.setCurationAndLink(curation, linkService.getLink(url));
			}).collect(Collectors.toList());
		curationLinkRepository.saveAll(curationLinks);
		curation.setCurationLinks(curationLinks);

		// 큐레이션 - 태그 연결
		List<CurationTag> curationTags = tags.stream()
			.map(tag -> {
				CurationTag curationTag = new CurationTag();
				return curationTag.setCurationAndTag(curation, tagService.getTag(tag));
			}).collect(Collectors.toList());
		curationTagRepository.saveAll(curationTags);
		curation.setTags(curationTags);

		// 작성한 큐레이션에 이미지가 첨부되어 있다면, 이미지에 큐레이션 번호를 연결 (연결이 이미 있는 이미지는 무시)
		List<String> imageNames = curation.getImageNames();

		for (int i = 0; i < imageNames.size(); i++) {
			System.out.println(i + ": " + imageNames.get(i));
		}

		for (String imageName : imageNames) {
			Optional<CurationImage> opImage = curationImageRepository.findByImageName(imageName);
			if (opImage.isPresent()) {
				CurationImage curationImage = opImage.get();
				curationImage.setCurationIdIfNull(curation.getId());
				curationImageRepository.save(curationImage);
			}
		}

		return curation;
	}

	/**
	 * 큐레이션을 수정합니다.
	 * @param curationId 수정할 큐레이션 ID
	 * @param title 새로운 제목
	 * @param content 새로운 내용
	 * @param urls 새로 연결할 링크 목록
	 * @param tags 새로 연결할 태그 목록
	 * @return 수정된 큐레이션 객체
	 */
	@Transactional
	public Curation updateCuration(Long curationId, String title, String content, List<String> urls,
		List<String> tags, Member member) {
		Curation curation = curationRepository.findById(curationId)
			.orElseThrow(() -> new ServiceException("404-1", "해당 큐레이션을 찾을 수 없습니다."));

		if (!curation.getMember().getId().equals(member.getId())) {
			throw new ServiceException("403", "권한이 없습니다.");
		}

		curation.setTitle(title);
		curation.setContent(content);

		// 큐레이션 - 링크 연결 업데이트
		List<CurationLink> curationLinks = urls.stream()
			.map(url -> {
				CurationLink curationLink = new CurationLink();
				return curationLink.setCurationAndLink(curation, linkService.getLink(url));
			}).collect(Collectors.toList());
		curationLinkRepository.saveAll(curationLinks);
		curation.getCurationLinks().clear();
		curation.getCurationLinks().addAll(curationLinks);

		// 큐레이션 - 태그 연결 업데이트
		List<CurationTag> curationTags = tags.stream()
			.map(tag -> {
				CurationTag curationTag = new CurationTag();
				return curationTag.setCurationAndTag(curation, tagService.getTag(tag));
			}).collect(Collectors.toList());
		curationTagRepository.saveAll(curationTags);
		curation.getTags().clear();
		curation.getTags().addAll(curationTags);

		Curation result = curationRepository.save(curation);

		// 큐레이션 수정 이벤트
		eventPublisher.publishEvent(CurationUpdateEvent.builder()
			.curationId(curation.getId())
			.imageUrls(curation.getImageNames())
			.build());

		return result;
	}

	/**
	 * 큐레이션을 삭제합니다.
	 * @param curationId 삭제할 큐레이션 ID
	 */
	@Transactional
	public void deleteCuration(Long curationId, Member member) {
		// 큐레이션이 존재하는지 확인
		Curation curation = curationRepository.findById(curationId)
			.orElseThrow(() -> new ServiceException("404-1", "해당 큐레이션을 찾을 수 없습니다."));

		// 삭제 권한이 있는지 확인 (작성자와 요청자가 같은지 확인)
		System.out.println("어드민이야?" + member.isAdmin());
		System.out.println("어드민이야?" + curation.getMember().getId());
		System.out.println("어드민이야?" + member.getMemberId());
		if (!curation.getMember().getId().equals(member.getId()) && !member.isAdmin()) {
			throw new ServiceException("403-1", "권한이 없습니다."); // 권한 없음
		}
		curationLinkRepository.deleteByCurationId(curationId);
		curationTagRepository.deleteByCurationId(curationId);
		curationRepository.deleteById(curationId);

		// 조회 IP 정보 삭제
		Set<String> keys = redisTemplate.keys(VIEW_COUNT_KEY + curationId + "*");
		if (keys != null && !keys.isEmpty()) {
			redisTemplate.delete(keys);
		}

		// 일일 조회수 삭제
		redisTemplate.opsForZSet().remove(DAY_VIEW_COUNT_KEY, String.valueOf(curationId));

		// 큐레이션 삭제 이벤트
		eventPublisher.publishEvent(new CurationDeleteEvent(curationId));
	}

	/**
	 * 특정 큐레이션을 조회합니다.
	 * @param curationId 조회할 큐레이션 ID
	 * @return 조회된 큐레이션 객체
	 */
	@Transactional
	public CurationDetailResDto getCuration(Long curationId, HttpServletRequest request) {
		String ip = request.getHeader("X-Forwarded-For");

		if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
			ip = request.getHeader("Proxy-Client-IP");
		}
		if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
			ip = request.getHeader("WL-Proxy-Client-IP");
		}
		if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
			ip = request.getHeader("HTTP_CLIENT_IP");
		}
		if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
			ip = request.getHeader("HTTP_X_FORWARDED_FOR");
		}
		if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
			ip = request.getHeader("X-Real-IP");
		}
		if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
			ip = request.getHeader("X-RealIP");
		}
		if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
			ip = request.getHeader("REMOTE_ADDR");
		}
		if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
			ip = request.getRemoteAddr();
		}

		if (ip.equals("0:0:0:0:0:0:0:1") || ip.equals("127.0.0.1")) {
			InetAddress address = null;
			try {
				address = InetAddress.getLocalHost();
			} catch (UnknownHostException e) {
				throw new RuntimeException(e);
			}
			ip = address.getHostName() + "/" + address.getHostAddress();
		}
		String key = VIEW_COUNT_KEY + curationId + ":" + ip;
		System.out.println("Redis Key: " + key);
		boolean isNewView = redisTemplate.opsForValue().setIfAbsent(key, String.valueOf(true), Duration.ofDays(1));
		System.out.println("Redis Key Set? " + isNewView + " | Key: " + key);

		// 조회수 증가
		if (isNewView) {
			redisTemplate.opsForZSet().incrementScore(DAY_VIEW_COUNT_KEY, String.valueOf(curationId), 1); // curationId에 대한 조회수 증가
			redisTemplate.expire(DAY_VIEW_COUNT_KEY, Duration.ofDays(1)); // 1일 동안 유효하게 설정 (TTL)
		}

		Curation curation = curationRepository.findById(curationId)
			.orElseThrow(() -> new ServiceException("404-1", "해당 큐레이션을 찾을 수 없습니다."));

		// Redis의 좋아요 값(실제 값) 으로 수정
		String redisKey = "curation_like:" + curationId;
		Long likeCount = redisTemplate.opsForSet().size(redisKey);
		curation.setLikeCount(likeCount);

		boolean isLogin = false;
		boolean isLiked = false;
		boolean isFollowed = false;
		if (rq.isLogin()) {
			isLogin = true;
			Member actor = rq.getActor();
			isLiked = isLikedByMember(curationId, actor.getId());
			isFollowed = memberService.isFollowed(curation.getMemberId(), actor.getId());
		}

		if (isNewView) {
			curationViewService.increaseViewCount(curation);
		} else {
			System.out.println("조회수 증가 안 함 (이미 조회된 IP)");
		}

		return CurationDetailResDto.fromEntity(curation, isLiked, isFollowed, isLogin);
	}

	/**
	 * 큐레이션을 검색합니다.
	 * @param tags 태그 목록 (선택적)
	 * @param title 제목 검색어 (선택적)
	 * @param content 내용 검색어 (선택적)
	 * @param order 정렬 기준
	 * @return 검색된 큐레이션 목록
	 */
	public List<Curation> searchCurations(List<String> tags, String title, String content, String author,
		SearchOrder order, int page, int size) {

		Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
		List<Curation> curations;
		if (tags == null || tags.isEmpty()) {
			// 태그가 없을 경우 필터 없이 검색
			curations = curationRepository.searchByFiltersWithoutTags(tags, title, content, author, pageable).getContent().stream()
				.map(curation -> {
					String redisKey = "curation_like:" + curation.getId();
					curation.setLikeCount(redisTemplate.opsForSet().size(redisKey));
					return curation;
				}).collect(Collectors.toList());
		} else {
			// 태그가 있을 경우 태그 필터 적용
			curations = curationRepository.searchByFilters(tags, tags.size(), title, content, author, pageable).getContent().stream()
				.map(curation -> {
					String redisKey = "curation_like:" + curation.getId();
					curation.setLikeCount(redisTemplate.opsForSet().size(redisKey));
					return curation;
				}).collect(Collectors.toList());
		}
		// 좋아요순 검색일 경우 검색 결과를 Redis의 실제 좋아요 순으로 정렬
		if (order.equals(SearchOrder.LIKECOUNT)) {
			curations.sort(Comparator.comparing(curation -> {
				String redisKey = "curation_like:" + curation.getId();
				return redisTemplate.opsForSet().size(redisKey);
			}, Comparator.reverseOrder()));
		}
		return curations;
	}

	@Transactional
	public void likeCuration(Long curationId, Long memberId) {
		// 큐레이션과 멤버를 찾음
		Curation curation = curationRepository.findById(curationId)
			.orElseThrow(() -> new ServiceException("404-1", "해당 큐레이션을 찾을 수 없습니다."));

		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> new ServiceException("404-1", "해당 멤버를 찾을 수 없습니다."));

		// Redis Key 설정
		String redisKey = "curation_like:" + curationId;
		String value = String.valueOf(memberId);

		// LUA 스크립트: 좋아요가 있으면 삭제, 없으면 추가
		String luaScript =
				"if redis.call('SISMEMBER', KEYS[1], ARGV[1]) == 1 then " +
						"   redis.call('SREM', KEYS[1], ARGV[1]); " +
						"   return 0; " +  // 0이면 좋아요 삭제됨
						"else " +
						"   redis.call('SADD', KEYS[1], ARGV[1]); " +
						"   return 1; " +  // 1이면 좋아요 추가됨
						"end";

		// LUA 스크립트 실행
		Long result = redisTemplate.execute(
				new DefaultRedisScript<>(luaScript, Long.class),
				Collections.singletonList(redisKey),
				value
		);
	}

	@Scheduled(fixedRate = 600000) // 10분마다 실행
	public void syncLikesToDatabase() {
		// Redis에서 모든 큐레이션의 좋아요 개수를 가져와서 DB에 업데이트
		Set<String> keys = redisTemplate.keys("curation_like:*");

		for (String key : keys) {
			String[] parts = key.split(":");
			Long curationId = Long.parseLong(parts[1]);

			// Like Repo에 좋아요 정보 추가
			Set<String> memberIds = redisTemplate.opsForSet().members(key);
			for (String memberId : memberIds) {
				Curation curation = curationRepository.findById(curationId).get();
				Member member = memberRepository.findByMemberId(memberId).get();
				likeRepository.save(Like.of(curation, member));
			}

			// Redis에서 좋아요 개수 구하기
			String redisKey = "curation_like:" + curationId;
			Long likesCount = redisTemplate.opsForSet().size(redisKey);

			if (likesCount != null) {
				// 큐레이션을 DB에 반영
				Optional<Curation> curationOpt = curationRepository.findById(curationId);
				if (curationOpt.isPresent()) {
					Curation curation = curationOpt.get();
					curation.setLikeCount(likesCount);
					curationRepository.save(curation);
				}
			}
		}
	}

	/**
	 * 특정 큐레이션에 대한 좋아요 여부를 확인합니다.
	 * @param curationId 큐레이션 ID
	 * @param memberId 사용자 ID
	 * @return 좋아요 여부 (true: 좋아요 누름, false: 좋아요 안 누름)
	 */
	public boolean isLikedByMember(Long curationId, Long memberId) {
		String redisKey = "curation_like:" + curationId;
		return redisTemplate.opsForSet().isMember(redisKey, String.valueOf(memberId));
	}

	/**
	 * ✅ 특정 멤버가 팔로우하는 큐레이션 목록을 조회하는 메서드 추가
	 * @param member 팔로우한 멤버
	 * @return 팔로우한 멤버의 큐레이션 목록
	 */
	public List<CurationResDto> getFollowingCurations(Member member) {
		List<Curation> followingCurations = curationRepository.findFollowingCurations(member.getId());
		return followingCurations.stream()
			.map(CurationResDto::new)
			.collect(Collectors.toList());
	}

	@Transactional
	public void reportCuration(Long curationId, ReportType reportType) {
		Member actor = rq.getActor();
		Curation curation = curationRepository.findById(curationId)
			.orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 큐레이션입니다."));

		// 같은 사유로 이미 신고한 큐레이션 거부
		if (reportRepository.existsByCurationIdAndReporterIdAndReportType(curationId, actor.getId(), reportType)) {
			throw new ServiceException("400-1", "이미 같은 사유로 신고한 큐레이션입니다.");
		}

		Report report = Report.builder()
			.reportType(reportType)
			.curation(curation)
			.reporter(actor)
			.build();

		reportRepository.save(report);
	}

	public List<Curation> findAllByMember(Member member) {
		return curationRepository.findAllByMember(member);
	}

	@Transactional(readOnly = true)
	public TrendingCurationResDto getTrendingCuration() {// 조회수가 가장 높은 3개의 큐레이션을 가져옴
		List<Curation> topCurations = redisTemplate.opsForZSet().reverseRange(DAY_VIEW_COUNT_KEY, 0, 2).stream()
			.map(curationId -> curationRepository.findById(Long.parseLong(curationId))
				.orElseGet(() -> {
					redisTemplate.opsForZSet().remove(DAY_VIEW_COUNT_KEY, curationId);
					return null;
				}))
			.filter(curation -> curation != null)
			.map(curation -> {
				curation.setViewCount(redisTemplate.opsForZSet().score(DAY_VIEW_COUNT_KEY, String.valueOf(curation.getId())).longValue());
				return curation;
			})
			.toList();

		if (topCurations.isEmpty()) {
			return TrendingCurationResDto.of(curationRepository.findTop3ByOrderByViewCountDesc());
		}
		return TrendingCurationResDto.of(topCurations);
	}

	@Transactional(readOnly = true)
	public List<CurationResDto> searchCurationByUserName(String username) {
		Member author = memberRepository.findByUsername(username)
			.orElseThrow(() -> new ServiceException("404-1", "작성자가 존재하지 않습니다."));
		return curationRepository.findAllByMember(author).stream()
			.map(CurationResDto::new)
			.collect(Collectors.toUnmodifiableList());
	}
}
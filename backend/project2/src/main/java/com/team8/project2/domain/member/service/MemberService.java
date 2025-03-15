package com.team8.project2.domain.member.service;

import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.team8.project2.domain.curation.curation.repository.CurationRepository;
import com.team8.project2.domain.image.service.S3Uploader;
import com.team8.project2.domain.member.dto.CuratorInfoDto;
import com.team8.project2.domain.member.dto.MemberReqDTO;

import lombok.extern.slf4j.Slf4j;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.team8.project2.domain.member.dto.FollowingResDto;
import com.team8.project2.domain.member.dto.UnfollowResDto;
import com.team8.project2.domain.member.entity.Follow;
import com.team8.project2.domain.member.entity.Member;
import com.team8.project2.domain.member.entity.RoleEnum;
import com.team8.project2.domain.member.event.ProfileImageUpdateEvent;
import com.team8.project2.domain.member.repository.FollowRepository;
import com.team8.project2.domain.member.repository.MemberRepository;
import com.team8.project2.domain.member.dto.FollowResDto;
import com.team8.project2.global.Rq;
import com.team8.project2.global.exception.ServiceException;

import lombok.RequiredArgsConstructor;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberService {

	private final MemberRepository memberRepository;
	private final AuthTokenService authTokenService;
	private final FollowRepository followRepository;
	private final Rq rq;
	private final CurationRepository curationRepository;
	private final S3Uploader s3Uploader;
	private final ApplicationEventPublisher eventPublisher;

	public Member join(String memberId, String password, RoleEnum role, String email, String profileImage) {
		return join(memberId, password, role, email, profileImage, null);
	}

	public long count() {
		return memberRepository.count();
	}

	@Transactional
	public Member join(String memberId, String password, RoleEnum role, String email, String profileImage,
		String introduce) {

		//TODO: apikey 할당방식 지정
		//TODO: RoleEnum 확인 이후 주입 로직 필요
		if (role == null) {
			role = RoleEnum.MEMBER;
		}
		Member member = Member.builder()
			.memberId(memberId)
			.password(password)
			.profileImage(profileImage)
			.email(email)
			.introduce(introduce)
			.build();
		return memberRepository.save(member);
	}

	@Transactional
	public Member join(Member member) {
		return memberRepository.save(member);
	}

	public Optional<Member> findByMemberId(String memberId) {
		return memberRepository.findByMemberId(memberId);
	}

	public Optional<Member> findByUsername(String username) {
		return memberRepository.findByUsername(username);
	}

	public Optional<Member> findById(long id) {
		return memberRepository.findById(id);
	}

	public String getAuthToken(Member member) {
		return authTokenService.genAccessToken(member);
	}

	@Transactional
	public void deleteMember(Long memberId) {
		// 1. 연관된 Curation 데이터 삭제
		//TODO: curation에 memberID로 인한 삭제 필요
		//curationRepository.deleteByMemberId(memberId);
		// 2. Member 삭제
		memberRepository.deleteById(memberId);
	}

	@Transactional
	public Optional<Member> getMemberByAccessToken(String accessToken) {
		Map<String, Object> payload = authTokenService.getPayload(accessToken);
		log.info("[JWT PAYLOAD] :" + payload);
		if (payload == null) {
			return Optional.empty();
		}

		long id = (long)payload.get("id");
		String memberId = (String)payload.get("memberId");

		return Optional.of(Member.builder().id(id).memberId(memberId).build());
	}

	public String genAccessToken(Member member) {
		return authTokenService.genAccessToken(member);
	}

	@Transactional
	public FollowResDto followUser(Member follower, String username) {
		Member followee = findByUsername(username).orElseThrow(
			() -> new ServiceException("404-1", "존재하지 않는 사용자입니다."));

		if (follower.getMemberId().equals(followee.getMemberId())) {
			throw new ServiceException("400-1", "자신을 팔로우할 수 없습니다.");
		}

		Follow follow = new Follow();
		follow.setFollowerAndFollowee(follower, followee);

		followRepository.findByFollowerAndFollowee(follower, followee).ifPresent(_f -> {
			throw new ServiceException("400-1", "이미 팔로우중인 사용자입니다.");
		});

		follow = followRepository.save(follow);
		return FollowResDto.fromEntity(follow);
	}

	@Transactional
	public UnfollowResDto unfollowUser(Member follower, String followeeId) {
		Member followee = findByUsername(followeeId).orElseThrow(
			() -> new ServiceException("404-1", "존재하지 않는 사용자입니다."));

		if (follower.getMemberId().equals(followee.getMemberId())) {
			throw new ServiceException("400-1", "자신을 팔로우할 수 없습니다.");
		}

		Follow follow = new Follow();
		follow.setFollowerAndFollowee(follower, followee);

		followRepository.findByFollowerAndFollowee(follower, followee)
			.orElseThrow(() -> new ServiceException("400-1", "팔로우중이 아닙니다."));

		followRepository.delete(follow);
		return UnfollowResDto.fromEntity(follow);
	}

	@Transactional(readOnly = true)
	public FollowingResDto getFollowingUsers(Member actor) {
		List<Follow> followings = followRepository.findByFollower(actor)
			.stream()
			.sorted(Comparator.comparing(Follow::getFollowedAt).reversed())
			.toList();
		return FollowingResDto.fromEntity(followings);
	}

	@Transactional
	public Member updateMember(String memberId, MemberReqDTO updateDTO) {
		return null;
	}

	@Transactional(readOnly = true)
	public boolean isFollowed(Long followeeId, Long followerId) {
		return followRepository.existsByFollowerIdAndFolloweeId(followerId, followeeId);
	}

	@Transactional(readOnly = true)
	public CuratorInfoDto getCuratorInfo(String username) {
		Member member = memberRepository.findByUsername(username)
			.orElseThrow(() -> new ServiceException("404-1", "해당 큐레이터를 찾을 수 없습니다."));

		long curationCount = curationRepository.countByMember(member);
		boolean isLogin = false;
		boolean isFollowed = false;
		if (rq.isLogin()) {
			isLogin = true;
			Member actor = rq.getActor();
			isFollowed = followRepository.existsByFollowerIdAndFolloweeId(actor.getId(), member.getId());
		}

		return new CuratorInfoDto(username, member.getProfileImage(), member.getIntroduce(), curationCount, isFollowed,
			isLogin);
	}

	@Transactional
	public void updateProfileImage(MultipartFile imageFile) throws IOException {
		Member actor = rq.getActor();
		String imageFileName = s3Uploader.uploadFile(imageFile);
		String oldProfileImageUrl = actor.getProfileImage();
		actor.setProfileImage(s3Uploader.getBaseUrl() + imageFileName);

		memberRepository.save(actor);
		eventPublisher.publishEvent(new ProfileImageUpdateEvent(oldProfileImageUrl));
	}
}

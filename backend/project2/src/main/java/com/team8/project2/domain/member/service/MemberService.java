package com.team8.project2.domain.member.service;

import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.team8.project2.domain.member.entity.Follow;
import com.team8.project2.domain.member.entity.Member;
import com.team8.project2.domain.member.entity.RoleEnum;
import com.team8.project2.domain.member.repository.FollowRepository;
import com.team8.project2.domain.member.repository.MemberRepository;
import com.team8.project2.domain.playlist.dto.FollowResDto;
import com.team8.project2.global.exception.ServiceException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MemberService {

	private final MemberRepository memberRepository;
	private final AuthTokenService authTokenService;
	private final FollowRepository followRepository;

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

		if (payload == null) {
			return Optional.empty();
		}

		long id = (long)payload.get("id");
		String memberId = (String)payload.get("memberId");

		return Optional.of(Member.builder().id(id).memberId(memberId).build());
	}

	@Transactional
	public String genAccessToken(Member member) {
		return authTokenService.genAccessToken(member);
	}

	@Transactional
	public FollowResDto followUser(Member follower, String followeeId) {
		Member followee = findByMemberId(followeeId)
			.orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 사용자입니다."));

		Follow follow = new Follow();
		follow.setFollowerAndFollowee(follower, followee);

		followRepository.findByFollowerAndFollowee(follower, followee)
			.ifPresent(_f -> {
				throw new ServiceException("400-1", "이미 팔로우중인 사용자입니다.");
			});

		follow = followRepository.save(follow);
		return FollowResDto.fromEntity(follow);
	}
}

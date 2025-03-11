package com.team8.project2.domain.member.service;

import com.team8.project2.domain.member.entity.Member;
import com.team8.project2.domain.member.entity.RoleEnum;
import com.team8.project2.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final AuthTokenService authTokenService;

    public Member join(String memberId, String password, RoleEnum role, String email, String profileImage) {
        return join(memberId, password, role, email, profileImage, null);
    }

    public long count() {
        return memberRepository.count();
    }
    @Transactional
    public Member join(String memberId, String password, RoleEnum role, String email, String profileImage, String introduce) {

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
                .introduce(introduce).build();
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

        if (payload == null) {
            return Optional.empty();
        }

        long id = (long) payload.get("id");
        String memberId = (String) payload.get("memberId");

        return Optional.of(
                Member.builder()
                        .id(id)
                        .memberId(memberId)
                        .build()
        );
    }
    @Transactional
    public String genAccessToken(Member member) {
        return authTokenService.genAccessToken(member);
    }

}

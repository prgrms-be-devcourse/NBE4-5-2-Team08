package com.team8.project2.domain.member.controller;

import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.team8.project2.domain.curation.curation.service.CurationService;
import com.team8.project2.domain.member.dto.MemberReqDTO;
import com.team8.project2.domain.member.dto.MemberResDTO;
import com.team8.project2.domain.member.entity.Member;
import com.team8.project2.domain.member.service.MemberService;
import com.team8.project2.domain.playlist.dto.FollowResDto;
import com.team8.project2.global.Rq;
import com.team8.project2.global.dto.RsData;
import com.team8.project2.global.exception.ServiceException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class ApiV1MemberController {

    private final CurationService curationService;
    private final MemberService memberService;
    private final Rq rq;


    @PostMapping("/join")
    public RsData<LoginResBody> join(@RequestBody @Valid MemberReqDTO body) {
        memberService.findByMemberId(body.getMemberId())
                .ifPresent(member -> {
                    throw new ServiceException("409-1","사용중인 아이디");
                });
        //TODO: RoleEnum 초기화 방식 선정
        //TODO: apikey할당 방식 선정
        //join(String username, String password,RoleEnum role, String email, String profileImage)

        Member member = memberService.join(body.toEntity());

        if (member.getId() == null) {
            throw new ServiceException("500-2", "회원가입 후 ID가 설정되지 않았습니다.");
        }

        String accessToken = memberService.genAccessToken(member);
        rq.addCookie("accessToken", accessToken);

        return new RsData<>(
                "201-1",
                "회원 가입이 완료되었습니다.",
                new LoginResBody(MemberResDTO.fromEntity(member), accessToken)
        );
    }
    record LoginReqBody(@NotBlank String username, @NotBlank String password) {}
    record LoginResBody(MemberResDTO item, String accessToken) {}
    @PostMapping("/login")
    public RsData<LoginResBody> login(@RequestBody @Valid LoginReqBody reqBody) {
        Member member = memberService.findByMemberId(reqBody.username).orElseThrow(
                () -> new ServiceException("401-1", "잘못된 아이디입니다.")
        );

        if(!member.getPassword().equals(reqBody.password)) {
            throw new ServiceException("401-2", "비밀번호가 일치하지 않습니다.");
        }

        String accessToken = memberService.genAccessToken(member);

        rq.addCookie("accessToken", accessToken);
        return new RsData<>(
                "200-1",
                "%s님 환영합니다.".formatted(member.getUsername()),
                new LoginResBody(
                        MemberResDTO.fromEntity(member),
                        accessToken
                )
        );
    }
    @GetMapping("/me")
    public RsData<MemberResDTO> getMyInfo() {
        Member member = rq.getActor();  // JWT에서 인증된 사용자 정보 가져오기
        return new RsData<>("200-2", "내 정보 조회 성공", MemberResDTO.fromEntity(member));
    }
    @PostMapping("/logout")
    public RsData<Void> logout() {
        rq.removeCookie("accessToken"); // JWT 삭제
        return new RsData<>("200-3", "로그아웃 되었습니다.");
    }

    @GetMapping("/{memberId}")
    public RsData<Map<String, Object>> getCuratorInfo(@PathVariable String memberId) {
        Member member = memberService.findByMemberId(memberId).orElseThrow(
                () -> new ServiceException("404-1", "해당 큐레이터를 찾을 수 없습니다.")
        );

        long curationCount = curationService.countByMemberId(memberId); // ✅ 코드 수정됨

        Map<String, Object> responseData = Map.of(
                "username", member.getUsername(),
                "profileImage", member.getProfileImage(),
                "introduce", member.getIntroduce(),
                "curationCount", curationCount
        );

        return new RsData<>("200-4", "큐레이터 정보 조회 성공", responseData);
    }

    @PostMapping("/{memberId}/follow")
    @PreAuthorize("isAuthenticated()")
    public RsData<FollowResDto> follow(@PathVariable String memberId) {
        Member actor = rq.getActor();
        FollowResDto followResDto = memberService.followUser(actor, memberId);
        return new RsData<>("200-1", "%s님을 팔로우했습니다.".formatted(followResDto.getFollowee()), followResDto);
    }
}

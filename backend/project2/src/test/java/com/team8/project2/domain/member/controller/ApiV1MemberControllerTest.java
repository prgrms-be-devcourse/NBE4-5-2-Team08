package com.team8.project2.domain.member.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team8.project2.domain.curation.curation.dto.CurationReqDTO;
import com.team8.project2.domain.curation.curation.service.CurationService;
import com.team8.project2.domain.curation.tag.dto.TagReqDto;
import com.team8.project2.domain.link.dto.LinkReqDTO;
import com.team8.project2.domain.member.dto.MemberReqDTO;
import com.team8.project2.domain.member.entity.Member;
import com.team8.project2.domain.member.repository.MemberRepository;
import com.team8.project2.domain.member.service.MemberService;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
public class ApiV1MemberControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private MemberService memberService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private CurationService curationService;

    private MemberReqDTO memberReqDTO;

    private static String validToken;
    private static String invalidToken;

    @BeforeEach
    void setUp() {

        // MemberReqDTO 설정 (링크 포함)
        memberReqDTO = new MemberReqDTO();
        memberReqDTO.setMemberId("member1");
        memberReqDTO.setUsername("초보");
        memberReqDTO.setPassword("1234");
        memberReqDTO.setRole("MEMBER");
        memberReqDTO.setProfileImage("www.url");
        memberReqDTO.setEmail("member1@gmail.com");
        memberReqDTO.setIntroduce("안녕");

        // ✅ 회원이 없으면 생성
        Member member = memberRepository.findByMemberId(memberReqDTO.getMemberId())
                .orElseGet(() -> memberRepository.save(memberReqDTO.toEntity()));

        // ✅ 큐레이션 추가
        curationService.createCuration(
                "테스트 큐레이션 1",
                "큐레이션 내용",
                List.of("https://test.com"),
                List.of("테스트 태그")
        );

    }

    @BeforeAll
    static void setupTokens() {
        validToken = "Bearer valid.jwt.token";
        invalidToken = "Bearer invalid.jwt.token";
    }

    private ResultActions joinRequest(String memberId, String password, String email) throws Exception{
        return joinRequest(memberId,password,email,null,null,null);
    }
    private ResultActions joinRequest(String memberId, String password, String email, String role, String profileImage, String introduce) throws Exception {
        return mvc
                .perform(
                        post("/api/v1/members/join")
                                .content("""
                                        {
                                            "memberId": "%s",
                                            "password": "%s",
                                            "email": "%s",
                                            "role": "%s",
                                            "profileImage": "%s",
                                            "introduce": "%s"
                                        }
                                        """
                                        .formatted(memberId, password, email, role, profileImage, introduce)
                                        .stripIndent())
                                .contentType(
                                        new MediaType(MediaType.APPLICATION_JSON, StandardCharsets.UTF_8)
                                )
                )
                .andDo(print());
    }

    @Test
    @DisplayName("회원 가입1")
    void join1() throws Exception {

        String memberId = "user123";
        String password = "securePass123";
        String email = "user123@example.com";
        String role = "MEMBER"; // RoleEnum이 문자열로 변환됨
        String profileImage = "https://example.com/profile.jpg";
        String introduce = "안녕하세요! 저는 새로운 회원입니다.";

        ResultActions resultActions = joinRequest(memberId, password,email,role,profileImage,introduce);
        //입력 확인
        Member member = memberService.findByMemberId("user123").get();


        resultActions
                .andExpect(status().isCreated())
                .andExpect(handler().handlerType(ApiV1MemberController.class))
                .andExpect(handler().methodName("join"))
                .andExpect(jsonPath("$.code").value("201-1"))
                .andExpect(jsonPath("$.data.accessToken").exists())
                .andExpect(jsonPath("$.msg").value("회원 가입이 완료되었습니다."));

        //checkMember(resultActions, member);
    }

    @Test
    @DisplayName("회원 가입2 - username이 이미 존재하는 케이스")
    void join2() throws Exception {

        String memberId = "user123";
        String password = "securePass123";
        String email = "user123@example.com";
        String role = "MEMBER"; // RoleEnum이 문자열로 변환됨
        String profileImage = "https://example.com/profile.jpg";
        String introduce = "안녕하세요! 저는 새로운 회원입니다.";

        // 회원 가입 요청
        ResultActions resultActions = joinRequest(memberId, password,email,role,profileImage,introduce);
        // 같은 memberId를 통한 회원 가입 재요청
        ResultActions resultActions2 = joinRequest(memberId, password,email,role,profileImage,introduce);
        resultActions2
                .andExpect(status().isConflict())
                .andExpect(handler().handlerType(ApiV1MemberController.class))
                .andExpect(handler().methodName("join"))
                .andExpect(jsonPath("$.code").value("409-1"))
                .andExpect(jsonPath("$.msg").value("사용중인 아이디"));

    }

    @Test
    @DisplayName("회원 가입3 - 비밀번호 길이 제한 위반")
    void join3() throws Exception {
        // 필수 입력값 중 password를 4자로 설정하여 길이 제한 검증
        memberReqDTO.setUsername("초보");
        memberReqDTO.setProfileImage("www.url");
        memberReqDTO.setEmail("member1@gmail.com");
        memberReqDTO.setIntroduce("안녕");
        memberReqDTO.setPassword("1234");

        mvc.perform(MockMvcRequestBuilders.post("/api/v1/members/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(memberReqDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.msg").value("password : Size : 비밀번호는 최소 6자 이상이어야 합니다."));
    }

    @Test
    @DisplayName("회원 가입4 - 필수 입력값 누락 (비밀번호 없음)")
    void joinWithoutPassword() throws Exception {
        // 비밀번호 누락 테스트
        memberReqDTO.setPassword(null);

        mvc.perform(MockMvcRequestBuilders.post("/api/v1/members/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(memberReqDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.msg").value("password : NotBlank : 비밀번호는 필수 입력값입니다."));
    }

    @Test
    @DisplayName("회원 가입5 - 필수 입력값 누락 (사용자명 없음)")
    void joinWithoutMemberId() throws Exception {
        // 사용자명 누락 테스트
        memberReqDTO.setMemberId(null);
        memberReqDTO.setPassword("123456"); // 비밀번호 정상값으로 설정

        mvc.perform(MockMvcRequestBuilders.post("/api/v1/members/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(memberReqDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.msg").value("memberId : NotBlank : 회원 ID는 필수 입력값입니다."));
    }

    @Test
    @DisplayName("memberId 기반 큐레이터 정보 조회")
    void getCuratorInfoTest() throws Exception {
        // Given
        long curationCount = curationService.countByMemberId(memberReqDTO.getMemberId()); // ✅ setup()에서 큐레이션 추가됨

        // When
        mvc.perform(get("/api/v1/members/" + memberReqDTO.getMemberId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200-4"))
                .andExpect(jsonPath("$.data.username").value("초보"))
                .andExpect(jsonPath("$.data.profileImage").value("www.url"))
                .andExpect(jsonPath("$.data.introduce").value("안녕"))
                .andExpect(jsonPath("$.data.curationCount").value(curationCount)) // ✅ 예상 값과 실제 값이 일치하도록 변경
                .andDo(print());
    }

    @Test
    @DisplayName("이미 존재하는 memberId로 회원 가입 시 오류 발생")
    void joinWithDuplicateMemberId() throws Exception {
        // Given
        String duplicateMemberId = memberReqDTO.getMemberId(); // `setup()`에서 이미 생성된 ID 사용
        String password = "123456";
        String email = "duplicate@example.com";
        String role = "MEMBER";
        String profileImage = "www.url";
        String introduce = "안녕";

        // When
        ResultActions resultActions = joinRequest(duplicateMemberId, password, email, role, profileImage, introduce);

        // Then
        resultActions
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("409-1"))
                .andExpect(jsonPath("$.msg").value("사용중인 아이디"));
    }


    @Test
    @DisplayName("JWT 인증으로 내 정보 조회")
    void getMyInfoTest() throws Exception {
        Member member = memberService.join(memberReqDTO.toEntity());
        String accessToken = memberService.genAccessToken(member);

        mvc.perform(get("/api/v1/members/me")
                        .header("Authorization", "Bearer " + accessToken)) // JWT 포함 요청
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200-2"))
                .andExpect(jsonPath("$.data.memberId").value("member1"))
                .andDo(print());
    }

    @Test
    @DisplayName("로그아웃 시 JWT 삭제")
    void logoutTest() throws Exception {
        Member member = memberService.join(memberReqDTO.toEntity());
        String accessToken = memberService.genAccessToken(member);

        mvc.perform(post("/api/v1/members/logout")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200-3"))
                .andDo(print());
    }

    @Test
    @DisplayName("다른 사용자를 팔로우할 수 있다")
    void follow() {


    }
}
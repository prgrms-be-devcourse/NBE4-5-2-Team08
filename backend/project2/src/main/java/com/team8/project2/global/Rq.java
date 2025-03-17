package com.team8.project2.global;

import com.team8.project2.domain.member.entity.Member;
import com.team8.project2.domain.member.service.MemberService;
import com.team8.project2.global.exception.ServiceException;
import com.team8.project2.global.security.SecurityUser;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

@Slf4j
@Component
@RequiredArgsConstructor
@RequestScope
public class Rq {

    private final HttpServletRequest request;
    private final HttpServletResponse response;
    private final MemberService memberService;

    /**
     * 현재 요청에서 로그인한 유저 정보를 SecurityContext에 설정
     */
    public void setLogin(Member member) {
        Authentication authentication = getAuthentication(member);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    /**
     * Member 객체 기반으로 Authentication 생성
     */
    public Authentication getAuthentication(Member member) {
        UserDetails userDetails = new SecurityUser(member.getId(), member.getMemberId(), "", member.getAuthorities());
        return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
    }

    /**
     * 현재 로그인한 유저 정보 가져오기
     */
    public Member getActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ServiceException("401-2", "로그인이 필요합니다.");
        } else {
            log.info("Authentication: {}", authentication);
            log.info("Authentication class: {}", authentication.getClass());
            log.info("Authentication isAuthenticated: {}", authentication.isAuthenticated());
            log.info("Authentication principal: {}", authentication.getPrincipal());
        }


        Object principal = authentication.getPrincipal();
        if (!(principal instanceof SecurityUser)) {
            log.info("[principal] : "+ principal.getClass().toString());
            log.info("[principal] : "+ principal);
            throw new ServiceException("401-3", "잘못된 인증 정보입니다.");
        }
        SecurityUser user = (SecurityUser) principal;

        return memberService.findById(user.getId())
                .orElseThrow(() -> new ServiceException("404-1", "사용자를 찾을 수 없습니다."));
    }

    /**
     * 로그인된 상태인지 확인
     */
    public boolean isLogin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication instanceof AnonymousAuthenticationToken) {
            return false;
        }
        return authentication.isAuthenticated();
    }

    /**
     * 요청 헤더에서 특정 값 가져오기
     */
    public String getHeader(String name) {
        return request.getHeader(name);
    }

    /**
     * 쿠키에서 특정 값 가져오기
     */
    public String getValueFromCookie(String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;

        for (Cookie cookie : cookies) {
            if (cookie.getName().equals(name)) {
                return cookie.getValue();
            }
        }
        return null;
    }

    /**
     * 응답 헤더에 값 추가하기
     */
    public void setHeader(String name, String value) {
        response.setHeader(name, value);
    }

    /**
     * 쿠키 추가하기
     */
    public void addCookie(String name, String value) {
        Cookie cookie = new Cookie(name, value);
        cookie.setDomain("localhost");
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }

    /**
     * 현재 유저의 실제 정보 가져오기
     */
    public Member getRealActor(Member actor) {
        return memberService.findById(actor.getId())
                .orElseThrow(() -> new ServiceException("404-1", "사용자를 찾을 수 없습니다."));
    }

    /**
     * 쿠키 삭제하기
     */
    public void removeCookie(String name) {
        Cookie cookie = new Cookie(name, null);
        cookie.setDomain("localhost");
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setAttribute("SameSite", "Strict");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}

package com.team8.project2.domain.link.service;

import com.team8.project2.domain.link.entity.Link;
import com.team8.project2.domain.link.repository.LinkRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class LinkService {
    @Autowired
    private LinkRepository linkRepository;

    // 링크 추가
    @Transactional
    public Link addLink(String url, String title, String description, String thumbnail) {
        Link link = new Link();
        link.setId(generateLinkId()); // linkId 생성하는 로직 필요
        link.setUrl(url);
        link.setTitle(title);
        link.setClick(0); // 초기 클릭수
        link.setDescription(description);
        link.setCreatedAt(LocalDateTime.now());
        link.setThumbnail(thumbnail);

        return linkRepository.save(link);
    }

    // 링크 수정
    @Transactional
    public Link updateLink(String linkId, String title, String description, String thumbnail) {
        Link link = linkRepository.findById(linkId).orElseThrow(() -> new RuntimeException("Link not found"));
        link.setTitle(title);
        link.setDescription(description);
        link.setThumbnail(thumbnail);
        return linkRepository.save(link);
    }

    // 링크 삭제
    @Transactional
    public void deleteLink(String linkId) {
        Link link = linkRepository.findById(linkId).orElseThrow(() -> new RuntimeException("Link not found"));
        linkRepository.delete(link);
    }

    private String generateLinkId() {
        // 링크 ID 생성 로직
        return "generated-link-id"; // 임시
    }
}

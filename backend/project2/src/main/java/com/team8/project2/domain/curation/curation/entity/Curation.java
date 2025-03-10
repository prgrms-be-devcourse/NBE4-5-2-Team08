package com.team8.project2.domain.curation.curation.entity;

import com.team8.project2.domain.comment.entity.Comment;
import com.team8.project2.domain.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 큐레이션(Curation) 엔티티 클래스입니다.
 * 큐레이션은 사용자(Member)가 생성한 컨텐츠로, 제목, 내용, 태그, 링크 등을 포함할 수 있습니다.
 */
@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@Table(name = "Curation")
public class Curation {

    /**
     * 큐레이션의 고유 ID (자동 생성)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "curationId", nullable = false)
    private Long id;

    /**
     * 큐레이션 제목 (필수값)
     */
    @Column(name = "title", nullable = false)
    private String title;

    /**
     * 큐레이션 내용 (필수값, TEXT 타입 지정)
     */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /**
     * 큐레이션 생성 시간 (자동 설정)
     */
    @CreatedDate
    @Setter(AccessLevel.PRIVATE)
    @Column(name = "createdAt", nullable = false)
    private LocalDateTime createdAt;

    /**
     * 큐레이션 마지막 수정 시간 (자동 설정)
     */
    @LastModifiedDate
    @Setter(AccessLevel.PRIVATE)
    @Column(name = "modifiedAt")
    private LocalDateTime modifiedAt;

    /**
     * 큐레이션 좋아요 수 (기본값 0)
     */
    @Builder.Default
    @Column(name = "likeCount", nullable = false)
    private Long likeCount = 0L;

    /**
     * 큐레이션 작성자 (Member와 N:1 관계, 선택적)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "memberId", nullable = true)
    private Member member;

    /**
     * 큐레이션에 포함된 링크 목록 (CurationLink와 1:N 관계)
     */
    @OneToMany(mappedBy = "curation", fetch = FetchType.LAZY, orphanRemoval = true)
    private List<CurationLink> curationLinks = new ArrayList<>();

    /**
     * 큐레이션에 포함된 태그 목록 (CurationTag와 1:N 관계)
     */
    @OneToMany(mappedBy = "curation", fetch = FetchType.LAZY, orphanRemoval = true)
    private List<CurationTag> tags = new ArrayList<>();

    /**
     * 큐레이션에 포함된 댓글 목록 (Comment와 1:N 관계)
     */
    @OneToMany(mappedBy = "curation", fetch = FetchType.LAZY, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();

    /**
     * 큐레이션 좋아요 수 증가 메서드
     */
    public void like() {
        this.likeCount++;
    }

    public String getMemberName() {
        return member.getUsername();
    }

    public long getMemberId() {
        return member.getId();
    }

    public String getMemberImgUrl() {
        return member.getProfileImage();
    }
}

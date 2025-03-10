package com.team8.project2.domain.curation.curation.entity;

import com.team8.project2.domain.curation.tag.entity.Tag;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

/**
 * 큐레이션과 태그 간의 관계를 나타내는 엔티티 클래스입니다.
 * 큐레이션과 태그는 다대다(N:M) 관계이며, 이를 매핑하기 위해 사용됩니다.
 */
@Entity
@Getter
@Setter
public class CurationTag {

    /**
     * 복합 키를 정의하는 ID 클래스
     */
    @EmbeddedId
    private CurationTagId id;

    /**
     * 큐레이션 엔티티와 다대일(N:1) 관계
     */
    @ManyToOne(cascade = CascadeType.PERSIST)
    @JoinColumn(name = "curationId", insertable = false, updatable = false)
    private Curation curation;

    /**
     * 태그 엔티티와 다대일(N:1) 관계
     */
    @ManyToOne(cascade = CascadeType.PERSIST)
    @JoinColumn(name = "tagId", insertable = false, updatable = false)
    private Tag tag;

    /**
     * 큐레이션과 태그의 복합 키를 정의하는 내부 클래스
     */
    @EqualsAndHashCode
    @Getter
    @Setter
    public static class CurationTagId implements Serializable {

        /** 큐레이션 ID */
        @Column(name = "curationId")
        private Long curationId;

        /** 태그 ID */
        @Column(name = "tagId")
        private Long tagId;

        public CurationTagId() {}
    }

    /**
     * 큐레이션과 태그를 설정하는 메서드
     * @param curation 큐레이션 엔티티
     * @param tag 태그 엔티티
     * @return 설정된 CurationTag 객체
     */
    public CurationTag setCurationAndTag(Curation curation, Tag tag) {
        CurationTagId curationTagId = new CurationTagId();
        curationTagId.setCurationId(curation.getId());
        curationTagId.setTagId(tag.getId());
        this.id = curationTagId;
        this.curation = curation;
        this.tag = tag;
        return this;
    }
}

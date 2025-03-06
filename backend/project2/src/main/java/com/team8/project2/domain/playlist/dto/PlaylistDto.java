package com.team8.project2.domain.playlist.dto;

import com.team8.project2.domain.playlist.entity.Playlist;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 플레이리스트(Playlist) 데이터를 전송하는 DTO 클래스입니다.
 * 엔티티를 DTO로 변환하여 클라이언트에 전달할 데이터를 구성합니다.
 */
@Data
@Builder
public class PlaylistDto {

    /**
     * 플레이리스트 ID
     */
    private Long id;

    /**
     * 플레이리스트 제목
     */
    private String title;

    /**
     * 플레이리스트 설명
     */
    private String description;

    /**
     * 플레이리스트에 포함된 항목 목록
     */
    private List<PlaylistItemDto> items;

    /**
     * 플레이리스트 엔티티를 DTO로 변환합니다.
     * @param playlist 변환할 플레이리스트 엔티티
     * @return 변환된 PlaylistDto 객체
     */
    public static PlaylistDto fromEntity(Playlist playlist) {
        return PlaylistDto.builder()
                .id(playlist.getId())
                .title(playlist.getTitle())
                .description(playlist.getDescription())
                .items(playlist.getItems().stream()
                        .map(PlaylistItemDto::fromEntity)
                        .collect(Collectors.toList()))
                .build();
    }
}

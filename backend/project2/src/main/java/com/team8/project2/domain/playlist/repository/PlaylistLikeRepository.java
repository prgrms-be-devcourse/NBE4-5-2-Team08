package com.team8.project2.domain.playlist.repository;

import com.team8.project2.domain.member.entity.Member;
import com.team8.project2.domain.playlist.dto.PlaylistLike;
import com.team8.project2.domain.playlist.entity.Playlist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlaylistLikeRepository extends JpaRepository<PlaylistLike, PlaylistLike.PlaylistLikeId> {
    /** 특정 사용자의 특정 플레이리스트 좋아요 여부 확인 */
    boolean existsByIdPlaylistIdAndIdMemberId(Long playlistId, Long memberId);

    /** 특정 사용자의 좋아요 데이터 조회 */
    Optional<PlaylistLike> findByPlaylistAndMember(Playlist playlist, Member member);

    /** 특정 플레이리스트의 좋아요 확인 */
    boolean existsById_PlaylistId(Long playlistId);

    /** 특정 플레이리스트의 좋아요 삭제 */
    void deleteById_PlaylistId(Long playlistId);
}

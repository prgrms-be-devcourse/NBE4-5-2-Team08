package com.team8.project2.domain.playlist.dto;

import java.time.LocalDateTime;

import com.team8.project2.domain.member.entity.Follow;

import lombok.Getter;

@Getter
public class FollowResDto {

	private String followee;

	private LocalDateTime followedAt;

	public static FollowResDto fromEntity(Follow follow) {
		FollowResDto followResDto = new FollowResDto();
		followResDto.followee = follow.getFolloweeName();
		followResDto.followedAt = follow.getFollowedAt();
		return followResDto;
	}
}

package com.team8.project2.domain.member.event;

import lombok.Getter;

@Getter
public class ProfileImageUpdateEvent {
	private String oldProfileImageUrl;

	public ProfileImageUpdateEvent(String oldProfileImageUrl) {
		this.oldProfileImageUrl = oldProfileImageUrl;
	}
}

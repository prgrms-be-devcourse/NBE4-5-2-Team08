package com.team8.project2.domain.member.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

import com.team8.project2.domain.image.service.S3Uploader;
import com.team8.project2.domain.member.event.ProfileImageUpdateEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProfileImageEventListener {

	private static final String DEAFULT_PROFILE_IMAGE_NAME = "default-profile.svg";
	private final S3Uploader s3Uploader;

	@Async
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	@TransactionalEventListener
	public void deleteOldProfileImage(ProfileImageUpdateEvent event) {
		String oldProfileImageName = extractFileNameFromUrl(event.getOldProfileImageUrl());
		if (isDefaultProfile(oldProfileImageName)) {
			return;
		}
		s3Uploader.deleteFile(oldProfileImageName);
	}

	private boolean isDefaultProfile(String oldProfileImageName) {
		return (oldProfileImageName.equals(DEAFULT_PROFILE_IMAGE_NAME));
	}

	private String extractFileNameFromUrl(String fileUrl) {
		return fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
	}
}

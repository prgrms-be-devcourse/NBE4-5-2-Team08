package com.team8.project2.domain.image.service;

import java.io.IOException;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

@Service
@RequiredArgsConstructor
public class S3Uploader {

	private final S3Client s3Client;
	private final S3Presigner s3Presigner;

	@Value("${spring.cloud.aws.s3.bucket}")
	private String bucketName;

	public String uploadFile(MultipartFile file) throws IOException {
		String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();

		PutObjectRequest putObjectRequest = PutObjectRequest.builder()
			.bucket(bucketName)
			.key(fileName)
			.contentType(file.getContentType())
			.build();

		s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

		// Presigned URL 생성 (선택 사항)
		return getPresignedUrl(fileName);
	}

	private String getPresignedUrl(String fileName) {
		GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
			.signatureDuration(java.time.Duration.ofMinutes(10)) // 유효 시간 설정
			.getObjectRequest(req -> req.bucket(bucketName).key(fileName))
			.build();

		PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
		return presignedRequest.url().toString();
	}
}
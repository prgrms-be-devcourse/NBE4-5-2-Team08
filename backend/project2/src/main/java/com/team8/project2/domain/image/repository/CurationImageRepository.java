package com.team8.project2.domain.image.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.team8.project2.domain.image.entity.CurationImage;

public interface CurationImageRepository extends JpaRepository<CurationImage, Long> {
}

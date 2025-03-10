package com.team8.project2.domain.member.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.team8.project2.domain.member.entity.Follow;

public interface FollowRepository extends JpaRepository<Follow, Long> {
	Optional<Follow> findByFollowerAndFollowee();
}

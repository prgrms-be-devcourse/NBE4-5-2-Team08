package com.team8.project2.domain.member.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.team8.project2.domain.member.entity.Follow;
import com.team8.project2.domain.member.entity.Member;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {
	Optional<Follow> findByFollowerAndFollowee(Member follower, Member followee);
}

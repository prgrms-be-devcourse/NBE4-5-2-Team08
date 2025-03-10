package com.team8.project2.domain.member.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
public class Follow {

	@EmbeddedId
	@Column(name = "followId")
	private FollowId id;

	@ManyToOne()
	@JoinColumn(name = "followerId", insertable=false, updatable=false)
	private Member follower;

	@ManyToOne
	@JoinColumn(name = "followeeId", insertable=false, updatable=false)
	private Member followee;

	@Setter(AccessLevel.PRIVATE)
	@CreatedDate
	private LocalDateTime followedAt;

	@Getter
	@Setter
	@EqualsAndHashCode
	@AllArgsConstructor
	private class FollowId {

		private Long followerId;
		private Long followeeId;
	}
	public void setFollowerAndFollowee(Member follower, Member followee) {
		this.id = new FollowId(follower.getId(), followee.getId());
		this.follower = follower;
		this.followee = followee;
	}

	public String getFolloweeName() {
		return followee.getUsername();
	}
}

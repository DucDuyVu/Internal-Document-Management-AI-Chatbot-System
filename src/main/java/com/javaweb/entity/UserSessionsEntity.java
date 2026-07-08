package com.javaweb.entity;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "user_sessions")
public class UserSessionsEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(name = "revoked_at")
	private LocalDateTime revokedAt;
	
	@Column(name = "refresh_token")
	private String refreshToken;
	
	@Column(name = "is_revoked")
	private Boolean isRevoked;
	
	@Column(name = "user_agent")
	private String userAgent;
	
	@Column(name = "ip_address")
	private String ipAddress;
	
	@Column(name = "expires_at")
	private LocalDateTime expiresAt;
	
	@Column(name = "created_at")
	private LocalDateTime createdAt;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id")
	private UsersEntity userId;	
}


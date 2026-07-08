package com.javaweb.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.javaweb.enums.UserRole;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "users")

public class UsersEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(name = "full_name")
	private String fullName;
	
	@Column(name = "username")
	private String userName;
	
	@Column(name = "phone")
	private String phone;
	
	@Column(name = "avatar_url")
	private String avatarURL;
	
	@Column(name = "email")
	private String email;
	
	@Column(name = "password")
	private String password;
	
	@Enumerated(EnumType.STRING)
	@Column(name = "role", nullable = false)
	private UserRole role = UserRole.USER;
	
	@Column(name = "is_active")
	private boolean isActive = true;
	

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;
	
	@Column(name = "created_at")
	private LocalDateTime createdAt;
	

	@Column(name = "deleted_at")
	private LocalDateTime deletedAt;
	
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "department_id")
	private DepartmentsEntity departmentId;
	
	@OneToMany(mappedBy = "userId", fetch = FetchType.LAZY)
	private List<UserSessionsEntity> userSessionsEntities = new ArrayList<>();
	

	
	@OneToMany(mappedBy = "userChatId", fetch = FetchType.LAZY)
	private List<ChatSessionsEntity> chatSessionsEntities = new ArrayList<>();
	


	@OneToMany(mappedBy = "usersEntityId")
	private List<ActivityLogsEntity> activityLogsEntities;
}

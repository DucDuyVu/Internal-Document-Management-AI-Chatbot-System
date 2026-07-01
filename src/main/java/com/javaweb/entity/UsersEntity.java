package com.javaweb.entity;

import java.time.LocalDate;
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

@Entity
@Table(name = "Users")
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
	private LocalDate updatedAt;
	
	@Column(name = "created_at")
	private LocalDate createdAt;
	
	@Column(name = "deleted_at")
	private LocalDate deletedAt;
	
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "department_id")
	private DepartmentsEntity departmentId;
	
	@OneToMany(mappedBy = "userId", fetch = FetchType.LAZY)
	private List<UserSessionsEntity> userSessionsEntities = new ArrayList<>();
	
	@OneToMany(mappedBy = "uploadedBy", fetch = FetchType.LAZY)
	private List<DocumentEntity> documentEntities = new ArrayList<>();
	
	@OneToMany(mappedBy = "userChatId", fetch = FetchType.LAZY)
	private List<ChatSessionsEntity> chatSessionsEntities = new ArrayList<>();
	
	@OneToMany(mappedBy = "grantedId")
	private List<DocumentPermissionsEntity> documentPermissionsEntities ;

	@OneToMany(mappedBy = "usersEntityId")
	private List<ActivityLogsEntity> activityLogsEntities;
	
	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getFullName() {
		return fullName;
	}

	public void setFullName(String fullName) {
		this.fullName = fullName;
	}

	public String getUserName() {
		return userName;
	}

	public void setUserName(String userName) {
		this.userName = userName;
	}

	public String getPhone() {
		return phone;
	}

	public void setPhone(String phone) {
		this.phone = phone;
	}

	public String getAvatarURL() {
		return avatarURL;
	}

	public void setAvatarURL(String avatarURL) {
		this.avatarURL = avatarURL;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public UserRole getRole() {
		return role;
	}

	public void setRole(UserRole role) {
		this.role = role;
	}

	public Boolean isActive() {
		return isActive;
	}

	public void setActive(boolean isActive) {
		this.isActive = isActive;
	}

	public LocalDate getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(LocalDate updatedAt) {
		this.updatedAt = updatedAt;
	}

	public LocalDate getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDate createdAt) {
		this.createdAt = createdAt;
	}

	public LocalDate getDeletedAt() {
		return deletedAt;
	}

	public void setDeletedAt(LocalDate deletedAt) {
		this.deletedAt = deletedAt;
	}

	public DepartmentsEntity getDepartmentId() {
		return departmentId;
	}

	public void setDepartmentId(DepartmentsEntity departmentId) {
		this.departmentId = departmentId;
	}

	public List<DocumentEntity> getDocumentEntities() {
		return documentEntities;
	}

	public void setDocumentEntities(List<DocumentEntity> documentEntities) {
		this.documentEntities = documentEntities;
	}

	public List<ChatSessionsEntity> getChatSessionsEntities() {
		return chatSessionsEntities;
	}

	public void setChatSessionsEntities(List<ChatSessionsEntity> chatSessionsEntities) {
		this.chatSessionsEntities = chatSessionsEntities;
	}

	public List<UserSessionsEntity> getUserSessionsEntities() {
		return userSessionsEntities;
	}

	public void setUserSessionsEntities(List<UserSessionsEntity> userSessionsEntities) {
		this.userSessionsEntities = userSessionsEntities;
	}

	public List<DocumentPermissionsEntity> getDocumentPermissionsEntities() {
		return documentPermissionsEntities;
	}

	public void setDocumentPermissionsEntities(List<DocumentPermissionsEntity> documentPermissionsEntities) {
		this.documentPermissionsEntities = documentPermissionsEntities;
	}

	public List<ActivityLogsEntity> getActivityLogsEntities() {
		return activityLogsEntities;
	}

	public void setActivityLogsEntities(List<ActivityLogsEntity> activityLogsEntities) {
		this.activityLogsEntities = activityLogsEntities;
	}
}

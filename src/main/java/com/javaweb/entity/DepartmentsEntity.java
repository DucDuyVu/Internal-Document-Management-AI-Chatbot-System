package com.javaweb.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "departments")
public class DepartmentsEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(name = "name")
	private String name;
	
	@Column(name = "description")
	private String description;
	
	@Column(name = "created_at")
	private LocalDateTime createdAt;
	
	@Column(name = "updated_at")
	private LocalDateTime updatedAt;
	
	@OneToMany(mappedBy = "departmentId")
	private List<UsersEntity> usersEnties = new ArrayList<>();
	
	@OneToMany(mappedBy = "departmentId")
	private List<DocumentEntity> documentEntities = new ArrayList<>();
	
	@OneToMany(mappedBy = "permissionDepartmentId")
	private List<DocumentPermissionsEntity> documentPermissionsEntities;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(LocalDateTime updatedAt) {
		this.updatedAt = updatedAt;
	}

	public List<UsersEntity> getUsersEnties() {
		return usersEnties;
	}

	public void setUsersEnties(List<UsersEntity> usersEnties) {
		this.usersEnties = usersEnties;
	}

	public List<DocumentEntity> getDocumentEntities() {
		return documentEntities;
	}

	public void setDocumentEntities(List<DocumentEntity> documentEntities) {
		this.documentEntities = documentEntities;
	}

	public List<DocumentPermissionsEntity> getDocumentPermissionsEntities() {
		return documentPermissionsEntities;
	}

	public void setDocumentPermissionsEntities(List<DocumentPermissionsEntity> documentPermissionsEntities) {
		this.documentPermissionsEntities = documentPermissionsEntities;
	}
}

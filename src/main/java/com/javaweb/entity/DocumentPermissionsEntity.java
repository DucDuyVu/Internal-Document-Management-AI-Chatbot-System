package com.javaweb.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "document_permissions")
public class DocumentPermissionsEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(name = "created_at")
	private LocalDateTime createdAt;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "document_id")
	private DocumentEntity permissionsDocumentId;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "department_id")
	private DepartmentsEntity permissionDepartmentId;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "granted_id")
	private UsersEntity grantedId;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public DocumentEntity getPermissionsDocumentId() {
		return permissionsDocumentId;
	}

	public void setPermissionsDocumentId(DocumentEntity permissionsDocumentId) {
		this.permissionsDocumentId = permissionsDocumentId;
	}

	public DepartmentsEntity getPermissionDepartmentId() {
		return permissionDepartmentId;
	}

	public void setPermissionDepartmentId(DepartmentsEntity permissionDepartmentId) {
		this.permissionDepartmentId = permissionDepartmentId;
	}

	public UsersEntity getGrantedId() {
		return grantedId;
	}

	public void setGrantedId(UsersEntity grantedId) {
		this.grantedId = grantedId;
	}
}

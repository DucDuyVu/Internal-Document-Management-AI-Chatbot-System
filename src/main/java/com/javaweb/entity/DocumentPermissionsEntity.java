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
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
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
	@JoinColumn(name = "granted_by")
	private UsersEntity grantedBy;

	@Column(name = "revoked_at")
	private LocalDateTime revokedAt;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "revoked_by")
	private UsersEntity revokedBy;

	@Column(name = "role")
	private String role; // VIEW, DOWNLOAD

	@Column(name = "is_public_link")
	private Boolean isPublicLink;
}

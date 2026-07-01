package com.javaweb.entity;

import java.time.LocalDateTime;
import java.util.List;

import com.javaweb.enums.DocumentStatus;

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
@Table(name = "document")
public class DocumentEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Enumerated(EnumType.STRING)
	@Column(name = "status")
	private DocumentStatus status;
	
	@Column(name = "error_message")
	private String errorMessage;
	
	@Column(name = "retry_count")
	private Long retryCount;
	
	@Column(name = "file_name")
	private String fileName;
	
	@Column(name = "file_path")
	private String filePath;
	
	@Column(name = "file_size")
	private String fileSize;
	
	@Column(name = "version")
	private Long version;
	
	@Column(name = "created_at")
	private LocalDateTime createdAt;
	
	@Column(name = "updated_at")
	private LocalDateTime updatedAt;
	
	@Column(name = "deleted_at")
	private LocalDateTime deletedAt;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "uploaded_by")
	private UsersEntity uploadedBy;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "department_id")
	private DepartmentsEntity departmentId;
	
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "parent_document_id")
	private DocumentEntity parentDocumentId;
	
	@OneToMany(mappedBy = "parentDocumentId")
	private List<DocumentEntity> versions;
	
	@OneToMany(mappedBy = "documentId")
	private List<MessageFileRefsEntity> messageFileRefsEntities ;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public DocumentStatus getStatus() {
		return status;
	}

	public void setStatus(DocumentStatus status) {
		this.status = status;
	}

	public String getErrorMessage() {
		return errorMessage;
	}

	public void setErrorMessage(String errorMessage) {
		this.errorMessage = errorMessage;
	}

	public Long getRetryCount() {
		return retryCount;
	}

	public void setRetryCount(Long retryCount) {
		this.retryCount = retryCount;
	}

	public String getFileName() {
		return fileName;
	}

	public void setFileName(String fileName) {
		this.fileName = fileName;
	}

	public String getFilePath() {
		return filePath;
	}

	public void setFilePath(String filePath) {
		this.filePath = filePath;
	}

	public String getFileSize() {
		return fileSize;
	}

	public void setFileSize(String fileSize) {
		this.fileSize = fileSize;
	}

	public Long getVersion() {
		return version;
	}

	public void setVersion(Long version) {
		this.version = version;
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

	public LocalDateTime getDeletedAt() {
		return deletedAt;
	}

	public void setDeletedAt(LocalDateTime deletedAt) {
		this.deletedAt = deletedAt;
	}

	public UsersEntity getUploadedBy() {
		return uploadedBy;
	}

	public void setUploadedBy(UsersEntity uploadedBy) {
		this.uploadedBy = uploadedBy;
	}

	public DepartmentsEntity getDepartmentId() {
		return departmentId;
	}

	public void setDepartmentId(DepartmentsEntity departmentId) {
		this.departmentId = departmentId;
	}

	public DocumentEntity getParentDocumentId() {
		return parentDocumentId;
	}

	public void setParentDocumentId(DocumentEntity parentDocumentId) {
		this.parentDocumentId = parentDocumentId;
	}

	public List<DocumentEntity> getVersions() {
		return versions;
	}

	public void setVersions(List<DocumentEntity> versions) {
		this.versions = versions;
	}
	
}

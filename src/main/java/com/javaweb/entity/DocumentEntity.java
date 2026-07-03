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
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
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
	
	@OneToMany(mappedBy = "chunkDocumentId")
	private List<DocumentChunksEntity> documentChunksEntities;
	
	@OneToMany(mappedBy = "permissionsDocumentId")
	private List<DocumentPermissionsEntity> permissionsEntities;
}
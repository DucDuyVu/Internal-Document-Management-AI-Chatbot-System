package com.javaweb.entity;

import com.javaweb.entity.enums.DocumentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng "document" trong schema.sql.
 * Lưu ý: department_id / uploaded_by / parent_document_id được giữ ở dạng
 * cột thuần (Long/Integer), KHÔNG dùng @ManyToOne, vì:
 * - Entity Department chưa tồn tại trong project ở thời điểm này.
 * - Tránh load lồng nhau (N+1) không cần thiết cho Ingestion Pipeline.
 * Nếu sau này cần join object thật, có thể đổi sang @ManyToOne.
 */
@Entity
@Table(name = "document")
@Getter
@Setter
public class DocumentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false)
    private DocumentStatus status = DocumentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", length = 50)
    private com.javaweb.entity.enums.ApprovalStatus approvalStatus;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "file_type", nullable = false, length = 50)
    private String fileType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    // NULL = tài liệu dùng chung toàn công ty (Admin upload)
    @Column(name = "department_id")
    private Integer departmentId;

    @Column(name = "uploaded_by", nullable = false)
    private Long uploadedBy;

    @Column(name = "parent_document_id")
    private Long parentDocumentId;

    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Soft delete
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;


}
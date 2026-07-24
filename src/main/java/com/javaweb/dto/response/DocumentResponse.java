package com.javaweb.dto.response;

import com.javaweb.entity.enums.DocumentStatus;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * DTO trả về cho client sau khi upload hoặc khi polling trạng thái tài liệu.
 *
 * Tại sao cần: Document entity có field nội bộ (filePath, deletedAt,
 * parentDocumentId...) không nên lộ ra API. DTO này chỉ giữ những gì
 * frontend thực sự cần để hiển thị UI.
 *
 * Được gọi bởi: DocumentServiceImpl (tạo ra) -> DocumentController (trả về
 * client).
 */
@Getter
@Setter
public class DocumentResponse {

    private Long id;
    private String title;
    private String fileName;
    private DocumentStatus status;
    private Integer chunkCount;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer departmentId;
    private String departmentName;

    public DocumentResponse() {
    }

    /**
     * Dùng ở: DocumentServiceImpl.toResponse() để tạo nhanh 1 response
     * từ Document entity + số chunk đếm được.
     * Input: toàn bộ field cần trả về client.
     * Output: object đã điền sẵn, sẵn sàng serialize JSON.
     */
    public DocumentResponse(Long id, String title, String fileName, DocumentStatus status,
            Integer chunkCount, String errorMessage,
            LocalDateTime createdAt, LocalDateTime updatedAt,
            Integer departmentId, String departmentName) {
        this.id = id;
        this.title = title;
        this.fileName = fileName;
        this.status = status;
        this.chunkCount = chunkCount;
        this.errorMessage = errorMessage;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.departmentId = departmentId;
        this.departmentName = departmentName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public DocumentStatus getStatus() {
        return status;
    }

    public void setStatus(DocumentStatus status) {
        this.status = status;
    }

    public Integer getChunkCount() {
        return chunkCount;
    }

    public void setChunkCount(Integer chunkCount) {
        this.chunkCount = chunkCount;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
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

    public Integer getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Integer departmentId) {
        this.departmentId = departmentId;
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
    }

    /*
     * FLOW:
     * Document (entity, từ DB)
     * ↓
     * DocumentServiceImpl.toResponse(document, chunkCount)
     * ↓
     * DocumentResponse (DTO)
     * ↓
     * DocumentController -> ResponseEntity<DocumentResponse>
     * ↓
     * Frontend (JSON, dùng để hiển thị / polling status)
     */
}
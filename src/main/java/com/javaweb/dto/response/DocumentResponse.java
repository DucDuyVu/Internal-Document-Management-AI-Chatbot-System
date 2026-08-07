package com.javaweb.dto.response;

import com.javaweb.entity.enums.DocumentStatus;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

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
    private String approvalStatus;
    private Integer chunkCount;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer departmentId;
    private String departmentName;
    private Long uploadedBy;
    private String uploadedByName;
    private Long fileSize;
    private String fileType;
    private String aiPurpose;
    private String aiSummary;
    private String aiTags;
    private List<String> sharedWithDepartments;

    public DocumentResponse() {
    }

    /**
     * Dùng ở: DocumentServiceImpl.toResponse() để tạo nhanh 1 response
     * từ Document entity + số chunk đếm được.
     * Input: toàn bộ field cần trả về client.
     * Output: object đã điền sẵn, sẵn sàng serialize JSON.
     */
    public DocumentResponse(Long id, String title, String fileName, DocumentStatus status,
            String approvalStatus,
            Integer chunkCount, String errorMessage,
            LocalDateTime createdAt, LocalDateTime updatedAt,
            Integer departmentId, String departmentName, Long uploadedBy, String uploadedByName,
            Long fileSize, String fileType,
            String aiPurpose, String aiSummary, String aiTags,
            List<String> sharedWithDepartments) {
        this.id = id;
        this.title = title;
        this.fileName = fileName;
        this.status = status;
        this.approvalStatus = approvalStatus;
        this.chunkCount = chunkCount;
        this.errorMessage = errorMessage;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.departmentId = departmentId;
        this.departmentName = departmentName;
        this.uploadedBy = uploadedBy;
        this.uploadedByName = uploadedByName;
        this.fileSize = fileSize;
        this.fileType = fileType;
        this.aiPurpose = aiPurpose;
        this.aiSummary = aiSummary;
        this.aiTags = aiTags;
        this.sharedWithDepartments = sharedWithDepartments;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public Long getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(Long uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public String getUploadedByName() {
        return uploadedByName;
    }

    public void setUploadedByName(String uploadedByName) {
        this.uploadedByName = uploadedByName;
    }

    public String getApprovalStatus() {
        return approvalStatus;
    }

    public void setApprovalStatus(String approvalStatus) {
        this.approvalStatus = approvalStatus;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAiPurpose() {
        return aiPurpose;
    }

    public void setAiPurpose(String aiPurpose) {
        this.aiPurpose = aiPurpose;
    }

    public String getAiSummary() {
        return aiSummary;
    }

    public void setAiSummary(String aiSummary) {
        this.aiSummary = aiSummary;
    }

    public String getAiTags() {
        return aiTags;
    }

    public void setAiTags(String aiTags) {
        this.aiTags = aiTags;
    }

    public List<String> getSharedWithDepartments() {
        return sharedWithDepartments;
    }

    public void setSharedWithDepartments(List<String> sharedWithDepartments) {
        this.sharedWithDepartments = sharedWithDepartments;
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
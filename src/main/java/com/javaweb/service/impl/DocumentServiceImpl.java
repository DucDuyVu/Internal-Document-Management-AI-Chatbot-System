package com.javaweb.service.impl;

import com.javaweb.dto.response.DocumentResponse;
import com.javaweb.dto.request.DocumentUploadRequest;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.entity.enums.DocumentStatus;
import com.javaweb.exception.DocumentNotFoundException;
import com.javaweb.exception.InvalidFileException;
import com.javaweb.rag.DocumentProcessingService;
import com.javaweb.repository.DocumentChunkRepository;
import com.javaweb.repository.DocumentRepository;
import com.javaweb.service.DocumentService;
import com.javaweb.service.AuditLogService;
import com.event.ActionType;
import com.event.AuditEven;
import com.javaweb.repository.DepartmentsRepository;
import com.javaweb.entity.DepartmentsEntity;
import groovyjarjarantlr4.v4.parse.ANTLRParser.ruleEntry_return;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Implementation thật của DocumentService.
 *
 * Nhiệm vụ: điều phối 3 việc mà Controller không nên tự làm:
 * validate file, lưu file vật lý, tạo record Document rồi bàn giao
 * cho DocumentProcessingService xử lý nền.
 *
 * Được gọi bởi: DocumentController.
 *
 * Lưu ý:
 * - Không dùng title riêng — Document entity (schema.sql thật) không
 * có cột title, nên fileName được dùng luôn làm tên hiển thị. Nếu
 * sau này DB có thêm cột title, khôi phục lại resolveTitle() và
 * set/get title như các version trước.
 * - Viết constructor injection tay (không Lombok), đồng bộ với
 * DocumentProcessingService.
 */
@Service
public class DocumentServiceImpl implements DocumentService {

    private static final String UPLOAD_DIR = "uploads";
    private static final long MAX_FILE_SIZE = 20L * 1024 * 1024; // 20MB

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentProcessingService documentProcessingService;
    private final DepartmentsRepository departmentsRepository;
    private final AuditLogService auditLogService;

    public DocumentServiceImpl(DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentProcessingService documentProcessingService,
            DepartmentsRepository departmentsRepository,
            AuditLogService auditLogService) {
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentProcessingService = documentProcessingService;
        this.departmentsRepository = departmentsRepository;
        this.auditLogService = auditLogService;
    }

    /**
     * Dùng ở: DocumentController.upload().
     * Input: file PDF + metadata (chỉ còn departmentId, vì title đã bỏ).
     * Output: DocumentResponse với status PENDING (pipeline chạy nền,
     * chưa xong lúc hàm này return).
     * Lưu ý: @Transactional chỉ bọc phần ghi DB (tạo Document), KHÔNG
     * bọc process() — vì process() là @Async, chạy ở thread khác,
     * transaction của thread hiện tại không "theo" sang được.
     */
    @Override
    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, DocumentUploadRequest request) {
        validateFile(file);
        String storedPath = storeFile(file);

        DocumentEntity document = new DocumentEntity();
        document.setFileName(file.getOriginalFilename());
        document.setFilePath(storedPath);
        document.setFileType(file.getContentType());
        document.setFileSize(file.getSize());
        document.setDepartmentId(request.getDepartmentId());
        document.setUploadedBy(1L); // TODO SECURITY: thay bằng userId thật khi bật lại Spring Security
        document.setStatus(DocumentStatus.PENDING);

        DocumentEntity saved = documentRepository.save(document);

        // Ghi nhận Audit Log
        AuditEven auditEvent = new AuditEven();
        auditEvent.setUserId(saved.getUploadedBy());

        ActionType actionType = new ActionType();
        // Tương tự, nếu bạn dùng ActionType là enum, gán bằng ActionType.UPLOAD (hoặc
        // tương tự)
        auditEvent.setAction(actionType);

        auditEvent.setTargetType("DOCUMENT");
        auditEvent.setTargetId(saved.getId());
        auditLogService.handleAuditEvent(auditEvent);

        // Gọi pipeline nền — KHÔNG đợi kết quả, vì @Async trả về ngay
        documentProcessingService.process(saved.getId());

        return toResponse(saved, 0);
    }

    /**
     * Dùng ở: DocumentController.getStatus() (endpoint polling).
     * Input: id document.
     * Output: DocumentResponse phản ánh trạng thái mới nhất trong DB.
     * Lưu ý: đếm chunk thật trong DB, không dùng field cache trong
     * entity, vì entity có thể đang bị process() cập nhật song song
     * ở thread khác.
     */
    @Override
    public DocumentResponse getDocumentStatus(Long id) {
        DocumentEntity document = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException("Không tìm thấy document id=" + id));

        int chunkCount = documentChunkRepository.countByDocumentId(id);
        return toResponse(document, chunkCount);
    }

    /**
     * Kiểm tra file hợp lệ trước khi lưu.
     * Chỉ kiểm tra 3 điều kiện cơ bản: không rỗng, đúng PDF, không quá size.
     * Việc kiểm tra nội dung PDF có đọc được hay không thuộc về PdfParser
     * (Bước 5), không lặp lại logic đó ở đây.
     */
    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidFileException("File rỗng");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new InvalidFileException("File vượt quá 20MB");
        }
        if (!"application/pdf".equals(file.getContentType())) {
            throw new InvalidFileException("Chỉ hỗ trợ file PDF");
        }
    }

    /**
     * Lưu file vật lý vào thư mục uploads/, đặt tên random (UUID) để
     * tránh trùng tên khi 2 người upload file cùng tên gốc.
     */
    private String storeFile(MultipartFile file) {
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            String uniqueName = UUID.randomUUID() + ".pdf";
            Path targetPath = uploadPath.resolve(uniqueName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            return targetPath.toString();
        } catch (IOException e) {
            throw new InvalidFileException("Lỗi khi lưu file: " + e.getMessage());
        }
    }

    /**
     * Gom dữ liệu entity thành DTO trả về client.
     * fileName được dùng thay cho title vì entity không có cột title.
     */
    private DocumentResponse toResponse(DocumentEntity document, int chunkCount) {
        String departmentName = null;
        if (document.getDepartmentId() != null) {
            departmentName = departmentsRepository.findById(Long.valueOf(document.getDepartmentId()))
                    .map(DepartmentsEntity::getName)
                    .orElse(null);
        }

        return new DocumentResponse(
                document.getId(),
                document.getFileName(),
                document.getFileName(),
                document.getStatus(),
                chunkCount,
                document.getErrorMessage(),
                document.getCreatedAt(),
                document.getUpdatedAt(),
                document.getDepartmentId(),
                departmentName);
    }

    @Override
    public Page<DocumentResponse> getAllDocuments(Pageable pageable) {
        Page<DocumentEntity> documPage = documentRepository.findAll(pageable);

        // Map entity -> DTO
        return documPage.map(doc -> {

            Integer chunkCount = documentChunkRepository.countByDocumentId(doc.getId());
            return toResponse(doc, chunkCount);
        });
    }

    // Xử lý cho user xem được tài liệu phòng ban mình + tài liệu public + tài liệu
    // được phòng ban khác chia sẻ
    @Override
    public Page<DocumentResponse> getMyDocuments(UsersEntity user, Pageable pageable) {
        Long deptIdLong = (user.getDepartment() != null) ? user.getDepartment().getId() : null;
        Integer deptIdInt = (deptIdLong != null) ? deptIdLong.intValue() : null;

        Page<DocumentEntity> documPage;
        if (deptIdInt != null) {
            documPage = documentRepository.findVisibleToDepartmentWithSharing(deptIdInt, deptIdLong, pageable);
        } else {
            // Nếu user không có phòng ban, chỉ thấy tài liệu chung
            documPage = documentRepository.findVisibleToDepartmentWithSharing(null, null, pageable);
        }

        return documPage.map(doc -> {
            Integer chunkCount = documentChunkRepository.countByDocumentId(doc.getId());
            return toResponse(doc, chunkCount);
        });
    }

    // Xử lý xóa mềm tài liệu
    @Override
    @Transactional
    public void deleteDocument(Long id, Long userId) {
        DocumentEntity document = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException("Không tìm thấy document id=" + id));

        // xóa mềm
        document.setDeletedAt(LocalDateTime.now());
        documentRepository.save(document);

        // Ghi nhận Audit Log
        AuditEven auditEvent = new AuditEven();
        auditEvent.setUserId(userId);

        ActionType actionType = new ActionType();
        // Nếu chuyển sang enum, gán bằng ActionType.DELETE
        auditEvent.setAction(actionType);

        auditEvent.setTargetType("DOCUMENT");
        auditEvent.setTargetId(document.getId());
        auditLogService.handleAuditEvent(auditEvent);
    }
}

/*
 * ============================================================
 * FLOW - uploadDocument()
 * ============================================================
 * DocumentController.upload(file, request)
 * ↓
 * validateFile(file) -- fail -> throw InvalidFileException (400)
 * ↓ ok
 * storeFile(file) -> ghi vào uploads/<uuid>.pdf
 * ↓
 * new Document(status=PENDING) -> documentRepository.save()
 * ↓
 * documentProcessingService.process(id) [@Async - không đợi]
 * ↓
 * return DocumentResponse(status=PENDING) -- trả về NGAY
 *
 * ============================================================
 * FLOW - getDocumentStatus() (frontend gọi lặp lại - polling)
 * ============================================================
 * DocumentController.getStatus(id)
 * ↓
 * documentRepository.findById(id) -- not found -> 404
 * ↓
 * documentChunkRepository.countByDocumentId(id)
 * ↓
 * return DocumentResponse(status hiện tại, chunkCount)
 * ============================================================
 */
package com.javaweb.service.impl;

import com.event.AuditEven;
import com.javaweb.dto.response.DocumentResponse;
<<<<<<< HEAD
import com.javaweb.dto.request.DocumentUploadRequest;
=======
>>>>>>> ee7b888f05b3f8115c4498f3244fc24594172e75
import com.javaweb.entity.DepartmentsEntity;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.entity.enums.ActionType;
import com.javaweb.entity.enums.ApprovalStatus;
import com.javaweb.entity.enums.DocumentStatus;
import com.javaweb.exception.DocumentNotFoundException;
import com.javaweb.exception.InvalidFileException;
import com.javaweb.rag.DocumentProcessingService;
import com.javaweb.repository.DepartmentsRepository;
import com.javaweb.repository.DocumentChunkRepository;
import com.javaweb.repository.DocumentRepository;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.DocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.AccessDeniedException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DocumentServiceImpl implements DocumentService {

    private static final String UPLOAD_DIR = "uploads";
    private static final long MAX_FILE_SIZE = 20L * 1024 * 1024; // 20MB

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentProcessingService documentProcessingService;
    private final DepartmentsRepository departmentsRepository;
    private final UsersRepository usersRepository;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    public DocumentServiceImpl(DocumentRepository documentRepository,
<<<<<<< HEAD
            DocumentChunkRepository documentChunkRepository,
            DocumentProcessingService documentProcessingService,
            DepartmentsRepository departmentsRepository) {
=======
                               DocumentChunkRepository documentChunkRepository,
                               DocumentProcessingService documentProcessingService,
                               DepartmentsRepository departmentsRepository,
                               UsersRepository usersRepository) {
>>>>>>> ee7b888f05b3f8115c4498f3244fc24594172e75
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentProcessingService = documentProcessingService;
        this.departmentsRepository = departmentsRepository;
        this.usersRepository = usersRepository;
    }

    @Override
    @Transactional
<<<<<<< HEAD
    public DocumentResponse uploadDocument(MultipartFile file, DocumentUploadRequest request, UsersEntity currentUser) {
        validateFile(file);
        String storedPath = storeFile(file);

        // --- BẢO MẬT: XỬ LÝ PHÒNG BAN ---
        Integer targetDeptId = request.getDepartmentId();

        // 1. Nếu Frontend không truyền phòng ban, mặc định gán vào phòng của người up
        if (targetDeptId == null && currentUser.getDepartment() != null) {
            targetDeptId = currentUser.getDepartment().getId().intValue();
        }

        // 2. Nếu User muốn up vào phòng ban khác phòng của mình, bắt buộc phải là ADMIN
        boolean isSameDepartment = currentUser.getDepartment() != null
                && currentUser.getDepartment().getId().intValue() == targetDeptId;
        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");

        if (!isSameDepartment && !isAdmin) {
            throw new AccessDeniedException("Bảo mật: Bạn không có quyền tải tài liệu vào phòng ban của người khác!");
        }
=======
    public DocumentResponse uploadDocument(MultipartFile file, Long currentUserId) {
        validateFile(file);
        String storedPath = storeFile(file);

        // Query lại trong transaction này -> department load được an toàn
        UsersEntity currentUser = usersRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại, id=" + currentUserId));
>>>>>>> ee7b888f05b3f8115c4498f3244fc24594172e75

        DocumentEntity document = new DocumentEntity();
        document.setFileName(file.getOriginalFilename());
        document.setFilePath(storedPath);
        document.setFileType(file.getContentType());
        document.setFileSize(file.getSize());
<<<<<<< HEAD
        document.setDepartmentId(targetDeptId);
        document.setUploadedBy(currentUser.getId());

        // --- LUỒNG PHÊ DUYỆT TÀI LIỆU ---
        document.setStatus(DocumentStatus.PENDING);
        document.setApprovalStatus(ApprovalStatus.PENDING); // Bắt buộc Manager duyệt mới chạy AI
=======
        document.setDepartmentId(
                currentUser.getDepartment() != null
                        ? currentUser.getDepartment().getId().intValue()
                        : null
        );
        document.setUploadedBy(currentUserId);
        
        // Luồng Phê duyệt Tài liệu (Human Approval Workflow)
        document.setStatus(DocumentStatus.PENDING); 
        document.setApprovalStatus(ApprovalStatus.PENDING); // Bắt buộc Manager duyệt
>>>>>>> ee7b888f05b3f8115c4498f3244fc24594172e75

        DocumentEntity saved = documentRepository.save(document);

        // Ghi nhận Audit Log
        AuditEven auditEvent = new AuditEven();
        auditEvent.setUserId(saved.getUploadedBy());
        auditEvent.setActionType(ActionType.UPLOAD_DOCUMENT);
        auditEvent.setTargetType("DOCUMENT");
        auditEvent.setTargetId(saved.getId());
        eventPublisher.publishEvent(auditEvent);

<<<<<<< HEAD
        // KHÔNG gọi pipeline ở đây. Manager sẽ duyệt (qua ManagerDocumentController)
        // thì pipeline mới chạy
=======
        // KHÔNG GỌI PIPELINE AI NỮA -> Chờ Manager duyệt (ManagerDocumentController) mới gọi
>>>>>>> ee7b888f05b3f8115c4498f3244fc24594172e75
        // documentProcessingService.process(saved.getId());

        return toResponse(saved, 0);
    }

    @Override
    public DocumentResponse getDocumentStatus(Long id) {
        DocumentEntity document = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException("Không tìm thấy document id=" + id));

        int chunkCount = documentChunkRepository.countByDocumentId(id);
        return toResponse(document, chunkCount);
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new InvalidFileException("File rỗng");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new InvalidFileException("File vượt quá 20MB");
        }
        String contentType = file.getContentType();
        String fileName = file.getOriginalFilename();
        boolean isPdfByContentType = "application/pdf".equals(contentType);
        boolean isPdfByExtension = fileName != null && fileName.toLowerCase().endsWith(".pdf");

        if (!isPdfByContentType && !isPdfByExtension) {
            throw new InvalidFileException("Chỉ hỗ trợ file PDF");
        }
    }

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
<<<<<<< HEAD
                document.getApprovalStatus() != null ? document.getApprovalStatus().name() : null, // DUYỆT
=======
                document.getApprovalStatus() != null ? document.getApprovalStatus().name() : null, // Gửi ApprovalStatus xuống Frontend
>>>>>>> ee7b888f05b3f8115c4498f3244fc24594172e75
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

        return documPage.map(doc -> {
            Integer chunkCount = documentChunkRepository.countByDocumentId(doc.getId());
            return toResponse(doc, chunkCount);
        });
    }

<<<<<<< HEAD
    @Override
    public List<DocumentResponse> getPendingApprovals(Integer departmentId) {
        List<DocumentEntity> pendingDocs = documentRepository.findByDepartmentIdAndApprovalStatusAndDeletedAtIsNull(departmentId, ApprovalStatus.PENDING);
        return pendingDocs.stream()
                .map(doc -> {
                    Integer chunkCount = documentChunkRepository.countByDocumentId(doc.getId());
                    return toResponse(doc, chunkCount);
                })
                .collect(Collectors.toList());
    }

    // Xử lý cho user xem được tài liệu phòng ban mình + tài liệu public + tài liệu
    // được phòng ban khác chia sẻ
=======
>>>>>>> ee7b888f05b3f8115c4498f3244fc24594172e75
    @Override
    public Page<DocumentResponse> getMyDocuments(UsersEntity user, Pageable pageable) {
        Long deptIdLong = (user.getDepartment() != null) ? user.getDepartment().getId() : null;
        Integer deptIdInt = (deptIdLong != null) ? deptIdLong.intValue() : null;

        Page<DocumentEntity> documPage;
        if (deptIdInt != null) {
            documPage = documentRepository.findVisibleToDepartmentWithSharing(deptIdInt, deptIdLong, pageable);
        } else {
            documPage = documentRepository.findVisibleToDepartmentWithSharing(null, null, pageable);
        }

        return documPage.map(doc -> {
            Integer chunkCount = documentChunkRepository.countByDocumentId(doc.getId());
            return toResponse(doc, chunkCount);
        });
    }

    @Override
    @Transactional
    public void deleteDocument(Long id, Long userId) {
        DocumentEntity document = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException("Không tìm thấy document id=" + id));

        document.setDeletedAt(LocalDateTime.now());
        documentRepository.save(document);

        AuditEven auditEvent = new AuditEven();
        auditEvent.setUserId(userId);
        auditEvent.setActionType(ActionType.DELETE_DOCUMENT);
        auditEvent.setTargetType("DOCUMENT");
        auditEvent.setTargetId(document.getId());
        eventPublisher.publishEvent(auditEvent);
    }
}

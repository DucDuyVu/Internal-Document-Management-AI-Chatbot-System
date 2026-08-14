package com.javaweb.service.impl;

import com.javaweb.entity.DocumentPermissionsEntity;
import com.javaweb.repository.DocumentPermissionsRepository;

import com.event.AuditEven;
import com.javaweb.dto.response.DocumentResponse;
import com.javaweb.dto.request.DocumentUploadRequest;
import com.javaweb.entity.DepartmentsEntity;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.entity.enums.ActionType;
import com.javaweb.entity.enums.ApprovalStatus;
import com.javaweb.entity.enums.DocumentStatus;
import com.javaweb.enums.UserRole;
import com.javaweb.exception.DocumentNotFoundException;
import com.javaweb.exception.ForbiddenException;
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

import com.javaweb.service.StorageService;
import com.javaweb.service.NotificationService;
import java.io.InputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Collections;
import java.util.stream.Collectors;

@Service
public class DocumentServiceImpl implements DocumentService {

    private static final long MAX_FILE_SIZE = 20L * 1024 * 1024; // 20MB

    private final DocumentRepository documentRepository;

    private final DocumentPermissionsRepository documentPermissionsRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentProcessingService documentProcessingService;
    private final DepartmentsRepository departmentsRepository;
    private final UsersRepository usersRepository;
    private final StorageService storageService;
    private final NotificationService notificationService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    public DocumentServiceImpl(DocumentRepository documentRepository,
            DocumentPermissionsRepository documentPermissionsRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentProcessingService documentProcessingService,
            DepartmentsRepository departmentsRepository,
            UsersRepository usersRepository,
            StorageService storageService,
            NotificationService notificationService) {
        this.documentRepository = documentRepository;
        this.documentPermissionsRepository = documentPermissionsRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentProcessingService = documentProcessingService;
        this.departmentsRepository = departmentsRepository;
        this.usersRepository = usersRepository;
        this.storageService = storageService;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, DocumentUploadRequest request, UsersEntity currentUser) {
        validateFile(file);
        String storedPath;
        try {
            storedPath = storageService.uploadFile(file);
        } catch (IOException e) {
            throw new InvalidFileException("Lỗi khi lưu file lên MinIO: " + e.getMessage());
        }

        // --- BẢO MẬT: XỬ LÝ PHÒNG BAN ---
        Integer targetDeptId = request.getDepartmentId();

        // 1. Nếu Frontend không truyền phòng ban, mặc định gán vào phòng của người up
        if (targetDeptId == null && currentUser.getDepartment() != null) {
            targetDeptId = currentUser.getDepartment().getId().intValue();
        }

        // 2. Nếu User muốn up vào phòng ban khác phòng của mình, bắt buộc phải là ADMIN
        Integer userDeptId = currentUser.getDepartment() != null ? currentUser.getDepartment().getId().intValue() : null;
        boolean isSameDepartment = (userDeptId == null && targetDeptId == null) || (userDeptId != null && userDeptId.equals(targetDeptId));
        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        boolean isManager = currentUser.getRole().name().equals("MANAGER");

        if (!isSameDepartment && !isAdmin) {
            throw new AccessDeniedException("Bảo mật: Bạn không có quyền tải tài liệu vào phòng ban của người khác!");
        }

        DocumentEntity document = new DocumentEntity();
        document.setFileName(file.getOriginalFilename());
        document.setFilePath(storedPath);
        document.setFileType(file.getContentType());
        document.setFileSize(file.getSize());
        document.setDepartmentId(targetDeptId);
        document.setUploadedBy(currentUser.getId());

        // --- LUỒNG PHÊ DUYỆT TÀI LIỆU ---

        if (isAdmin || isManager) {
            document.setStatus(DocumentStatus.PROCESSING);
            document.setApprovalStatus(ApprovalStatus.APPROVED);
        } else {
            document.setStatus(DocumentStatus.PENDING);
            document.setApprovalStatus(ApprovalStatus.PENDING); // Bắt buộc Manager duyệt mới chạy AI
        }

        DocumentEntity saved = documentRepository.save(document);

        // Ghi nhận Audit Log
        AuditEven auditEvent = new AuditEven();
        auditEvent.setUserId(saved.getUploadedBy());
        auditEvent.setActionType(ActionType.UPLOAD_DOCUMENT);
        auditEvent.setTargetType("DOCUMENT");
        auditEvent.setTargetId(saved.getId());
        eventPublisher.publishEvent(auditEvent);

        // Gửi thông báo
        Long notifyDeptId = targetDeptId != null ? Long.valueOf(targetDeptId) : null;
        String notifyTitle = (isAdmin || isManager) ? "Tài liệu mới" : "Tài liệu mới chờ duyệt";
        notificationService.notifySystemAction(currentUser, notifyDeptId, notifyTitle,
                "vừa tải lên tài liệu: " + file.getOriginalFilename(), isAdmin);

        // Gọi pipeline xử lý AI nếu là ADMIN hoặc MANAGER up, còn User thì chờ Manager duyệt
        if (isAdmin || isManager) {
            documentProcessingService.process(saved.getId());
        }

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

    @Override
    public InputStream downloadDocument(Long id, UsersEntity user, String requiredRole) {
        DocumentEntity document = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException("Không tìm thấy document id=" + id));

        boolean hasAccess = checkDocumentAccess(document, user, requiredRole);
        if (!hasAccess) {
            throw new ForbiddenException("Bạn không có quyền " + requiredRole + " tài liệu này!");
        }

        com.javaweb.entity.enums.ActionType actionType = "VIEW".equals(requiredRole) ? com.javaweb.entity.enums.ActionType.VIEW_DOCUMENT : com.javaweb.entity.enums.ActionType.DOWNLOAD_DOCUMENT;
        if (user != null) {
            java.util.Map<String, Object> meta = new java.util.HashMap<>();
            meta.put("fileName", document.getFileName());
            eventPublisher.publishEvent(new com.event.AuditEven(user.getId(), actionType, "DOCUMENT", document.getId(), meta));
        }

        return storageService.downloadFile(document.getFilePath());
    }

    private boolean checkDocumentAccess(DocumentEntity document, UsersEntity user, String requiredRole) {
        if (user.getRole() == UserRole.ADMIN) {
            return true;
        }

        // Tài liệu dùng chung (departmentId IS NULL) thì ai cũng có quyền
        if (document.getDepartmentId() == null) {
            return true;
        }

        // Người upload tài liệu thì luôn có quyền
        if (document.getUploadedBy() != null && document.getUploadedBy().equals(user.getId())) {
            return true;
        }

        if (user.getDepartment() != null
                && Long.valueOf(document.getDepartmentId()).equals(user.getDepartment().getId())) {
            return true;
        }

        List<DocumentPermissionsEntity> permissions = documentPermissionsRepository
                .findByDocumentIdWithDetails(document.getId());
        for (DocumentPermissionsEntity p : permissions) {
            if (Boolean.TRUE.equals(p.getIsPublicLink()) ||
                    (p.getPermissionDepartmentId() != null && user.getDepartment() != null
                            && p.getPermissionDepartmentId().getId().equals(user.getDepartment().getId()))) {

                String role = p.getRole();
                if ("DOWNLOAD".equals(role)) {
                    return true;
                } else if ("VIEW".equals(role) && "VIEW".equals(requiredRole)) {
                    return true;
                }
            }
        }
        return false;
    }

    private DocumentResponse toResponse(DocumentEntity document, int chunkCount) {
        String departmentName = null;
        if (document.getDepartmentId() != null) {
            departmentName = departmentsRepository.findById(Long.valueOf(document.getDepartmentId()))
                    .map(DepartmentsEntity::getName)
                    .orElse(null);
        }

        String uploadedByName = null;
        if (document.getUploadedBy() != null) {
            uploadedByName = usersRepository.findById(document.getUploadedBy())
                    .map(com.javaweb.entity.UsersEntity::getFullName)
                    .orElse(null);
        }

        List<DocumentPermissionsEntity> perms = documentPermissionsRepository.findByDocumentIdWithDetails(document.getId());
        List<String> sharedWithDepartments = perms.stream()
            .filter(p -> p.getPermissionDepartmentId() != null)
            .map(p -> p.getPermissionDepartmentId().getName())
            .distinct()
            .collect(Collectors.toList());

        return new DocumentResponse(
                document.getId(),
                document.getTitle() != null ? document.getTitle() : document.getFileName(),
                document.getFileName(),
                document.getStatus(),
                document.getApprovalStatus() != null ? document.getApprovalStatus().name() : null, // DUYỆT
                chunkCount,
                document.getErrorMessage(),
                document.getCreatedAt(),
                document.getUpdatedAt(),
                document.getDepartmentId(),
                departmentName,
                document.getUploadedBy(),
                uploadedByName,
                document.getFileSize(),
                document.getFileType(),
                document.getAiPurpose(),
                document.getAiSummary(),
                document.getAiTags(),
                sharedWithDepartments);
    }

    @Override
    public Page<DocumentResponse> getAllDocuments(Pageable pageable) {
        Page<DocumentEntity> documPage = documentRepository.findByDeletedAtIsNull(pageable);

        return documPage.map(doc -> {
            Integer chunkCount = documentChunkRepository.countByDocumentId(doc.getId());
            return toResponse(doc, chunkCount);
        });
    }

    @Override
    public Page<DocumentResponse> searchAdminDocuments(String search, String filter, Pageable pageable) {
        if (filter == null || filter.isEmpty()) {
            filter = "ALL";
        }
        Page<DocumentEntity> documPage = documentRepository.searchAdminDocuments(search, filter, pageable);

        return documPage.map(doc -> {
            Integer chunkCount = documentChunkRepository.countByDocumentId(doc.getId());
            return toResponse(doc, chunkCount);
        });
    }

    @Override
    public List<DocumentResponse> getShareableDocuments() {
        List<DocumentEntity> docs = documentRepository.findShareableDocuments();
        return docs.stream().map(doc -> {
            Integer chunkCount = documentChunkRepository.countByDocumentId(doc.getId());
            return toResponse(doc, chunkCount);
        }).collect(Collectors.toList());
    }

    @Override
    public List<DocumentResponse> getPendingApprovals(Integer departmentId) {
        List<DocumentEntity> pendingDocs = documentRepository.findByDepartmentIdAndApprovalStatusInAndDeletedAtIsNull(
                departmentId,
                Collections.singletonList(ApprovalStatus.PENDING));
        return pendingDocs.stream()
                .map(doc -> {
                    Integer chunkCount = documentChunkRepository.countByDocumentId(doc.getId());
                    return toResponse(doc, chunkCount);
                })
                .collect(Collectors.toList());
    }

    // Xử lý cho user xem được tài liệu phòng ban mình + tài liệu public + tài liệu
    // được phòng ban khác chia sẻ
    @Override
    public Page<DocumentResponse> getMyDocuments(UsersEntity user, Pageable pageable) {
        Long deptIdLong = (user.getDepartment() != null) ? user.getDepartment().getId() : null;
        Integer deptIdInt = (deptIdLong != null) ? deptIdLong.intValue() : null;

        // Lấy ID của user đang đăng nhập
        Long currentId = user.getId();
        boolean isManager = user.getRole().name().equals("MANAGER") || user.getRole().name().equals("ADMIN");

        Page<DocumentEntity> documPage;
        if (deptIdInt != null) {
            documPage = documentRepository.findVisibleToDepartmentWithSharing(deptIdInt, deptIdLong, currentId,
                    isManager,
                    pageable);
        } else {
            documPage = documentRepository.findVisibleToDepartmentWithSharing(null, null, currentId, isManager,
                    pageable);
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

package com.javaweb.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.event.AuditEven;
import com.javaweb.dto.response.DocumentResponse;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.enums.ActionType;
import com.javaweb.entity.enums.ApprovalStatus;
import com.javaweb.exception.DocumentNotFoundException;
import com.javaweb.service.DocumentService;

@RestController
@RequestMapping("/api/admin/documents")
public class AdminDocumentController {

    @Autowired
    private DocumentService documentService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<DocumentResponse>> getAllDocumentsForAdmin(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<DocumentResponse> result = documentService.getAllDocuments(pageable);
        return ResponseEntity.ok(result);
    }

    @Autowired
    private com.javaweb.repository.DocumentRepository documentRepository;

    @Autowired
    private com.javaweb.rag.DocumentProcessingService documentProcessingService;

    @Autowired
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @org.springframework.web.bind.annotation.PutMapping("/{id}/emergency-approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> emergencyApprove(
            @org.springframework.web.bind.annotation.PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestBody java.util.Map<String, String> payload,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.javaweb.security.CustomUserDetails userDetails) {

        String reason = payload.get("reason");
        if (reason == null || reason.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Vui lòng cung cấp lý do duyệt khẩn cấp (trường 'reason').");
        }

        DocumentEntity document = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException("Không tìm thấy tài liệu id=" + id));

        if (document.getApprovalStatus() != ApprovalStatus.PENDING) {
            return ResponseEntity.badRequest().body("Chỉ có thể duyệt tài liệu đang ở trạng thái PENDING.");
        }

        // Đổi trạng thái và lưu
        document.setApprovalStatus(ApprovalStatus.APPROVED);
        documentRepository.save(document);

        // Ghi log Audit Event
        AuditEven auditEvent = new AuditEven();
        auditEvent.setUserId(userDetails.getUser().getId());
        auditEvent.setActionType(ActionType.APPROVE_DOCUMENT);
        auditEvent.setTargetType("DOCUMENT");
        auditEvent.setTargetId(document.getId());

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("reason", "Admin duyệt khẩn cấp: " + reason);
        auditEvent.setMetadata(metadata);

        eventPublisher.publishEvent(auditEvent);

        // CHÍNH THỨC GỌI AI XỬ LÝ (CHẠY NỀN)
        documentProcessingService.process(id);

        return ResponseEntity.ok("Đã duyệt khẩn cấp tài liệu và đưa vào xử lý AI thành công.");
    }
}

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
import com.javaweb.entity.enums.DocumentStatus;
import com.javaweb.exception.DocumentNotFoundException;
import com.javaweb.repository.DocumentRepository;
import com.javaweb.rag.DocumentProcessingService;
import com.javaweb.security.CustomUserDetails;
import com.javaweb.service.DocumentService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.HttpStatus;

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
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentProcessingService documentProcessingService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @PutMapping("/{id}/emergency-approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> emergencyApprove(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

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
        document.setStatus(DocumentStatus.PROCESSING);
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

    @PutMapping("/{id}/retry")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> retryDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        DocumentEntity document = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException("Không tìm thấy tài liệu id=" + id));

        if (document.getStatus() != DocumentStatus.FAILED) {
            return ResponseEntity.badRequest().body("Chỉ có thể thử lại tài liệu bị lỗi (FAILED).");
        }

        // Khôi phục trạng thái
        document.setStatus(DocumentStatus.PROCESSING);
        document.setErrorMessage(null);
        documentRepository.save(document);

        // Gọi lại AI
        documentProcessingService.process(id);

        return ResponseEntity.ok("Đã đẩy tài liệu vào hàng chờ AI để xử lý lại.");
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            documentService.deleteDocument(id, userDetails.getUser().getId());
            return ResponseEntity.ok("Xoá tài liệu thành công.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

package com.javaweb.controller;

import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.dto.response.DocumentResponse;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.enums.ApprovalStatus;
import com.javaweb.entity.enums.DocumentStatus;
import com.javaweb.exception.DocumentNotFoundException;
import com.javaweb.rag.DocumentProcessingService;
import com.javaweb.repository.DocumentRepository;
import com.javaweb.security.CustomUserDetails;
import com.javaweb.service.DocumentService;

@RestController
@RequestMapping("/api/manager/documents")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerDocumentController {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentProcessingService documentProcessingService;

    @Autowired
    private DocumentService documentService;

    // 0. LẤY TÀI LIỆU CHỜ DUYỆT CỦA PHÒNG BAN
    @GetMapping("/pending")
    public ResponseEntity<List<DocumentResponse>> getPendingDocuments(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Integer departmentId = userDetails.getUser().getDepartment() != null
                ? userDetails.getUser().getDepartment().getId().intValue()
                : null;
        if (departmentId == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<DocumentResponse> pendingDocs = documentService.getPendingApprovals(departmentId);
        return ResponseEntity.ok(pendingDocs);
    }

    // 1. DUYỆT TÀI LIỆU
    @PutMapping("/{id}/approve")
    public ResponseEntity<String> approveDocument(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        DocumentEntity document = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException("Không tìm thấy tài liệu id=" + id));

        Integer managerDeptId = userDetails.getUser().getDepartment() != null
                ? userDetails.getUser().getDepartment().getId().intValue()
                : null;
        if (managerDeptId == null || !managerDeptId.equals(document.getDepartmentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Bạn không có quyền duyệt tài liệu của phòng ban khác.");
        }

        if (document.getApprovalStatus() != ApprovalStatus.PENDING) {
            return ResponseEntity.badRequest().body("Chỉ có thể duyệt tài liệu đang ở trạng thái PENDING.");
        }

        // Đổi trạng thái và lưu
        document.setApprovalStatus(ApprovalStatus.APPROVED);
        documentRepository.save(document);

        // CHÍNH THỨC GỌI AI XỬ LÝ (CHẠY NỀN)
        documentProcessingService.process(id);

        return ResponseEntity.ok("Đã duyệt tài liệu và đưa vào xử lý AI thành công.");
    }

    // 2. TỪ CHỐI TÀI LIỆU
    @PutMapping("/{id}/reject")
    public ResponseEntity<String> rejectDocument(@PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> payload,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        DocumentEntity document = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException("Không tìm thấy tài liệu id=" + id));

        Integer managerDeptId = userDetails.getUser().getDepartment() != null
                ? userDetails.getUser().getDepartment().getId().intValue()
                : null;
        if (managerDeptId == null || !managerDeptId.equals(document.getDepartmentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Bạn không có quyền từ chối tài liệu của phòng ban khác.");
        }

        if (document.getApprovalStatus() != ApprovalStatus.PENDING) {
            return ResponseEntity.badRequest().body("Chỉ có thể từ chối tài liệu đang ở trạng thái PENDING.");
        }

        String reason = "Bị từ chối bởi Quản lý.";
        if (payload != null && payload.containsKey("reason") && !payload.get("reason").trim().isEmpty()) {
            reason = payload.get("reason").trim();
        }

        // Từ chối (AI không bao giờ được gọi)
        document.setApprovalStatus(ApprovalStatus.REJECTED);
        document.setStatus(DocumentStatus.FAILED);
        document.setErrorMessage(reason);
        documentRepository.save(document);
        
        return ResponseEntity.ok("Đã từ chối tài liệu thành công.");
    }

    // 3. THỬ LẠI KHI AI BỊ LỖI
    @PutMapping("/{id}/retry")
    public ResponseEntity<String> retryDocument(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        DocumentEntity document = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException("Không tìm thấy tài liệu id=" + id));

        Integer managerDeptId = userDetails.getUser().getDepartment() != null
                ? userDetails.getUser().getDepartment().getId().intValue()
                : null;
        if (managerDeptId == null || !managerDeptId.equals(document.getDepartmentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Bạn không có quyền thử lại tài liệu của phòng ban khác.");
        }

        if (document.getStatus() != DocumentStatus.FAILED) {
            return ResponseEntity.badRequest().body("Chỉ có thể thử lại tài liệu bị lỗi (FAILED).");
        }

        // Khôi phục trạng thái
        document.setStatus(DocumentStatus.PENDING);
        document.setErrorMessage(null);
        documentRepository.save(document);

        // Gọi lại AI
        documentProcessingService.process(id);

        return ResponseEntity.ok("Đã đẩy tài liệu vào hàng chờ AI để xử lý lại.");
    }

    // 4. XOÁ (Xoá mềm)
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteDocument(@PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        DocumentEntity document = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException("Không tìm thấy tài liệu id=" + id));

        Integer managerDeptId = userDetails.getUser().getDepartment() != null
                ? userDetails.getUser().getDepartment().getId().intValue()
                : null;
        if (managerDeptId == null || !managerDeptId.equals(document.getDepartmentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Bạn không có quyền xoá tài liệu của phòng ban khác.");
        }

        documentService.deleteDocument(id, userDetails.getUser().getId());
        return ResponseEntity.ok("Đã xoá tài liệu thành công.");
    }
}

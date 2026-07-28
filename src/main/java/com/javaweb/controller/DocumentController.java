package com.javaweb.controller;

import com.javaweb.dto.response.DocumentResponse;
import com.javaweb.dto.request.DocumentUploadRequest;
import com.javaweb.dto.request.ShareDocumentRequest;
import com.javaweb.dto.response.DocumentPermissionResponse;
import com.javaweb.repository.DocumentPermissionsRepository;
import com.javaweb.security.CustomUserDetails;
import com.javaweb.service.DocumentPermissionService;
import com.javaweb.service.DocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Controller expose API cho Upload PDF và tra cứu trạng thái xử lý.
 *
 * Nhiệm vụ: chỉ nhận request, gọi DocumentService, trả response.
 * KHÔNG chứa logic nghiệp vụ (validate, lưu file, gọi pipeline) — toàn
 * bộ nằm ở DocumentServiceImpl.
 *
 * Được gọi bởi: Frontend (Member A's UI hoặc màn hình User Document
 * Management theo tài liệu UI Kim đã làm).
 */
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    @Autowired
    private DocumentPermissionService documentPermissionService;

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    /**
     * Dùng ở: màn hình Admin Upload & PDF Processing, và User Document
     * Management (upload).
     * Input: file (multipart), departmentId (form field, optional).
     * Output: 201 Created + DocumentResponse (status = PENDING).
     * Lưu ý: response trả về NGAY, không đợi pipeline xử lý xong — vì
     * process() chạy @Async. Frontend phải tự polling GET /{id}.
     */
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<DocumentResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "departmentId", required = false) Integer departmentId) {
        DocumentUploadRequest request = new DocumentUploadRequest();
        request.setDepartmentId(departmentId);

        DocumentResponse response = documentService.uploadDocument(file, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Lấy danh sách tài liệu của User/Manager đang đăng nhập.
     * Bao gồm: tài liệu phòng ban mình up + tài liệu phòng ban khác share + tài
     * liệu public.
     */
    @GetMapping
    public ResponseEntity<Page<DocumentResponse>> getMyDocuments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<DocumentResponse> result = documentService.getMyDocuments(userDetails.getUser(), pageable);
        return ResponseEntity.ok(result);
    }

    /**
     * Dùng ở: frontend polling sau khi upload, để biết khi nào status
     * chuyển PENDING -> PROCESSING -> COMPLETED/FAILED.
     * Input: id document (path variable).
     * Output: 200 OK + DocumentResponse, hoặc 404 nếu không tồn tại
     * (xử lý tự động qua GlobalExceptionHandler, Controller không
     * cần try-catch ở đây).
     */
    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getStatus(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.getDocumentStatus(id));
    }

    // Trả về danh sách tất cả các quyền (cho Admin Dashboard)
    @GetMapping("/permissions")
    public ResponseEntity<List<DocumentPermissionResponse>> getAllPermissions(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<DocumentPermissionResponse> result = documentPermissionService.getAllPermissions(userDetails.getUser());
        return ResponseEntity.ok(result);
    }

    // Trả về danh sách phòng ban được xem 1 tài liệu được chia sẻ
    @GetMapping("/{docId}/permissions")
    public ResponseEntity<List<DocumentPermissionResponse>> getPermissions(@PathVariable Long docId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        // Check thông tin người dùng : token còn hạn, đăng nhập chưa
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<DocumentPermissionResponse> result = documentPermissionService.getPermissions(docId,
                userDetails.getUser());
        return ResponseEntity.ok(result); // .ok là method dùng để HTTP Status 200 (OK).
    }

    // Chia sẻ tài liệu với phòng ban khác
    @PostMapping("/{docId}/permissions")
    public ResponseEntity<DocumentPermissionResponse> shareDocument(@PathVariable Long docId,
            @RequestBody ShareDocumentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        DocumentPermissionResponse result = documentPermissionService.share(docId, request.getDepartmentId(),
                userDetails.getUser());
        // status : 201 Created - để FE có thể thêm luôn vào danh sách hiển thị mà không
        // cần gọi lại API GET.
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    // Thu hồi quyền truy cập của 1 phòng ban đối với 1 tài liệu
    @DeleteMapping("/{docId}/permissions/{departmentId}")
    public ResponseEntity<Void> revokePermission(
            @PathVariable Long docId,
            @PathVariable Long departmentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        documentPermissionService.revoke(docId, departmentId, userDetails.getUser());

        return ResponseEntity.noContent().build(); // trả về 204 No Content
    }
}

/*
 * ============================================================
 * FLOW - toàn bộ Bước 8
 * ============================================================
 * Frontend
 * │
 * ├─ POST /api/documents/upload (multipart: file + departmentId)
 * │ ↓
 * │ DocumentController.upload()
 * │ ↓
 * │ DocumentService.uploadDocument()
 * │ ↓
 * │ DocumentServiceImpl: validate → lưu file → save Document(PENDING)
 * │ ↓
 * │ DocumentProcessingService.process(id) [@Async, chạy nền]
 * │ ↓
 * │ trả về 201 + {id, status: PENDING}
 * │
 * └─ GET /api/documents/{id} (lặp lại mỗi vài giây)
 * ↓
 * DocumentController.getStatus()
 * ↓
 * DocumentService.getDocumentStatus()
 * ↓
 * trả về {status: PROCESSING/COMPLETED/FAILED, chunkCount}
 * ============================================================
 */
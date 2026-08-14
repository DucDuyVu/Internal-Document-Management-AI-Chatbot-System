package com.javaweb.controller;

import com.javaweb.dto.response.DocumentResponse;
import com.javaweb.dto.request.DocumentUploadRequest;
import com.javaweb.dto.request.ShareDocumentRequest;
import com.javaweb.dto.response.DocumentPermissionResponse;
import com.javaweb.repository.DocumentPermissionsRepository;
import com.javaweb.security.CustomUserDetails;
import com.javaweb.service.DocumentPermissionService;
import com.javaweb.service.DocumentService;
import com.javaweb.entity.UsersEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.core.io.InputStreamResource;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
import java.io.InputStream;
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
            @RequestParam(value = "departmentId", required = false) Integer departmentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        DocumentUploadRequest request = new DocumentUploadRequest();
        request.setDepartmentId(departmentId);

        // Giải pháp lai: Truyền cả request và currentUser xuống Service
        DocumentResponse response = documentService.uploadDocument(file, request, userDetails.getUser());
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

    /**
     * Tải xuống tài liệu.
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<?> download(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            InputStream inputStream = documentService.downloadDocument(id,
                    userDetails.getUser(), "DOWNLOAD");

            DocumentResponse document = documentService.getDocumentStatus(id);
            String fileName = document.getFileName();
            
            String contentType = "application/octet-stream";
            if (fileName != null && fileName.toLowerCase().endsWith(".pdf")) {
                contentType = "application/pdf";
            }

            org.springframework.http.ContentDisposition contentDisposition = org.springframework.http.ContentDisposition.builder("attachment")
                    .filename(fileName, java.nio.charset.StandardCharsets.UTF_8)
                    .build();

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                    .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                    .body(new InputStreamResource(inputStream));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Lỗi máy chủ khi tải file: " + e.getMessage());
        }
    }

    /**
     * Xem trực tiếp tài liệu trên trình duyệt.
     */
    @GetMapping("/{id}/view")
    public ResponseEntity<?> view(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            InputStream inputStream = documentService.downloadDocument(id,
                    userDetails.getUser(), "VIEW");

            DocumentResponse document = documentService.getDocumentStatus(id);
            String fileName = document.getFileName();

            String contentType = "application/octet-stream";
            if (fileName != null && fileName.toLowerCase().endsWith(".pdf")) {
                contentType = "application/pdf";
            }

            org.springframework.http.ContentDisposition contentDisposition = org.springframework.http.ContentDisposition.builder("inline")
                    .filename(fileName, java.nio.charset.StandardCharsets.UTF_8)
                    .build();

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                    .body(new InputStreamResource(inputStream));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Lỗi máy chủ khi xem file: " + e.getMessage());
        }
    }

    /**
     * Xóa tài liệu (dành cho người tạo)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteMyDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            documentService.deleteDocument(id, userDetails.getUser().getId());
            return ResponseEntity.ok("Đã thu hồi tài liệu thành công.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
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
        DocumentPermissionResponse result = documentPermissionService.share(docId, request,
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

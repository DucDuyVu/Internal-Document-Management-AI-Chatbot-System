package com.javaweb.controller;

import com.javaweb.dto.document.DocumentResponse;
import com.javaweb.dto.document.DocumentUploadRequest;
import com.javaweb.service.DocumentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
            @RequestParam(value = "departmentId", required = false) Integer departmentId
    ) {
        DocumentUploadRequest request = new DocumentUploadRequest();
        request.setDepartmentId(departmentId);

        DocumentResponse response = documentService.uploadDocument(file, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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
}

/*
 * ============================================================
 * FLOW - toàn bộ Bước 8
 * ============================================================
 *  Frontend
 *      │
 *      ├─ POST /api/documents/upload (multipart: file + departmentId)
 *      │        ↓
 *      │   DocumentController.upload()
 *      │        ↓
 *      │   DocumentService.uploadDocument()
 *      │        ↓
 *      │   DocumentServiceImpl: validate → lưu file → save Document(PENDING)
 *      │        ↓
 *      │   DocumentProcessingService.process(id)  [@Async, chạy nền]
 *      │        ↓
 *      │   trả về 201 + {id, status: PENDING}
 *      │
 *      └─ GET /api/documents/{id}  (lặp lại mỗi vài giây)
 *               ↓
 *          DocumentController.getStatus()
 *               ↓
 *          DocumentService.getDocumentStatus()
 *               ↓
 *          trả về {status: PROCESSING/COMPLETED/FAILED, chunkCount}
 * ============================================================
 */
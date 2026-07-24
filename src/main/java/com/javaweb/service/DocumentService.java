package com.javaweb.service;

import com.javaweb.dto.response.DocumentResponse;
import com.javaweb.dto.request.DocumentUploadRequest;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

/**
 * Interface nghiệp vụ xử lý Document ở tầng Service.
 *
 * Tại sao cần: Controller không nên chứa logic (lưu file, validate, gọi
 * pipeline xử lý) — tách ra Service để Controller chỉ làm nhiệm vụ
 * "nhận request -> gọi service -> trả response".
 *
 * Được gọi bởi: DocumentController.
 * Được implement bởi: DocumentServiceImpl.
 */
public interface DocumentService {

    /**
     * Dùng ở: DocumentController.upload().
     * Input: file PDF (MultipartFile) + metadata (title, departmentId).
     * Output: DocumentResponse với status PENDING (vì xử lý pipeline chạy
     * bất đồng bộ @Async, chưa xong ngay lúc trả response).
     * Lưu ý: không throw checked exception ra ngoài — lỗi validate file
     * sẽ ném InvalidFileException (unchecked), bắt ở GlobalExceptionHandler.
     */
    DocumentResponse uploadDocument(MultipartFile file, DocumentUploadRequest request);

    /**
     * Dùng ở: DocumentController.getStatus() (endpoint polling).
     * Input: id của Document.
     * Output: DocumentResponse với status hiện tại (PENDING/PROCESSING/
     * COMPLETED/FAILED) và số chunk đã sinh ra (nếu có).
     * Lưu ý: throw DocumentNotFoundException nếu id không tồn tại.
     */
    DocumentResponse getDocumentStatus(Long id);

    // Lấy danh sách các tài liệu (Admin)
    Page<DocumentResponse> getAllDocuments(Pageable pageable);

    // Lấy danh sách tài liệu cho User/Manager (bao gồm tài liệu của phòng ban và
    // được chia sẻ)
    Page<DocumentResponse> getMyDocuments(com.javaweb.entity.UsersEntity user, Pageable pageable);
}

/*
 * FLOW:
 * DocumentController
 * ↓ (gọi qua interface, không biết class thật nào implement)
 * DocumentService <-- interface (file này)
 * ↓ (Spring inject bean thật vào lúc runtime)
 * DocumentServiceImpl <-- implementation thật
 */
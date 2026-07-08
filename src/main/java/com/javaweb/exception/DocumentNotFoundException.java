package com.javaweb.exception;

/**
 * Exception ném ra khi không tìm thấy Document theo id.
 *
 * Được gọi bởi: DocumentServiceImpl.getDocumentStatus() -> bắt lại ở
 * GlobalExceptionHandler -> trả HTTP 404.
 */
public class DocumentNotFoundException extends RuntimeException {

    /**
     * Dùng ở: DocumentServiceImpl.getDocumentStatus() khi
     * documentRepository.findById(id) trả về Optional rỗng.
     * Input: message (thường kèm id để dễ trace log).
     */
    public DocumentNotFoundException(String message) {
        super(message);
    }
}

/*
 * FLOW:
 * DocumentServiceImpl.getDocumentStatus(id)
 *      ↓ (nếu không tìm thấy)
 * throw DocumentNotFoundException("...")
 *      ↓
 * GlobalExceptionHandler.handleNotFound()
 *      ↓
 * ResponseEntity.status(404).body(message)  -> HTTP 404 về client
 */
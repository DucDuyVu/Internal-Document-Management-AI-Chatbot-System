package com.javaweb.exception;

/**
 * Exception ném ra khi file client upload không hợp lệ.
 *
 * Tại sao cần: nếu chỉ dùng RuntimeException chung, GlobalExceptionHandler
 * không phân biệt được lỗi "do client" (400) hay lỗi "do server" (500).
 *
 * Được gọi bởi: DocumentServiceImpl.validateFile() -> bắt lại ở
 * GlobalExceptionHandler -> trả HTTP 400.
 */
public class InvalidFileException extends RuntimeException {

    /**
     * Dùng ở: DocumentServiceImpl khi file rỗng, sai MIME type, hoặc vượt size.
     * Input: message mô tả lý do cụ thể (hiển thị luôn cho client biết vì sao fail).
     * Output: exception object, không return giá trị.
     */
    public InvalidFileException(String message) {
        super(message);
    }
}

/*
 * FLOW:
 * DocumentServiceImpl.validateFile(file)
 *      ↓ (nếu file không hợp lệ)
 * throw InvalidFileException("...")
 *      ↓
 * GlobalExceptionHandler.handleInvalidFile()
 *      ↓
 * ResponseEntity.badRequest().body(message)  -> HTTP 400 về client
 */
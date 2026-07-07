package com.javaweb.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Bắt exception ném ra từ bất kỳ Controller nào trong ứng dụng.
 *
 * Tại sao cần: nếu không có class này, mỗi Controller phải tự try-catch
 * và tự build ResponseEntity lỗi -> lặp code. @RestControllerAdvice giúp
 * Spring tự động chặn exception ở tầng ngoài cùng trước khi nó thành lỗi 500 mặc định.
 *
 * Được gọi bởi: Spring framework tự động (không ai gọi trực tiếp).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Dùng ở: bắt mọi InvalidFileException ném từ DocumentServiceImpl.
     * Input: exception object.
     * Output: HTTP 400 kèm message lỗi dạng text.
     */
    @ExceptionHandler(InvalidFileException.class)
    public ResponseEntity<String> handleInvalidFile(InvalidFileException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    /**
     * Dùng ở: bắt mọi DocumentNotFoundException ném từ DocumentServiceImpl.
     * Input: exception object.
     * Output: HTTP 404 kèm message lỗi dạng text.
     */
    @ExceptionHandler(DocumentNotFoundException.class)
    public ResponseEntity<String> handleNotFound(DocumentNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
    }
}

/*
 * FLOW:
 * Controller (throw exception ở đâu đó trong chuỗi gọi)
 *      ↓
 * Spring AOP chặn exception trước khi thành lỗi 500 mặc định
 *      ↓
 * GlobalExceptionHandler.handleXxx() tương ứng với loại exception
 *      ↓
 * ResponseEntity trả về client (400 hoặc 404)
 */
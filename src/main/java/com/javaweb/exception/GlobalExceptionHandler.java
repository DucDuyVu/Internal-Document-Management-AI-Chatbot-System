package com.javaweb.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * Bat exception nem ra tu bat ky Controller nao trong ung dung.
 * Gom xu ly ca auth (BadRequestException) va document (InvalidFileException,
 * DocumentNotFoundException).
 * Toan bo response tra ve dang JSON { "message": "..." } de frontend parse duoc.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleMaxSizeException(MaxUploadSizeExceededException exc) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(Map.of("message", "Kích thước file quá lớn (tối đa 20MB)"));
    }

    @ExceptionHandler(InvalidFileException.class)
    public ResponseEntity<Map<String, String>> handleInvalidFile(InvalidFileException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(DocumentNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleDocumentNotFound(DocumentNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Map<String, String>> handleForbidden(ForbiddenException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception e, HttpServletRequest request) {
        try {
            String uri = request != null ? request.getRequestURI() : "unknown";
            Files.write(Paths.get("error.log"), 
                ("URI: " + uri + "\n" + e.getMessage() + "\n" + Arrays.toString(e.getStackTrace())).getBytes());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Internal Server Error at " + uri + ": " + e.getMessage()));
        } catch (Exception ignored) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Internal Server Error: " + e.getMessage()));
        }
    }
}
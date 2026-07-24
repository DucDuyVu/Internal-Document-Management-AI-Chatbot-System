package com.javaweb.exception;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Bat exception nem ra tu bat ky Controller nao trong ung dung.
 * Gom xu ly ca auth (BadRequestException) va document (InvalidFileException,
 * DocumentNotFoundException).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(BadRequestException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(InvalidFileException.class)
    public ResponseEntity<String> handleInvalidFile(InvalidFileException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    @ExceptionHandler(DocumentNotFoundException.class)
    public ResponseEntity<String> handleNotFound(DocumentNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<String> handleNotFound(NotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Map<String, String>> handleForbidden(ForbiddenException e) {
        Map<String, String> response = new HashMap<>();
        response.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }
}
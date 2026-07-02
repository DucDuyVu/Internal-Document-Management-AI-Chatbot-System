package com.javaweb.entity.enums;

/**
 * Trạng thái xử lý của 1 tài liệu trong Ingestion Pipeline.
 * Khớp với kiểu ENUM "document_status" trong schema.sql:
 *   CREATE TYPE document_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
 */
public enum DocumentStatus {
    PENDING,
    PROCESSING,
    COMPLETED,
    FAILED
}
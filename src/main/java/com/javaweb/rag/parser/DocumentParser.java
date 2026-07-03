package com.javaweb.rag.parser;

import java.io.File;
import java.io.IOException;
/**
 * Interface chịu trách nhiệm đọc nội dung từ tài liệu.
 *
 * Hiện tại project mới hỗ trợ PDF thông qua PdfParser.
 * Sau này có thể mở rộng WordParser, ExcelParser...
 *
 * Các tầng phía trên chỉ làm việc với DocumentParser
 * mà không phụ thuộc vào loại tài liệu cụ thể.
 */
public interface DocumentParser {

    /**
     * Đọc toàn bộ nội dung text từ một tài liệu.S
     *
     * @param file File cần đọc.
     * @return Nội dung text của tài liệu.
     * @throws  IOException Nếu file không đọc được hoặc sai định dạng.
     */
    String parse(File file) throws IOException;}

/*
 * ===============================================================
 *                     LUỒNG CHẠY DOCUMENT PARSER
 * ===============================================================
 *
 * DocumentProcessingService
 *            │
 *            ▼
 * documentParser.parse(pdfFile)
 *            │
 *            ▼
 * PdfParser
 *            │
 *            ▼
 * Apache PDFBox
 *            │
 *            ▼
 * Trích xuất toàn bộ text
 *            │
 *            ▼
 * String content
 *            │
 *            ▼
 * ChunkingService
 *
 * ===============================================================
 */

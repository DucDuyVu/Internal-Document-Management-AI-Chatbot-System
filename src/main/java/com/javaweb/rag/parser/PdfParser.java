package com.javaweb.rag.parser;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.IOException;

/**
 * Triển khai DocumentParser cho file PDF.
 *
 * Sử dụng Apache PDFBox để đọc toàn bộ nội dung text
 * từ file PDF và trả về dưới dạng String.
 *
 * Kết quả sẽ được chuyển sang ChunkingService
 * để chia thành các đoạn nhỏ trước khi tạo embedding.
 */
@Service
public class PdfParser implements DocumentParser {

    /**
     * Đọc toàn bộ nội dung text từ file PDF.
     *
     * @param fileData Mảng byte của file PDF.
     * @return Nội dung text của file PDF.
     * @throws IOException Nếu không thể mở hoặc đọc file PDF.
     */
    @Override
    public String parse(byte[] fileData) throws IOException {
        // Mở file PDF bằng PDFBox.
        try (PDDocument document = Loader.loadPDF(fileData)) {

            // Đối tượng dùng để trích xuất text từ PDF.
            PDFTextStripper stripper = new PDFTextStripper();

            // Trả về toàn bộ nội dung text của PDF.
            return stripper.getText(document);
        }
    }
}

/*
 * ===============================================================
 *                       LUỒNG CHẠY PDF PARSER
 * ===============================================================
 *
 * File PDF
 *      │
 *      ▼
 * Loader.loadPDF()
 *      │
 *      ▼
 * PDDocument
 *      │
 *      ▼
 * PDFTextStripper
 *      │
 *      ▼
 * String content
 *      │
 *      ▼
 * DocumentProcessingService
 *      │
 *      ▼
 * ChunkingService
 *
 * ===============================================================
 */

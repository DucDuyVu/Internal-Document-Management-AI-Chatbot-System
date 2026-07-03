package com.javaweb.rag.chunking;

import java.util.List;

/**
 * Định nghĩa contract (hợp đồng) cho các thuật toán chia nhỏ tài liệu (Chunking).
 *
 * Nhiệm vụ:
 * - Nhận vào toàn bộ nội dung của một tài liệu dưới dạng String.
 * - Chia nội dung thành nhiều đoạn (chunk).
 * - Trả về danh sách các chunk để phục vụ việc tạo Embedding.
 *
 * Tại sao cần interface này?
 * - Giúp toàn bộ hệ thống không phụ thuộc vào một thuật toán chunking cụ thể.
 * - Sau này có thể thay thế thuật toán mà không cần sửa các tầng khác.
 *
 * Được sử dụng bởi:
 * - DocumentProcessingService (Day 3)
 *
 * Các class triển khai:
 * - SimpleChunkingService (chia theo số ký tự)
 * - Có thể mở rộng thêm SemanticChunkingService,
 *   RecursiveChunkingService... trong tương lai.
 */
public interface ChunkingService {

    /**
     * Chia nội dung tài liệu thành nhiều đoạn nhỏ (chunk).
     *
     * Được gọi trong Ingestion Pipeline sau khi Parser
     * đã đọc toàn bộ nội dung của file PDF.
     *
     * Input:
     * - content: Toàn bộ nội dung văn bản của tài liệu.
     *
     * Output:
     * - Danh sách các chunk theo đúng thuật toán triển khai.
     *
     * Lưu ý:
     * - Interface chỉ định nghĩa hành vi.
     * - Logic chia chunk sẽ nằm trong class implement.
     *
     * @param content Nội dung đầy đủ của tài liệu.
     * @return Danh sách các đoạn văn bản sau khi chia.
     */
    List<String> chunk(String content);
}

/*
 * ===============================================================
 *                  LUỒNG CHẠY CHUNKING SERVICE
 * ===============================================================
 *
 *                PdfParser
 *                    │
 *                    ▼
 *          String documentContent
 *                    │
 *                    ▼
 *      ChunkingService.chunk(content)
 *                    │
 *                    ▼
 *     SimpleChunkingService (implements)
 *                    │
 *                    ▼
 *          List<String> chunks
 *                    │
 *                    ▼
 *      DocumentProcessingService
 *                    │
 *                    ▼
 *       GeminiEmbeddingService
 *                    │
 *                    ▼
 *          float[] embedding
 *
 * ===============================================================
 */

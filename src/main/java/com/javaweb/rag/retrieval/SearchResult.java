package com.javaweb.rag.retrieval;

import com.javaweb.entity.DocumentChunkEntity;

/**
 * SearchResult — gói kết quả của 1 lần vector search: 1 đoạn văn bản (chunk)
 * kèm điểm similarity của nó so với câu hỏi vừa hỏi.
 *
 * Tại sao cần record riêng thay vì thêm field similarity vào
 * DocumentChunkEntity: similarity không phải thuộc tính cố định của chunk
 * trong DB, mà phụ thuộc vào câu hỏi nào đang được tìm. Nhét vào Entity sẽ
 * làm "bẩn" dữ liệu entity (giá trị đúng/sai tùy ngữ cảnh gọi).
 *
 * Được tầng nào gọi:
 *   - DocumentChunkRepository (default method searchSimilarChunks) tạo ra
 *     danh sách SearchResult từ kết quả native query.
 *   - RetrievalService (Milestone 3) đọc similarity() để so ngưỡng threshold,
 *     đọc chunk() để lấy content, documentId, chunkId.
 *
 * @param chunk      đoạn văn bản + metadata (document_id, content, page_number...)
 * @param similarity khoảng cách cosine (0 = giống hệt, số càng LỚN = càng khác xa;
 *                   đây là toán tử "<=>" của pgvector — là KHOẢNG CÁCH, không phải
 *                   độ tương đồng, nên càng nhỏ càng tốt, KHÔNG phải càng lớn càng tốt)
 */
public record SearchResult(DocumentChunkEntity chunk, double similarity) {
}

/*
 * ASCII Flow — SearchResult được tạo và dùng ở đâu:
 *
 *  DocumentChunkRepository.searchSimilarChunksRaw()   (native query)
 *              │
 *              ▼
 *        List<Object[]>   (mỗi hàng: id, document_id, chunk_index,
 *                           page_number, content, created_at, similarity_score)
 *              │
 *              ▼ (default method map từng Object[] -> SearchResult)
 *        List<SearchResult>
 *              │
 *              ▼
 *   RetrievalService (Milestone 3) đọc result.similarity() so với threshold
 *              │
 *              ▼
 *   ChunkFormatter.format(result) đọc result.chunk().getContent()
 */
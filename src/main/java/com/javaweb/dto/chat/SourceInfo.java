package com.javaweb.dto.chat;

/**
 * SourceInfo — DTO đại diện cho 1 nguồn trích dẫn trong ChatAnswerResponse.
 *
 * Tại sao không trả thẳng SearchResult hoặc DocumentChunkEntity ra
 * Controller: SearchResult/Entity mang theo nhiều field nội bộ (content
 * đầy đủ...) không cần thiết và không nên lộ nguyên vẹn ra API public -
 * SourceInfo chỉ giữ đúng 3 trường client thực sự cần để hiển thị "câu trả
 * lời này lấy từ tài liệu nào, đoạn nào, độ liên quan bao nhiêu".
 *
 * Được tầng nào gọi: RetrievalServiceImpl.ask(), map từ List<SearchResult>.
 *
 * @param documentId id của tài liệu gốc (document.id) - dùng để link tới
 *                    API xem chi tiết tài liệu (vd GET /api/documents/{id})
 * @param chunkId    id của đoạn văn bản cụ thể (document_chunks.id)
 * @param distance   cosine distance của chunk này với câu hỏi (0 = tốt nhất)
 */
public record SourceInfo(Long documentId, Long chunkId, double distance) {
}
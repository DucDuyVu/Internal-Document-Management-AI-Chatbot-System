package com.javaweb.rag.embedding;

/**
 * Interface sinh vector embedding cho RAG pipeline.
 * Tách riêng 2 phương thức vì Gemini khuyến nghị dùng khác task_type
 * cho tài liệu (RETRIEVAL_DOCUMENT) và câu hỏi (RETRIEVAL_QUERY)
 * để tăng độ chính xác vector search — chi tiết task_type được
 * xử lý bên trong implementation, không lộ ra interface này.
 */
public interface EmbeddingService {

    /**
     * Sinh embedding cho 1 đoạn nội dung tài liệu (dùng ở Ingestion Pipeline).
     * @param content nội dung đoạn văn bản (1 chunk)
     * @return vector 3072 chiều
     */
    float[] embedDocument(String content);

    /**
     * Sinh embedding cho câu hỏi của user (dùng ở Query Pipeline).
     * @param question câu hỏi người dùng nhập
     * @return vector 3072 chiều
     */
    float[] embedQuery(String question);
}

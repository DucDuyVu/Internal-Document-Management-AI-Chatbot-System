package com.javaweb.rag.retrieval;

import com.javaweb.dto.chat.ChatAnswerResponse;

/**
 * RetrievalService — cổng vào duy nhất của toàn bộ Query Pipeline (RAG Core).
 *
 * File này có nhiệm vụ gì: định nghĩa hợp đồng "hỏi 1 câu, nhận 1 câu trả
 * lời kèm nguồn trích dẫn" — ẩn hoàn toàn chi tiết bên trong (embedding,
 * vector search, threshold, gọi Gemini) khỏi tầng gọi nó.
 *
 * Tại sao cần tách interface riêng khỏi Impl: ChatController chỉ nên phụ
 * thuộc vào interface này, không phụ thuộc class cụ thể - giúp sau này
 * viết unit test cho Controller bằng cách mock interface, không cần khởi
 * động thật EmbeddingService/GeminiChatService/DB.
 *
 * Được tầng nào gọi: ChatController.ask(), mỗi request POST /api/chat/ask
 * gọi đúng 1 lần method ask() bên dưới.
 */
public interface RetrievalService {

    /**
     * Trả lời 1 câu hỏi dựa trên tài liệu mà user có quyền xem.
     *
     * Dùng ở đâu: ChatController.ask()
     * Input:
     *   @param question     câu hỏi gốc của user, dạng text thuần
     *   @param departmentId phòng ban của user hỏi; NULL nếu user không
     *                       thuộc phòng ban nào (Admin) - khi đó chỉ thấy
     *                       tài liệu department_id IS NULL (dùng chung).
     *                       LƯU Ý: tham số này PHẢI được tầng gọi lấy từ
     *                       nguồn đáng tin cậy (JWT token ở Tuần 5, hiện
     *                       tại hard-code null ở ChatController) — không
     *                       bao giờ được lấy trực tiếp từ dữ liệu client
     *                       tự khai báo trong request body.
     * Output:
     *   ChatAnswerResponse - DTO thuần (answer, sources, distance), không
     *   lộ Entity ra ngoài interface này
     */
    ChatAnswerResponse ask(String question, Integer departmentId);
}
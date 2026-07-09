package com.javaweb.controller;

import com.javaweb.dto.chat.ChatAnswerResponse;
import com.javaweb.dto.chat.ChatQuestionRequest;
import com.javaweb.rag.retrieval.RetrievalService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ChatController — cổng HTTP duy nhất cho Query Pipeline (RAG Core).
 *
 * File này có nhiệm vụ gì: nhận câu hỏi từ client qua HTTP, gọi
 * RetrievalService xử lý, trả kết quả JSON - KHÔNG chứa bất kỳ logic
 * nghiệp vụ nào (không gọi trực tiếp EmbeddingService, Repository, Gemini).
 *
 * Tại sao cần tách biệt tuyệt đối với logic: Controller thay đổi vì lý do
 * "giao thức" (thêm validation HTTP, đổi path, đổi status code...), còn
 * RetrievalService thay đổi vì lý do "nghiệp vụ RAG" - gộp chung sẽ làm
 * Controller phải sửa mỗi khi đổi logic AI.
 *
 * Được tầng nào gọi: Spring Security cho phép truy cập không cần token
 * (permitAll trong SecurityConfig, tạm thời tới Tuần 5).
 */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final RetrievalService retrievalService;

    public ChatController(RetrievalService retrievalService) {
        this.retrievalService = retrievalService;
    }

    /**
     * POST /api/chat/ask — nhận 1 câu hỏi, trả về câu trả lời + nguồn trích dẫn.
     *
     * Dùng ở đâu: gọi trực tiếp từ client (Postman, Frontend Tuần 6...).
     * Input:  ChatQuestionRequest {question} (JSON body)
     * Output: ChatAnswerResponse {answer, sources, distance} (JSON)
     *
     * Lưu ý: departmentId KHÔNG lấy từ request body (xem JavaDoc
     * ChatQuestionRequest) - tạm thời hard-code null (chỉ thấy tài liệu
     * dùng chung toàn công ty) cho tới khi có JWT thật ở Tuần 5.
     */
    @PostMapping("/ask")
    public ChatAnswerResponse ask(@RequestBody ChatQuestionRequest request) {
        // TODO SECURITY (Tuần 5): thay dòng dưới bằng lấy departmentId thật
        // từ JWT token của user đang đăng nhập (SecurityContextHolder), sau
        // khi JwtAuthenticationFilter đã parse và xác thực token. KHÔNG
        // được lấy departmentId từ request body - client có thể tự khai
        // sai để đọc tài liệu phòng ban khác.
        Integer departmentId = null;

        return retrievalService.ask(request.getQuestion(), departmentId);
    }
}

/*
 * ASCII Flow - toàn bộ Query Pipeline từ HTTP tới Answer:
 *
 *   Client gửi POST /api/chat/ask {"question": "..."}
 *           │
 *           ▼
 *   ChatController.ask(request)
 *           │  departmentId = null (TODO SECURITY, thay bằng JWT ở Tuần 5)
 *           ▼
 *   RetrievalService.ask(question, departmentId)   (xem Flow chi tiết
 *           │                                        trong RetrievalServiceImpl)
 *           ▼
 *   ChatAnswerResponse {answer, sources, distance}
 *           │
 *           ▼
 *   Spring tự serialize -> JSON -> trả về Client
 */
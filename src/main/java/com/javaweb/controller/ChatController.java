package com.javaweb.controller;

import com.javaweb.dto.chat.ChatAnswerResponse;
import com.javaweb.dto.chat.ChatQuestionRequest;
import com.javaweb.entity.ChatMessageEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.rag.retrieval.RetrievalService;
import com.javaweb.service.ChatMessageService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ChatController — cổng HTTP duy nhất cho Query Pipeline (RAG Core).
 *
 * File này có nhiệm vụ gì: nhận câu hỏi từ client qua HTTP, lưu lại lịch
 * sử hội thoại (Tuần 4), gọi RetrievalService xử lý, trả kết quả JSON -
 * KHÔNG chứa bất kỳ logic nghiệp vụ nào (không gọi trực tiếp
 * EmbeddingService, Repository, Gemini) - mọi logic lưu trữ đi qua
 * ChatMessageService.
 *
 * Tại sao cần tách biệt tuyệt đối với logic: Controller thay đổi vì lý do
 * "giao thức", còn ChatMessageService/RetrievalService thay đổi vì lý do
 * "nghiệp vụ" - gộp chung sẽ làm Controller phải sửa mỗi khi đổi logic.
 *
 * Được tầng nào gọi: Spring Security hiện đang permitAll cho /api/chat/**
 * (tạm thời tới Tuần 5) - NHƯNG method này vẫn bắt buộc có Bearer Token
 * hợp lệ để hoạt động đúng, vì cần authentication.getPrincipal() là
 * UsersEntity thật (không phải "anonymousUser") mới lưu được lịch sử
 * đúng chủ sở hữu.
 */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final RetrievalService retrievalService;
    private final ChatMessageService chatMessageService;

    public ChatController(RetrievalService retrievalService,
                           ChatMessageService chatMessageService) {
        this.retrievalService = retrievalService;
        this.chatMessageService = chatMessageService;
    }

    /**
     * POST /api/chat/ask — nhận 1 câu hỏi trong 1 session, lưu USER
     * message, gọi RetrievalService trả lời, lưu ASSISTANT message +
     * nguồn trích dẫn, rồi trả về câu trả lời + nguồn cho client.
     *
     * Dùng ở đâu: gọi trực tiếp từ client (Postman, Frontend) kèm header
     * "Authorization: Bearer {accessToken}".
     *
     * Input:
     *   - ChatQuestionRequest {sessionId, question} (JSON body)
     *   - Authentication (Spring tự inject từ SecurityContext)
     *
     * Output: ChatAnswerResponse {answer, sources, distance} (JSON)
     *
     * Lưu ý:
     *   - departmentId VẪN hard-code null (chưa đổi ở bước này - việc đó
     *     thuộc Bước 4 Security, đang tạm hoãn để làm Tuần 4 trước).
     *   - Nếu sessionId sai/không thuộc user -> ChatMessageService ném
     *     BadRequestException ngay ở saveUserMessage(), GlobalExceptionHandler
     *     bắt và trả lỗi rõ ràng cho client, KHÔNG gọi tới RetrievalService
     *     (tiết kiệm 1 lần gọi Gemini tốn phí nếu chắc chắn sẽ lỗi).
     *   - saveAssistantMessage() dùng lại session từ userMessage.getSessionId()
     *     thay vì query lại DB - session này đã được xác thực quyền sở
     *     hữu ngay phía trên trong cùng 1 request, không cần kiểm tra lại.
     */
    @PostMapping("/ask")
    public ChatAnswerResponse ask(@RequestBody ChatQuestionRequest request,
                                   Authentication authentication) {

        UsersEntity currentUser = (UsersEntity) authentication.getPrincipal();

        // Lưu USER message TRƯỚC khi gọi Retrieval - nếu Retrieval lỗi
        // (Gemini timeout, vector search lỗi...), câu hỏi của user vẫn
        // được ghi nhận trong lịch sử, không bị mất
        ChatMessageEntity userMessage = chatMessageService.saveUserMessage(
                request.getSessionId(), currentUser, request.getQuestion());

        // TODO SECURITY (Bước 4, tạm hoãn): thay null bằng departmentId
        // thật lấy từ currentUser.getDepartmentId().getId()
        Integer departmentId = null;

        ChatAnswerResponse answerResponse = retrievalService.ask(request.getQuestion(), departmentId);

        // Lưu ASSISTANT message + message_file_refs SAU KHI Retrieval
        // thành công. Dùng lại session từ userMessage (đã xác thực
        // quyền sở hữu ở bước trên), không cần validate lại lần nữa.
        chatMessageService.saveAssistantMessage(
                userMessage.getSessionId(), answerResponse.answer(), answerResponse.sources());

        return answerResponse;
    }
}

/*
 * ============================================================
 * FLOW — ChatController.ask()  (Bước 4.3 - đã thêm lưu ASSISTANT message)
 * ============================================================
 *
 *  Client gửi POST /api/chat/ask
 *  Header: Authorization: Bearer {accessToken}
 *  Body:   {"sessionId": 1, "question": "..."}
 *          │
 *          ▼
 *  JwtAuthenticationFilter xác thực token, set Authentication
 *          │
 *          ▼
 *  ChatController.ask(request, authentication)
 *          │  currentUser = (UsersEntity) authentication.getPrincipal()
 *          ▼
 *  chatMessageService.saveUserMessage(sessionId, currentUser, question)
 *          │  - validate session tồn tại + thuộc currentUser
 *          │  - lưu 1 dòng chat_message (role=USER)
 *          │  - lỗi -> BadRequestException, DỪNG ở đây, KHÔNG gọi Gemini
 *          ▼ (thành công) userMessage (có sessionId đã xác thực)
 *  retrievalService.ask(question, departmentId=null)
 *          │  (không đổi - vẫn chạy y hệt Tuần 3: embedding, vector
 *          │   search, prompt builder, Gemini chat)
 *          ▼
 *  ChatAnswerResponse {answer, sources, distance}
 *          │
 *          ▼
 *  chatMessageService.saveAssistantMessage(session, answer, sources)
 *          │  - lưu 1 dòng chat_message (role=ASSISTANT)
 *          │  - với mỗi source: fetch DocumentChunkEntity thật (lấy content),
 *          │    lưu 1 dòng message_file_refs trỏ đúng vào message ASSISTANT
 *          ▼
 *  Spring tự serialize answerResponse -> JSON -> trả về Client
 *
 * ============================================================
 */
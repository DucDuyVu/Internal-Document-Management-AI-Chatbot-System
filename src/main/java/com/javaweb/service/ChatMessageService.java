package com.javaweb.service;

import java.util.List;

import com.javaweb.dto.chat.ChatMessageHistoryResponse;
import com.javaweb.dto.chat.ChatMessageHistoryResponse;
import com.javaweb.dto.chat.SourceInfo;
import com.javaweb.entity.ChatMessageEntity;
import com.javaweb.entity.ChatSessionsEntity;
import com.javaweb.entity.UsersEntity;

/**
 * ChatMessageService — Interface xử lý nghiệp vụ lưu/đọc tin nhắn trong
 * 1 chat session.
 *
 * File này có nhiệm vụ gì: tách biệt logic "lưu tin nhắn" ra khỏi
 * RetrievalService (vốn chỉ lo phần AI: embedding, vector search, gọi
 * Gemini) và ra khỏi ChatController (vốn chỉ lo giao thức HTTP). Đây là
 * tầng nghiệp vụ đứng giữa, đúng theo kiến trúc đã thống nhất:
 * ChatController -> ChatMessageService -> RetrievalService -> Gemini.
 *
 * Tại sao cần tách interface: cho phép thay đổi cách implement (ví dụ
 * sau này thêm cache, thêm validate phức tạp hơn) mà không phải sửa
 * Controller.
 *
 * Được tầng nào gọi: ChatController.
 */
public interface ChatMessageService {

    /**
     * Xác thực sessionId thuộc đúng user đang đăng nhập, sau đó lưu 1
     * dòng chat_message với role = USER.
     *
     * Dùng ở đâu: ChatController.ask(), gọi TRƯỚC khi chuyển câu hỏi cho
     * RetrievalService xử lý.
     *
     * Input:
     *   - sessionId: ID phiên chat client gửi lên trong ChatQuestionRequest
     *   - currentUser: user đang đăng nhập (lấy từ SecurityContext ở Controller)
     *   - question: nội dung câu hỏi (dùng làm content của message)
     *
     * Output: ChatMessageEntity vừa lưu (đã có id, createdAt, và
     * sessionId trỏ tới ChatSessionsEntity đầy đủ) — trả về để Bước 4.3
     * lấy lại session từ đây, không cần query lại DB lần nữa.
     *
     * Lưu ý: nếu sessionId không tồn tại HOẶC không thuộc currentUser,
     * ném BadRequestException — KHÔNG được lưu message vào session của
     * người khác dù có tồn tại, đây là lỗ hổng bảo mật nếu bỏ qua.
     */
    ChatMessageEntity saveUserMessage(Long sessionId, UsersEntity currentUser, String question);

    /**
     * Lưu 1 dòng chat_message với role = ASSISTANT, đồng thời lưu kèm
     * danh sách nguồn trích dẫn vào bảng message_file_refs.
     *
     * Dùng ở đâu: ChatController.ask(), gọi SAU KHI RetrievalService.ask()
     * trả về answer + sources thành công.
     *
     * Input:
     *   - session: ChatSessionsEntity đã được xác thực sẵn ở
     *     saveUserMessage() (lấy lại từ userMessage.getSessionId()),
     *     KHÔNG validate lại quyền sở hữu ở đây — vì đã validate 1 lần
     *     rồi ở bước lưu USER message ngay trước đó trong cùng 1 request.
     *   - answer: nội dung câu trả lời từ Gemini
     *   - sources: danh sách SourceInfo (documentId, chunkId, distance)
     *     RetrievalService trả về — có thể là list rỗng nếu không tìm
     *     thấy tài liệu liên quan.
     *
     * Output: ChatMessageEntity vừa lưu (role=ASSISTANT, đã có id).
     *
     * Lưu ý: với MỖI phần tử trong sources, phải fetch
     * DocumentChunkEntity thật từ DB (không chỉ dùng id) để lấy được
     * content làm excerpt — SourceInfo không mang theo nội dung text.
     */
    ChatMessageEntity saveAssistantMessage(ChatSessionsEntity session, String answer, List<com.javaweb.dto.chat.SourceRefResponse> sources);

    /**
     * Lấy toàn bộ lịch sử tin nhắn của 1 session, kèm nguồn trích dẫn.
     *
     * Dùng ở đâu: ChatSessionController, handler của
     * GET /api/chat/sessions/{id}/messages — Bước 4.5.
     *
     * Input:
     *   - sessionId: id session cần xem lịch sử
     *   - currentUser: user đang đăng nhập, dùng để validate quyền sở hữu
     *
     * Output: danh sách ChatMessageHistoryResponse, sort theo thời gian
     * TĂNG dần (cũ → mới), mỗi tin ASSISTANT kèm sources tương ứng.
     *
     * Lưu ý: validate quyền giống hệt saveUserMessage() — session không
     * tồn tại hoặc không thuộc currentUser đều ném BadRequestException,
     * không được lộ lịch sử chat của người khác.
     */
    List<ChatMessageHistoryResponse> getMessageHistory(Long sessionId, UsersEntity currentUser);
}
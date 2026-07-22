package com.javaweb.service;

import java.util.List;

import com.javaweb.dto.chat.ChatSessionRequest;
import com.javaweb.dto.chat.ChatSessionResponse;
import com.javaweb.entity.UsersEntity;

public interface ChatSessionService {
    /**
     * Tạo chat session mới cho user đang đăng nhập.
     *
     * Được gọi từ: ChatSessionController, handler của POST /api/chat/sessions.
     * Input: request chứa title (nullable), currentUser đã xác thực từ SecurityContext.
     * Output: ChatSessionResponse chứa id, title, createdAt của session vừa tạo.
     */
    ChatSessionResponse createSession(ChatSessionRequest request, UsersEntity currentUser);

    /**
     * Lấy danh sách session của user đang đăng nhập, mới hoạt động nhất lên đầu.
     *
     * Được gọi từ: ChatSessionController, handler của GET /api/chat/sessions.
     * Input: currentUser đã xác thực từ SecurityContext.
     * Output: danh sách ChatSessionResponse, sort theo updatedAt giảm dần,
     *         không bao gồm session đã xóa mềm.
     */
    List<ChatSessionResponse> getSessions(UsersEntity currentUser);

    /**
     * Xóa mềm 1 chat session (set deleted_at, không xóa dòng thật khỏi DB).
     *
     * Được gọi từ: ChatSessionController, handler của
     * DELETE /api/chat/sessions/{id} — Bước 4.6.
     *
     * Input:
     *   - sessionId: id session cần xóa
     *   - currentUser: user đang đăng nhập, dùng để validate quyền sở hữu
     *
     * Output: không trả về gì (void) — Controller tự quyết định HTTP status.
     *
     * Lưu ý:
     *   - Session không tồn tại HOẶC không thuộc currentUser -> ném
     *     BadRequestException, giống hệt logic ở saveUserMessage()/getMessageHistory().
     *   - Session đã bị xóa mềm từ trước (deletedAt != null) -> cũng ném
     *     BadRequestException, tránh gọi xóa lặp lại gây hiểu nhầm trạng thái.
     *   - KHÔNG xóa cứng (DELETE FROM) vì chat_message.session_id tham
     *     chiếu tới chat_sessions.id mà không có ON DELETE CASCADE trong
     *     schema — xóa cứng sẽ vỡ ràng buộc khóa ngoại nếu session đã có
     *     tin nhắn.
     */
    void deleteSession(Long sessionId, UsersEntity currentUser);
}
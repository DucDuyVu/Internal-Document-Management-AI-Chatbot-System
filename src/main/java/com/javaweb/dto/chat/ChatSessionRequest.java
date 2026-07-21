package com.javaweb.dto.chat;

/**
 * ChatSessionRequest — DTO nhận dữ liệu từ client khi tạo chat session mới.
 *
 * Nhiệm vụ: Bọc dữ liệu đầu vào của POST /api/chat/sessions. Client có thể
 * truyền title tuỳ chọn; nếu không truyền, service sẽ tự đặt title mặc định.
 *
 * Tại sao cần: Tách biệt dữ liệu HTTP request ra khỏi entity — Controller
 * không nhận thẳng Entity từ client để tránh lộ cấu trúc DB và tránh
 * client tự ý set các field nhạy cảm như id, createdAt, userId.
 *
 * Được tầng nào gọi: ChatSessionController đọc từ @RequestBody.
 */
public class ChatSessionRequest {

    /**
     * Tiêu đề do user đặt cho session.
     * Nullable — nếu null, ChatSessionServiceImpl sẽ tự đặt "Cuộc trò chuyện mới".
     */
    private String title;

    // Constructor không tham số — bắt buộc để Jackson deserialize JSON → object
    public ChatSessionRequest() {
    }

    public ChatSessionRequest(String title) {
        this.title = title;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
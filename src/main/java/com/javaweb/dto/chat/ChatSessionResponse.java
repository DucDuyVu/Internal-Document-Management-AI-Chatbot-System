package com.javaweb.dto.chat;

import java.time.LocalDateTime;

/**
 * ChatSessionResponse — DTO trả về cho client sau khi tạo session thành công.
 *
* Nhiệm vụ: Chỉ lộ ra đúng 4 field client cần (id, title, createdAt, updatedAt).
 * Không trả Entity thẳng ra ngoài vì Entity còn chứa deletedAt, updatedAt,
 * userChatId, list messages — client không cần và không nên thấy.
 *
 * Tại sao cần: Nguyên tắc "chỉ trả ra những gì cần thiết" — giảm payload,
 * tránh lộ thông tin nội bộ, dễ thay đổi schema DB mà không ảnh hưởng API.
 *
 * Được tầng nào gọi: ChatSessionServiceImpl tạo ra, ChatSessionController
 * trả thẳng object này làm ResponseEntity body.
 */
public class ChatSessionResponse {

    /** ID của session vừa tạo — client dùng để gọi /api/chat/ask sau này. */
    private Long id;

    /** Tiêu đề session — do user đặt hoặc giá trị mặc định từ service. */
    private String title;

   /** Thời điểm tạo session — để frontend hiển thị lịch sử theo thứ tự. */
    private LocalDateTime createdAt;

    /**
     * Thời điểm session có hoạt động gần nhất (tin nhắn mới nhất được gửi/nhận).
     * Dùng để sort danh sách session ở GET /api/chat/sessions (Bước 4.4) —
     * session vừa chat xong phải nổi lên đầu, không phải session vừa tạo.
     */
    private LocalDateTime updatedAt;

    public ChatSessionResponse() {
    }

    public ChatSessionResponse(Long id, String title, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.title = title;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
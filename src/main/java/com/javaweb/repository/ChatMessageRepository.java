package com.javaweb.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.javaweb.entity.ChatMessageEntity;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {

    /**
     * Lấy toàn bộ tin nhắn của 1 session, sắp xếp theo thời gian xảy ra
     * (cũ → mới), để hiển thị lại hội thoại đúng thứ tự đã diễn ra.
     *
     * Dùng ở đâu: ChatMessageServiceImpl.getMessageHistory() — Bước 4.5.
     * Input: sessionId — id của session cần xem lịch sử.
     * Output: danh sách ChatMessageEntity, sort created_at TĂNG dần.
     * Lưu ý: ngược hướng sort với Bước 4.4 (giảm dần) — 4.4 là danh sách
     *        session (mới hoạt động lên đầu), còn đây là đọc lại 1 cuộc
     *        hội thoại nên phải đọc từ câu đầu tới câu cuối.
     */
    List<ChatMessageEntity> findBySessionId_IdOrderByCreatedAtAsc(Long sessionId);
    // Lấy danh sách tin nhắn của 1 user
    List<ChatMessageEntity> findBySessionId_UserChatId_Id(Long userId);
}

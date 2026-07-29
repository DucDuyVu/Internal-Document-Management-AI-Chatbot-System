package com.javaweb.dto.chat;

import java.time.LocalDateTime;
import java.util.List;

import com.javaweb.enums.ChatMessageRole;

/**
 * ChatMessageHistoryResponse — DTO đại diện cho 1 tin nhắn khi trả về
 * lịch sử hội thoại của 1 session (Bước 4.5).
 *
 * Nhiệm vụ: gói 1 dòng chat_message + toàn bộ message_file_refs liên
 * quan (nếu có) thành 1 object phẳng, dễ hiển thị lên UI theo dạng
 * "bong bóng chat".
 *
 * Được tầng nào gọi: ChatMessageServiceImpl.getMessageHistory() tạo ra,
 * ChatSessionController.getMessages() trả thẳng list này làm response body.
 *
 * @param id        id của chat_message
 * @param role      USER / ASSISTANT / SYSTEM — client dùng để canh trái/phải
 * @param content   nội dung tin nhắn
 * @param createdAt thời điểm gửi — dùng để hiển thị theo đúng thứ tự
 * @param sources   danh sách nguồn trích dẫn — RỖNG (không null) nếu là
 *                  tin nhắn USER hoặc ASSISTANT không có nguồn nào
 */
public record ChatMessageHistoryResponse(
        Long id,
        ChatMessageRole role,
        String content,
        LocalDateTime createdAt,
        List<SourceRefResponse> sources
) {
}
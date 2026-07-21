package com.javaweb.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.javaweb.entity.MessageFileRefsEntity;

public interface MessageFileRefsRepository extends JpaRepository<MessageFileRefsEntity, Long> {

    /**
     * Lấy toàn bộ nguồn trích dẫn của NHIỀU message cùng lúc bằng 1 query.
     *
     * Dùng ở đâu: ChatMessageServiceImpl.getMessageHistory() — Bước 4.5.
     * Input: danh sách id của tất cả chat_message trong 1 session.
     * Output: toàn bộ MessageFileRefsEntity thuộc các message đó.
     * Tại sao dùng IN thay vì lặp gọi findByMessageId từng message: nếu
     * session có 20 tin ASSISTANT, gọi lẻ sẽ ra 20 query riêng (N+1) —
     * gom 1 lần bằng IN chỉ tốn đúng 1 query bất kể hội thoại dài bao nhiêu.
     */
    List<MessageFileRefsEntity> findByMessageId_IdIn(List<Long> messageIds);
}
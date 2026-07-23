package com.javaweb.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.javaweb.entity.ChatSessionsEntity;

public interface ChatSessionsRepository extends JpaRepository<ChatSessionsEntity, Long> {

    /**
     * Lấy danh sách session của 1 user, bỏ qua session đã xóa mềm,
     * sắp xếp theo hoạt động gần nhất lên đầu.
     *
     * Dùng ở đâu: ChatSessionServiceImpl.getSessions() — Bước 4.4.
     * Input: userId — id của user đang đăng nhập (lấy từ SecurityContext).
     * Output: danh sách ChatSessionsEntity, sort updated_at giảm dần,
     *         không bao gồm session có deleted_at khác NULL.
     * Lưu ý: userChatId_Id "xuyên" qua quan hệ @ManyToOne tới UsersEntity —
     *        không viết trực tiếp findByUserIdAnd... vì field trong entity
     *        tên là "userChatId" (kiểu UsersEntity), không phải "userId".
     */
    List<ChatSessionsEntity> findByUserChatId_IdAndDeletedAtIsNullOrderByUpdatedAtDesc(Long userId);
}
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
}
package com.javaweb.service.impl;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.javaweb.dto.chat.ChatSessionRequest;
import com.javaweb.dto.chat.ChatSessionResponse;
import com.javaweb.entity.ChatSessionsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.exception.BadRequestException;
import com.javaweb.repository.ChatSessionsRepository;
import com.javaweb.service.ChatSessionService;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.javaweb.dto.chat.AdminChatSessionResponse;
import java.time.LocalDateTime;

import com.javaweb.dto.chat.ChatSessionResponse;
import com.javaweb.entity.ChatSessionsEntity;
/**
 * ChatSessionServiceImpl — Triển khai ChatSessionService, chứa toàn bộ
 * business logic liên quan đến quản lý chat session.
 *
 * Nhiệm vụ: Nhận UsersEntity (đã được Controller lấy sẵn từ SecurityContext),
 * tạo ChatSessionsEntity mới, lưu vào bảng chat_sessions, map sang
 * ChatSessionResponse trả về Controller.
 *
 * Tại sao đổi từ nhận "email" sang nhận thẳng "UsersEntity": trước đây
 * Service tự query lại UsersRepository.findByEmail() — thừa 1 lần query
 * vì JwtAuthenticationFilter đã query UsersEntity đầy đủ ngay trong lúc
 * xác thực token rồi. Controller chỉ cần lấy lại object đó, không cần
 * Service query DB thêm lần nữa.
 *
 * Được tầng nào gọi: ChatSessionController.
 */
@Service
public class ChatSessionServiceImpl implements ChatSessionService {

    private final ChatSessionsRepository chatSessionsRepository;

    public ChatSessionServiceImpl(ChatSessionsRepository chatSessionsRepository) {
        this.chatSessionsRepository = chatSessionsRepository;
    }

    /**
     * Tạo chat session mới, gán cho user được truyền vào.
     *
     * Được gọi từ: ChatSessionController.createSession().
     * Input: request.title (nullable), currentUser (đã xác thực, không null).
* Output: ChatSessionResponse(id, title, createdAt, updatedAt).
     * Lưu ý: KHÔNG cần orElseThrow/query DB nữa — currentUser chắc chắn
     *         tồn tại vì đã đi qua JwtAuthenticationFilter thành công.
     */
    @Override
    public ChatSessionResponse createSession(ChatSessionRequest request, UsersEntity currentUser) {

        ChatSessionsEntity session = new ChatSessionsEntity();

        String resolvedTitle = (request.getTitle() != null && !request.getTitle().isBlank())
                ? request.getTitle()
                : "Cuộc trò chuyện mới";

        session.setTitle(resolvedTitle);
        session.setUserChatId(currentUser);
        session.setCreatedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());

        ChatSessionsEntity saved = chatSessionsRepository.save(session);

        return new ChatSessionResponse(
                saved.getId(),
                saved.getTitle(),
                saved.getCreatedAt(),
                saved.getUpdatedAt()
        );
    }
    /**
     * Xem JavaDoc ở ChatSessionService.getSessions().
     *
     * Tại sao map thủ công từng entity sang DTO ở đây (không dùng
     * ModelMapper dù project có cấu hình sẵn ModelMapperConfig): entity
     * có nhiều field nhạy cảm/không cần thiết (userChatId, deletedAt,
     * chatMessageEntities — có thể kéo theo lazy-loading N+1 nếu map tự
     * động đụng vào field quan hệ). Map tay 4 field cần thiết vừa rõ ràng
     * vừa tránh rủi ro đó.
     */
    @Override
    public List<ChatSessionResponse> getSessions(UsersEntity currentUser) {

        List<ChatSessionsEntity> sessions = chatSessionsRepository
                .findByUserChatId_IdAndDeletedAtIsNullOrderByUpdatedAtDesc(currentUser.getId());

        return sessions.stream()
                .map(session -> new ChatSessionResponse(
                        session.getId(),
                        session.getTitle(),
                        session.getCreatedAt(),
                        session.getUpdatedAt()
                ))
                .collect(Collectors.toList());
    }

    /**
     * Xem JavaDoc ở ChatSessionService.deleteSession().
     *
     * Tại sao dùng chung message lỗi cho "không tồn tại" và "không thuộc
     * currentUser": tránh lộ thông tin cho kẻ tấn công dò sessionId - nếu
     * trả 2 message khác nhau ("không tồn tại" vs "không có quyền"), họ
     * có thể suy ra được sessionId nào tồn tại nhưng thuộc người khác,
     * dù không đọc được nội dung. Đây là nguyên tắc bảo mật đã áp dụng
     * nhất quán từ saveUserMessage() và getMessageHistory().
     */
    @Override
    public void deleteSession(Long sessionId, UsersEntity currentUser) {

        ChatSessionsEntity session = chatSessionsRepository.findById(sessionId)
                .orElseThrow(() -> new BadRequestException(
                        "Chat session không tồn tại hoặc bạn không có quyền truy cập"));

        if (!session.getUserChatId().getId().equals(currentUser.getId())) {
            throw new BadRequestException(
                    "Chat session không tồn tại hoặc bạn không có quyền truy cập");
        }

        // Chặn xóa lặp lại - nếu đã xóa mềm từ trước, báo lỗi rõ ràng thay
        // vì âm thầm ghi đè deleted_at bằng thời điểm mới, để client biết
        // chính xác đây không phải lần xóa đầu tiên
        if (session.getDeletedAt() != null) {
            throw new BadRequestException("Chat session này đã bị xóa trước đó");
        }

        session.setDeletedAt(LocalDateTime.now());
        chatSessionsRepository.save(session);
    }

    @Override
    public ChatSessionResponse renameSession(Long sessionId, ChatSessionRequest request, UsersEntity currentUser) {

        ChatSessionsEntity session = chatSessionsRepository.findById(sessionId)
                .orElseThrow(() -> new BadRequestException(
                        "Chat session không tồn tại hoặc bạn không có quyền truy cập"));

        if (!session.getUserChatId().getId().equals(currentUser.getId())) {
            throw new BadRequestException(
                    "Chat session không tồn tại hoặc bạn không có quyền truy cập");
        }

        if (session.getDeletedAt() != null) {
            throw new BadRequestException("Chat session này đã bị xóa trước đó");
        }
String title = (newTitle == null || newTitle.trim().isEmpty())
        ? "Cuộc trò chuyện mới"
        : newTitle.trim();

session.setTitle(title);
session.setUpdatedAt(LocalDateTime.now());

ChatSessionsEntity saved = chatSessionsRepository.save(session);
return mapToResponse(saved);
}

private ChatSessionResponse mapToResponse(ChatSessionsEntity entity) {
    return new ChatSessionResponse(
            entity.getId(),
            entity.getTitle(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
    );
}

@Override
public Page<AdminChatSessionResponse> getAllSessionsForAdmin(Pageable pageable) {
    return chatSessionsRepository.findAll(pageable).map(session -> {

        AdminChatSessionResponse response = new AdminChatSessionResponse();

        response.setId(session.getId());
        response.setTitle(session.getTitle());
        response.setCreatedAt(session.getCreatedAt());
        response.setUpdatedAt(session.getUpdatedAt());

        if (session.getUserChatId() != null) {
            response.setUserName(
                    session.getUserChatId().getFullName() != null
                            ? session.getUserChatId().getFullName()
                            : session.getUserChatId().getUserName()
            );
        }

        if (session.getChatMessageEntities() != null) {
            response.setMessageCount(
                    (long) session.getChatMessageEntities().size()
            );
        } else {
            response.setMessageCount(0L);
        }

        return response;
    });
}

}

/*
 * ============================================================
 * FLOW — ChatSessionServiceImpl.createSession()  (đã sửa)
 * ============================================================
 *
 *  Controller
 *      │  ChatSessionRequest (title nullable)
 *      │  UsersEntity currentUser (đã xác thực sẵn, không query lại)
 *      ▼
 *  Xây ChatSessionsEntity
 *      │  title = request.title ?: "Cuộc trò chuyện mới"
 *      │  userChatId = currentUser
 *      │  createdAt = updatedAt = now()
 *      ▼
 *  chatSessionsRepository.save(session)
 *      │
 *      ▼ ChatSessionsEntity (có id)
* Output: ChatSessionResponse(id, title, createdAt, updatedAt). *      │
 *      ▼
 *  Controller → HTTP 201
 *
 * ============================================================
 * 
 * 
 * 
 * 
 * ============================================================
 FLOW — ChatSessionServiceImpl.getSessions()  (Bước 4.4)
 ============================================================

  Controller
      │  UsersEntity currentUser (đã xác thực từ SecurityContext)
      ▼
  chatSessionsRepository.findByUserChatId_IdAndDeletedAtIsNullOrderByUpdatedAtDesc(userId)
      │  SELECT * FROM chat_sessions
      │  WHERE user_id = ? AND deleted_at IS NULL
      │  ORDER BY updated_at DESC
      ▼ List<ChatSessionsEntity>
  map từng phần tử → ChatSessionResponse(id, title, createdAt, updatedAt)
      ▼
  Controller → HTTP 200 + JSON array
 ============================================================
 */
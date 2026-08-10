package com.javaweb.service.impl;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.javaweb.dto.chat.SourceInfo;
import com.javaweb.entity.ChatMessageEntity;
import com.javaweb.entity.ChatSessionsEntity;
import com.javaweb.entity.DocumentChunkEntity;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.MessageFileRefsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.enums.ChatMessageRole;
import com.javaweb.exception.BadRequestException;
import com.javaweb.repository.ChatMessageRepository;
import com.javaweb.repository.ChatSessionsRepository;
import com.javaweb.repository.DocumentChunkRepository;
import com.javaweb.repository.DocumentRepository;
import com.javaweb.repository.MessageFileRefsRepository;
import com.javaweb.service.ChatMessageService;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.javaweb.dto.chat.ChatMessageHistoryResponse;
import com.javaweb.dto.chat.SourceRefResponse;

/**
 * ChatMessageServiceImpl — Triển khai ChatMessageService.
 *
 * Nhiệm vụ: kiểm tra quyền sở hữu session, lưu tin nhắn USER/ASSISTANT
 * vào bảng chat_message, lưu nguồn trích dẫn vào message_file_refs.
 *
 * Được tầng nào gọi: ChatController.
 */
@Service
public class ChatMessageServiceImpl implements ChatMessageService {

    // Giới hạn độ dài excerpt lưu vào DB - cho phép hiển thị thẻ trích dẫn ngắn gọn (NotebookLM style)
    private static final int EXCERPT_MAX_LENGTH = 150;

    private final ChatMessageRepository chatMessageRepository;
    private final ChatSessionsRepository chatSessionsRepository;
    private final MessageFileRefsRepository messageFileRefsRepository;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;

    public ChatMessageServiceImpl(ChatMessageRepository chatMessageRepository,
                                   ChatSessionsRepository chatSessionsRepository,
                                   MessageFileRefsRepository messageFileRefsRepository,
                                   DocumentRepository documentRepository,
                                   DocumentChunkRepository documentChunkRepository) {
        this.chatMessageRepository = chatMessageRepository;
        this.chatSessionsRepository = chatSessionsRepository;
        this.messageFileRefsRepository = messageFileRefsRepository;
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
    }

    /**
     * Xem JavaDoc ở ChatMessageService.saveUserMessage().
     *
     * Lưu ý quan trọng: bước kiểm tra quyền sở hữu (so sánh
     * session.getUserChatId().getId() với currentUser.getId()) là điểm
     * bảo mật cốt lõi của method này — thiếu bước này, user A có thể gửi
     * sessionId của user B (đoán số ID) và ghi tin nhắn vào lịch sử
     * người khác.
     */
    @Override
    public ChatMessageEntity saveUserMessage(Long sessionId, UsersEntity currentUser, String question) {

        // Tìm session theo ID - nếu không tồn tại, orElseThrow báo lỗi
        // rõ ràng thay vì để NullPointerException mơ hồ ở dòng sau
        ChatSessionsEntity session = chatSessionsRepository.findById(sessionId)
                .orElseThrow(() -> new BadRequestException(
                        "Chat session không tồn tại hoặc bạn không có quyền truy cập"));

        // So sánh chủ sở hữu session với user đang gửi request - đây là
        // ranh giới bảo mật, KHÔNG được bỏ qua dù sessionId hợp lệ
        if (!session.getUserChatId().getId().equals(currentUser.getId())) {
            throw new BadRequestException(
                    "Chat session không tồn tại hoặc bạn không có quyền truy cập");
        }

        ChatMessageEntity message = new ChatMessageEntity();
        message.setSessionId(session);
        message.setRole(ChatMessageRole.USER);
        message.setContent(question);
        message.setCreatedAt(LocalDateTime.now());

       ChatMessageEntity savedMessage = chatMessageRepository.save(message);

        // User vừa gửi câu hỏi mới -> session đang "hoạt động", đôn updated_at
        // lên ngay, không chờ tới khi có câu trả lời ASSISTANT
        touchSessionActivity(session);

        return savedMessage;
    }

    /**
     * Xem JavaDoc ở ChatMessageService.saveAssistantMessage().
     *
     * Tại sao KHÔNG validate lại quyền sở hữu session ở đây: method này
     * luôn được gọi ngay sau saveUserMessage() trong cùng 1 request HTTP
     * (xem ChatController.ask()) — session truyền vào đã được xác thực
     * ở bước đó rồi. Validate lại lần nữa là dư thừa, không tăng thêm an
     * toàn vì không có cơ hội nào để session đổi chủ giữa 2 lời gọi.
     */
    @Override
    public ChatMessageEntity saveAssistantMessage(ChatSessionsEntity session, String answer,
                                                   List<com.javaweb.dto.chat.SourceRefResponse> sources) {

        ChatMessageEntity message = new ChatMessageEntity();
        message.setSessionId(session);
        message.setRole(ChatMessageRole.ASSISTANT);
        message.setContent(answer);
        message.setCreatedAt(LocalDateTime.now());
        // tokenCount để null ở bước này - RetrievalService/GeminiChatService
        // hiện chưa trả usage token về ChatAnswerResponse, nên chưa có số
        // liệu thật để lưu. Bổ sung sau nếu cần thống kê chi phí.

        ChatMessageEntity savedMessage = chatMessageRepository.save(message);

        // Với mỗi nguồn trích dẫn, lưu 1 dòng message_file_refs trỏ về
        // đúng dòng ASSISTANT vừa tạo ở trên (KHÔNG phải dòng USER)
        for (com.javaweb.dto.chat.SourceRefResponse source : sources) {

            // Phải findById thật (không dùng getReferenceById) vì cần
            // đọc content thật để cắt excerpt - getReferenceById chỉ tạo
            // proxy rỗng, gọi getContent() trên đó vẫn sẽ trigger 1 query
            // riêng lẻ (N+1), nên tra thẳng 1 lần bằng findById cho rõ ràng
            DocumentChunkEntity chunk = documentChunkRepository.findById(source.chunkId())
                    .orElseThrow(() -> new BadRequestException(
                            "Document chunk không tồn tại: id=" + source.chunkId()));

            // documentId dùng getReferenceById - chỉ cần proxy để set FK,
            // không cần đọc field nào của DocumentEntity ở đây nên tránh
            // query thừa
            DocumentEntity documentRef = documentRepository.getReferenceById(source.documentId());

            MessageFileRefsEntity ref = new MessageFileRefsEntity();
            ref.setMessageId(savedMessage);
            ref.setDocumentId(documentRef);
            ref.setChunkId(chunk);
            ref.setExcerpt(buildExcerpt(chunk.getContent()));
            ref.setCreatedAt(LocalDateTime.now());

            messageFileRefsRepository.save(ref);
        }
        // Bot vừa trả lời xong -> đôn updated_at lần nữa (thời điểm mới nhất
        // của session chính là lúc có phản hồi, không phải lúc user hỏi)
        touchSessionActivity(session);

        return savedMessage;
    }
    

    

    /**
     * Cắt content chunk về độ dài tối đa EXCERPT_MAX_LENGTH (150 ký tự), cắt an toàn ở khoảng trắng.
     *
     * Dùng ở đâu: saveAssistantMessage(), ngay trước khi set vào
     * MessageFileRefsEntity.excerpt.
     * Input: content thật của chunk (có thể dài hàng nghìn ký tự).
     * Output: chuỗi đã cắt, thêm "..." nếu bị cắt bớt.
     */
    private String buildExcerpt(String content) {
        if (content == null || content.length() <= EXCERPT_MAX_LENGTH) {
            return content;
        }
        int cutIdx = EXCERPT_MAX_LENGTH;
        while (cutIdx < content.length() && !Character.isWhitespace(content.charAt(cutIdx))) {
            cutIdx++;
        }
        return content.substring(0, Math.min(cutIdx, content.length())) + "...";
    }

    /**
     * Xem JavaDoc ở ChatMessageService.getMessageHistory().
     *
     * Tại sao gom refs và document thành Map trước khi map message: để
     * tránh N+1 — nếu tra cứu trực tiếp bằng repository bên trong vòng
     * lặp for từng message, mỗi lần lặp sẽ bắn 1 query riêng. Gom hết
     * dữ liệu cần dùng thành Map NGAY TỪ ĐẦU (2 query cố định, không phụ
     * thuộc số lượng tin nhắn), sau đó vòng lặp chỉ đọc từ Map trong
     * bộ nhớ — không chạm DB thêm lần nào nữa.
     */
    @Override
    public List<ChatMessageHistoryResponse> getMessageHistory(Long sessionId, UsersEntity currentUser) {

        // Bước 1: validate quyền sở hữu - giống hệt logic ở saveUserMessage(),
        // không được để lộ lịch sử chat của session người khác
        ChatSessionsEntity session = chatSessionsRepository.findById(sessionId)
                .orElseThrow(() -> new BadRequestException(
                        "Chat session không tồn tại hoặc bạn không có quyền truy cập"));

        if (!session.getUserChatId().getId().equals(currentUser.getId())) {
            throw new BadRequestException(
                    "Chat session không tồn tại hoặc bạn không có quyền truy cập");
        }

        // Bước 2: lấy toàn bộ tin nhắn, cũ -> mới
        List<ChatMessageEntity> messages =
                chatMessageRepository.findBySessionId_IdOrderByCreatedAtAsc(sessionId);

        if (messages.isEmpty()) {
            return List.of();
        }

        // Bước 3: gom hết message_file_refs của TOÀN BỘ message trong 1 query,
        // rồi nhóm lại theo messageId để tra cứu O(1) ở vòng lặp cuối
        List<Long> messageIds = messages.stream()
                .map(ChatMessageEntity::getId)
                .collect(Collectors.toList());

        List<MessageFileRefsEntity> allRefs =
                messageFileRefsRepository.findByMessageId_IdIn(messageIds);

        Map<Long, List<MessageFileRefsEntity>> refsByMessageId = allRefs.stream()
                .collect(Collectors.groupingBy(ref -> ref.getMessageId().getId()));

        // Bước 4: gom tên file - lấy 1 lần cho TẤT CẢ documentId xuất hiện
        // trong refs (loại trùng bằng Set), tránh gọi findById lẻ từng cái
        Set<Long> documentIds = allRefs.stream()
                .map(ref -> ref.getDocumentId().getId())
                .collect(Collectors.toSet());

        Map<Long, String> fileNameByDocumentId = documentRepository.findAllById(documentIds).stream()
                .collect(Collectors.toMap(DocumentEntity::getId, DocumentEntity::getFileName));

        // Bước 5: ghép message + sources tương ứng thành DTO trả về
        return messages.stream()
                .map(message -> {
                    List<MessageFileRefsEntity> refs =
                            refsByMessageId.getOrDefault(message.getId(), List.of());

                    List<SourceRefResponse> sources = refs.stream()
                            .map(ref -> new SourceRefResponse(
                                    ref.getDocumentId().getId(),
                                    fileNameByDocumentId.get(ref.getDocumentId().getId()),
                                    ref.getChunkId().getId(),
                                    ref.getExcerpt()
                            ))
                            .collect(Collectors.toList());

                    return new ChatMessageHistoryResponse(
                            message.getId(),
                            message.getRole(),
                            message.getContent(),
                            message.getCreatedAt(),
                            sources
                    );
                })
                .collect(Collectors.toList());
    }
        /**
     * Đôn "updated_at" của session lên thời điểm hiện tại.
     *
     * Dùng ở đâu: gọi ở cuối saveUserMessage() và saveAssistantMessage(),
     * ngay sau khi chat_message đã được lưu thành công.
     * Input: session — entity đã được fetch/validate từ trước (không fetch lại).
     * Output: không trả về gì, chỉ ghi xuống DB.
     * Lưu ý: PHẢI gọi ở cả 2 method (không chỉ ASSISTANT), vì "session còn
     * hoạt động" được tính từ khi USER gửi câu hỏi, không phải chỉ khi bot
     * trả lời xong — nếu Gemini lỗi giữa chừng, session vẫn nên nổi lên
     * đầu danh sách vì user vừa tương tác.
     *
     * Tại sao không dùng @UpdateTimestamp trên ChatSessionsEntity: Hibernate
     * chỉ tự set lại updated_at khi CHÍNH entity ChatSessionsEntity bị thay
     * đổi và save — insert một ChatMessageEntity (bảng khác) không kích
     * hoạt cơ chế đó, nên bắt buộc phải chủ động gọi save() ở đây.
     */
    private void touchSessionActivity(ChatSessionsEntity session) {
        session.setUpdatedAt(LocalDateTime.now());
        chatSessionsRepository.save(session);
    }
}


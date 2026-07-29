package com.javaweb.dto.chat;

/**
 * ChatQuestionRequest — DTO nhận request body của POST /api/chat/ask.
 *
 * File này có nhiệm vụ gì: đóng gói dữ liệu client gửi lên khi hỏi 1 câu
 * hỏi trong 1 phiên chat cụ thể - gồm sessionId (phiên nào) và question
 * (nội dung hỏi).
 *
 * Tại sao CHỈ có "question" + "sessionId", KHÔNG có "departmentId": phân
 * quyền không bao giờ được lấy từ dữ liệu client tự khai báo trong request
 * body - client có thể tự sửa số này để đọc tài liệu phòng ban khác.
 * departmentId thật sẽ được lấy từ JWT token ở tầng Controller, hoàn toàn
 * không đi qua DTO này.
 *
 * Tại sao thêm sessionId (Tuần 4 - Chat Management): mỗi câu hỏi giờ phải
 * thuộc về 1 phiên hội thoại cụ thể để lưu lịch sử (chat_message,
 * message_file_refs) - không có sessionId thì không biết lưu vào đâu.
 *
 * Tại sao dùng class + setter thay vì record: đây là DTO ĐI VÀO, Jackson
 * deserialize JSON -> object bằng cách tạo object rỗng rồi gọi setter.
 *
 * Được tầng nào gọi: Spring tự tạo object này từ JSON body khi
 * ChatController.ask() nhận @RequestBody.
 */
public class ChatQuestionRequest {

    private String question;

    /**
     * ID của chat session mà câu hỏi này thuộc về.
     *
     * Dùng ở đâu: ChatController.ask() dùng giá trị này để gọi
     * ChatMessageService.saveUserMessage(), xác thực session có tồn tại
     * và thuộc đúng user đang đăng nhập trước khi lưu tin nhắn.
     *
     * Lưu ý: client PHẢI tạo session trước (POST /api/chat/sessions) rồi
     * mới gửi sessionId vào đây - không tự sinh session ngầm ở bước này,
     * để tránh tạo rác session mỗi lần hỏi nhầm.
     */
    private Long sessionId;

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }
}
package com.javaweb.dto.chat;

/**
 * ChatQuestionRequest — DTO nhận request body của POST /api/chat/ask.
 *
 * Tại sao CHỈ có "question", KHÔNG có "departmentId": phân quyền không
 * bao giờ được lấy từ dữ liệu client tự khai báo trong request body -
 * client có thể tự sửa số này để đọc tài liệu phòng ban khác. departmentId
 * thật sẽ được lấy từ JWT token ở tầng Controller (xem TODO SECURITY
 * trong ChatController.ask()), hoàn toàn không đi qua DTO này. Nhờ vậy,
 * API contract (cấu trúc JSON request) sẽ KHÔNG cần đổi khi Tuần 5 gắn
 * JWT thật — chỉ đổi nguồn lấy departmentId bên trong Controller.
 *
 * Tại sao dùng class + setter thay vì record: đây là DTO ĐI VÀO, Jackson
 * deserialize JSON -> object bằng cách tạo object rỗng rồi gọi setter -
 * giữ nhất quán với GeminiChatResponse (DTO đi vào từ Gemini).
 *
 * Được tầng nào gọi: Spring tự tạo object này từ JSON body khi
 * ChatController.ask() nhận @RequestBody.
 */
public class ChatQuestionRequest {

    private String question;

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }
}
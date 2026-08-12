package com.javaweb.dto.chat;

import java.util.List;

/**
 * ChatAnswerResponse — DTO trả về từ RetrievalService.ask(), là dữ liệu
 * cuối cùng ChatController gửi cho client dưới dạng JSON.
 *
 * Tại sao dùng record: dữ liệu chỉ đọc, không ai được sửa sau khi tạo ra
 * (giống lý do đã dùng cho SearchResult) - answer/sources/distance chỉ có
 * ý nghĩa đúng tại đúng 1 thời điểm trả lời, không nên bị mutate về sau.
 *
 * Được tầng nào gọi: RetrievalServiceImpl.ask() tạo ra, ChatController trả
 * thẳng object này làm response body (Spring tự serialize sang JSON).
 *
 * @param answer   câu trả lời từ Gemini, hoặc message cố định nếu không tìm
 *                 thấy thông tin liên quan
 * @param sources  danh sách nguồn tài liệu đã dùng làm ngữ cảnh; rỗng nếu
 *                 answer là message "không tìm thấy thông tin"
 * @param distance cosine distance của chunk liên quan nhất (0 = giống hệt
 *                 câu hỏi, càng LỚN càng ít liên quan). Đặt tên "distance"
 *                 thay vì "score" CỐ Ý — "score" dễ gây hiểu lầm "càng cao
 *                 càng tốt", trong khi thực tế ở đây NHỎ mới là tốt. 0.0
 *                 nếu không có nguồn nào (trường hợp "không tìm thấy").
 */
public record ChatAnswerResponse(String answer, List<SourceRefResponse> sources, double distance) {
}
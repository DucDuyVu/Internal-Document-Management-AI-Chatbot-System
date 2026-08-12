package com.javaweb.dto.chat;

/**
 * SourceRefResponse — DTO đại diện cho 1 nguồn trích dẫn khi hiển thị
 * LẠI lịch sử hội thoại (khác SourceInfo — SourceInfo dùng cho câu trả
 * lời MỚI vừa sinh ra, chưa có excerpt/fileName; còn cái này dùng khi
 * đọc lại message_file_refs đã lưu trong DB, đã có đủ excerpt + fileName).
 *
 * Được tầng nào gọi: ChatMessageServiceImpl.getMessageHistory(), map từ
 * MessageFileRefsEntity + DocumentEntity (join 2 bảng, xem JavaDoc của
 * getMessageHistory() để biết lý do phải join cả 2).
 *
 * @param documentId id tài liệu gốc (document.id)
 * @param fileName   tên file gốc — để client hiển thị "trích từ file X"
 * @param chunkId    id đoạn văn bản cụ thể (document_chunks.id)
 * @param excerpt    đoạn trích đã cắt sẵn (đã lưu trong message_file_refs,
 *                   không cắt lại ở đây)
 */
public record SourceRefResponse(Long documentId, String fileName, Long chunkId, String excerpt, Integer pageNumber) {
}
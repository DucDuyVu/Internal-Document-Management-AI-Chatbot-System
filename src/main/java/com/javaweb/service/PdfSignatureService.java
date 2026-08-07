package com.javaweb.service;

import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.UsersEntity;

public interface PdfSignatureService {
    /**
     * Chèn chữ ký (ảnh) vào tài liệu PDF và lưu đè lên storage.
     * @param document Tài liệu cần ký
     * @param manager Người phê duyệt (có chứa signatureUrl)
     * @param x Tọa độ X (tuỳ chọn, nếu null sẽ ký mặc định ở trang cuối)
     * @param y Tọa độ Y (tuỳ chọn)
     * @param pageNumber Số trang (tuỳ chọn, 1-indexed)
     * @return true nếu ký thành công, ngược lại ném ra exception
     */
    boolean signDocument(DocumentEntity document, UsersEntity manager, Float x, Float y, Integer pageNumber) throws Exception;
}

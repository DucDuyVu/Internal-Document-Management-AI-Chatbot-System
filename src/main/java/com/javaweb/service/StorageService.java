package com.javaweb.service;

import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

public interface StorageService {
    /**
     * Tải lên một file mới từ người dùng (MultipartFile).
     * Phương thức này tự động tạo ra một tên file duy nhất (UUID + original name)
     * để tránh trùng lặp, sau đó lưu lên MinIO/S3 và trả về tên file đã lưu.
     */
    String uploadFile(MultipartFile file) throws IOException;

    InputStream downloadFile(String fileName);

    /**
     * Ghi đè nội dung mới lên một file đã tồn tại trên MinIO/S3 theo đúng tên (key) của file gốc.
     * Khác với uploadFile(MultipartFile), phương thức này không sinh thêm UUID mà sử dụng đúng fileName
     * được truyền vào, giúp ghi đè chính xác lên file cũ.
     * Dùng sau khi xử lý nội dung file ngầm (VD: Đóng dấu chữ ký PDF, resize ảnh, mã hoá, v.v.)
     */
    String overwriteFile(String fileName, byte[] content, String contentType) throws IOException;
}

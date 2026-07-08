package com.javaweb.dto.document;

/**
 * DTO nhận metadata đi kèm khi client upload file PDF.
 *
 * Nhiệm vụ: gói các trường "phụ" (không phải file nhị phân) mà frontend gửi lên
 * cùng lúc với file, ví dụ tên hiển thị hoặc phòng ban sở hữu tài liệu.
 *
 * Tại sao cần: Controller không nên nhận trực tiếp từng @RequestParam rời rạc
 * khi số lượng field tăng lên (title, departmentId, ...). Gói vào 1 object giúp
 * dễ validate, dễ mở rộng, và tách rõ "dữ liệu vào" khỏi "entity lưu DB".
 *
 * Được gọi bởi: DocumentController (tầng Controller) -> truyền xuống
 * DocumentService.uploadDocument().
 *
 * Lưu ý: Class này KHÔNG chứa file nhị phân. File thật đi qua MultipartFile
 * riêng trong Controller, không nhét vào DTO.
 */
public class DocumentUploadRequest {

    /**
     * Tên hiển thị của tài liệu.
     * Dùng ở: DocumentServiceImpl.uploadDocument() để set Document.title
     * nếu người dùng không nhập thì service sẽ tự lấy tên file gốc thay thế.
     * Có thể null.
     */
    private String title;

    /**
     * ID phòng ban sở hữu tài liệu.
     * Dùng ở: DocumentServiceImpl.uploadDocument() -> set Document.departmentId.
     * Null nghĩa là tài liệu dùng chung toàn công ty (theo comment trong
     * Document.java entity: "NULL = tài liệu dùng chung toàn công ty").
     * Việc validate departmentId có tồn tại hay không thuộc phạm vi của
     * Member A (Department management), Kim không cần xử lý ở đây.
     */
    private Integer departmentId;

    public DocumentUploadRequest() {
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Integer getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(Integer departmentId) {
        this.departmentId = departmentId;
    }
}


/*Frontend (multipart/form-data)
    ↓
   file            title, departmentId (form fields)
    ↓                        ↓
MultipartFile          DocumentUploadRequest
    │                        │
    └───────────┬────────────┘
                 ↓
   DocumentController.upload(file, request)
                 ↓
   DocumentService.uploadDocument(file, request)
    */
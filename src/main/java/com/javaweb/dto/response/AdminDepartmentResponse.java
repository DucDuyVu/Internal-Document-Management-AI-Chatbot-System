package com.javaweb.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data  // Tự sinh getter, setter, toString(), equals(), hashCode()
@NoArgsConstructor  // Tạo constructor không tham số
@AllArgsConstructor // Tạo constructor với tất cả thuộc tính
@Builder
public class AdminDepartmentResponse {
    private Long id;
    private String name;
    private String description;
    private long userCount;
    private LocalDateTime createAt;
    private LocalDateTime updateAt;
}

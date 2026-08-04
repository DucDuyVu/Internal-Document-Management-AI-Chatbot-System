package com.javaweb.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentPermissionResponse {
    private Long id;
    private Long documentId;
    private String documentTitle;
    private Long departmentId;
    private String departmentName;
    private String grantedByName;
    private LocalDateTime createdAt;
    private String role;
    private Boolean isPublicLink;
}

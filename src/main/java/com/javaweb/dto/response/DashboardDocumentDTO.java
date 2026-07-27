package com.javaweb.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class DashboardDocumentDTO {
    private Long id;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String departmentName;
    private String status;
    private LocalDateTime createdAt;
}

package com.javaweb.dto.response.search;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiSearchDto {
    @Builder.Default
    private String type = "document";
    private Long documentId;
    private String fileName;
    private String fileType;
    private String departmentName;
    private String createdAt;
    private String excerpt;
    private double score;
    private int pageNumber;
}

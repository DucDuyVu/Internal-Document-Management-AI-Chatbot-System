package com.javaweb.dto.response.search;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchDocumentDto {
    private Long id;
    private String title;
    private String meta; // e.g. "Kế toán • 2MB"
    private String icon; // e.g. "fa-file-pdf"
    private String color; // e.g. "#e11d48"
    private String bg; // e.g. "#ffe4e6"
}

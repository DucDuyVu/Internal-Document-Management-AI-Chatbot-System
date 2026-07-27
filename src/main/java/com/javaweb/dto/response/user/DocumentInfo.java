package com.javaweb.dto.response.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentInfo {
    private Long id;
    private String fileName;
    private String timeAgo; // e.g., "Hôm nay", "Hôm qua", or formatted date
}

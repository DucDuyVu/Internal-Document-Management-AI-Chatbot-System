package com.javaweb.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class DashboardActivityDTO {
    private Long id;
    private String action;
    private String targetType;
    private Long targetId;
    private LocalDateTime createdAt;
}

package com.javaweb.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class AuditLogRequest {
    private Long userId;

    private String action;

    private String targetType;

    private LocalDateTime fromDate;

    private LocalDateTime toDate;
}

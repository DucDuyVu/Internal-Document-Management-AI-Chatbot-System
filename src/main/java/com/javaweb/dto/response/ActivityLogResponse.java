package com.javaweb.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
public class ActivityLogResponse {
    private Long id;

    private Long userId;

    private String userFullName;

    private String action;

    private String targetType;

    private Long targetId;

    private Map<String, Object> metadata;

    private LocalDateTime createdAt;
}

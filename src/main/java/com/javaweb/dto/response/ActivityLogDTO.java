package com.javaweb.dto.response;

import java.time.LocalDateTime;
import java.util.Map;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter

public class ActivityLogDTO {
    private Long id;

    private Long userId;

    private String userFullName;

    private String action;

    private String targetType;

    private Map<String, Object> metadata;

    private LocalDateTime createAt;
}

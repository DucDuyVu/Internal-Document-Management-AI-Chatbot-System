package com.event;

import java.util.Map;

import com.javaweb.entity.enums.ActionType;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AuditEven {
    private Long userId;

    private ActionType actionType;

    private String targetType;

    private Long targetId;

    private Map<String, Object> metadata;
}

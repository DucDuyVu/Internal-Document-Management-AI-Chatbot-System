package com.javaweb.service;

import com.javaweb.entity.UsersEntity;

import java.util.Map;

public interface ActivityLogService {
    void log(Long userId, String action, String targeType, Long targeId, Map<String, Object> metadate);
}

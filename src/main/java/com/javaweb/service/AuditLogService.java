package com.javaweb.service;

import com.event.AuditEven;
import com.javaweb.dto.response.ActivityLogResponse;
import java.util.List;

public interface AuditLogService {

    void handleAuditEvent(AuditEven event);

    List<ActivityLogResponse> getRecentActivities(Long userId, int limit);
    List<ActivityLogResponse> getDepartmentRecentActivities(Long departmentId, int limit);
    List<ActivityLogResponse> getAllRecentActivities(int limit);
}

package com.javaweb.service;

import com.event.AuditEven;
import com.javaweb.dto.request.AuditLogRequest;
import com.javaweb.dto.response.ActivityLogResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AuditLogService {
    
    void handleAuditEvent(AuditEven event);
    
    default Page<ActivityLogResponse> search(AuditLogRequest request, Pageable pageable) {
        return null;
    }
}

package com.javaweb.dto.response;

import java.util.List;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class DashboardDataResponse {
    private int documentCount;
    private int chatSessionCount;
    private int viewCount;
    private int searchCount;
    
    private LocalDateTime lastLoginTime;
    
    // Chỉ số sử dụng (Usage Metrics)
    private long storageUsedBytes;
    private long storageQuotaBytes;
    private int aiTokensUsed;
    private int aiTokensQuota;
    private int documentQuota;
    
    // Các trường dành cho cấp Quản lý (Manager)
    private boolean isManager;
    private int managedEmployeeCount;
    private String departmentName;
    private int pendingDocumentCount;
    private int pendingRequestCount;
    private int activeSessionsCount;
    
    private List<DashboardActivityDTO> recentActivities;
    private List<DashboardDocumentDTO> recentDocuments;
    
    // Dữ liệu cho Biểu đồ hoạt động
    private List<String> activityLabels;
    private List<Integer> uploadData;
    private List<Integer> aiData;
}

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
    
    private List<DashboardActivityDTO> recentActivities;
    private List<DashboardDocumentDTO> recentDocuments;
}

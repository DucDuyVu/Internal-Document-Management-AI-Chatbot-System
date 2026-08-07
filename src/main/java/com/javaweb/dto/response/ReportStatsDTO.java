package com.javaweb.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportStatsDTO {
    private int totalDocuments;
    private double approvalRate;
    private double avgProcessingHours;
    private double aiTimeSavedHours;

    // Xu hướng phát hành
    private List<String> trendLabels; // e.g., ["27/07", "28/07"]
    private List<Integer> trendDataCreated;
    private List<Integer> trendDataApproved;

    // Thống kê trạng thái
    private List<String> statusLabels;
    private List<Integer> statusData;

    // So sánh khối lượng tài liệu theo phòng ban
    private List<String> departmentLabels;
    private List<Integer> deptTotalDocs;
    private List<Integer> deptApprovedDocs;
    private List<Integer> deptPendingDocs;

    private String departmentName;
    private boolean isAdmin;
}

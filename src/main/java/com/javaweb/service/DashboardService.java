package com.javaweb.service;

import com.javaweb.dto.response.DashboardDataResponse;
import com.javaweb.dto.response.ReportStatsDTO;

public interface DashboardService {
    DashboardDataResponse getDashboardStats();
    ReportStatsDTO getManagerReportStats();
    ReportStatsDTO getAdminReportStats(Long departmentId, String startDate, String endDate);
    String generateAiReportAnalysis();
}

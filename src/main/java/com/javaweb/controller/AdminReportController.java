package com.javaweb.controller;

import com.javaweb.dto.response.ReportStatsDTO;
import com.javaweb.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReportStatsDTO> getReportStats() {
        ReportStatsDTO stats = dashboardService.getAdminReportStats();
        return ResponseEntity.ok(stats);
    }
}

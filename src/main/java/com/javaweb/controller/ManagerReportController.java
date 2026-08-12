package com.javaweb.controller;

import com.javaweb.dto.response.ReportStatsDTO;
import com.javaweb.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/manager/reports")
@RequiredArgsConstructor
public class ManagerReportController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ReportStatsDTO> getReportStats() {
        ReportStatsDTO stats = dashboardService.getManagerReportStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/ai-analysis")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<Map<String, String>> generateAiReportAnalysis() {
        String analysis = dashboardService.generateAiReportAnalysis();
        Map<String, String> response = new HashMap<>();
        response.put("content", analysis);
        return ResponseEntity.ok(response);
    }
}

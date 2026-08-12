package com.javaweb.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminMockController {

    @GetMapping("/activities")
    public ResponseEntity<?> getActivities() {
        return ResponseEntity.ok(Collections.emptyList());
    }

    @GetMapping("/statistics/departments")
    public ResponseEntity<?> getDeptStats() {
        return ResponseEntity.ok(Collections.emptyList());
    }


    @GetMapping("/audit-logs")
    public ResponseEntity<?> getAuditLogs() {
        return ResponseEntity.ok(Map.of("content", Collections.emptyList(), "totalPages", 0));
    }

    @PostMapping("/audit-logs")
    public ResponseEntity<?> createAuditLog() {
        return ResponseEntity.ok(Map.of("status", "success"));
    }
}

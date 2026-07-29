package com.javaweb.controller;

import com.javaweb.dto.response.ActivityLogResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.security.CustomUserDetails;
import com.javaweb.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/activity-logs")
public class ActivityLogController {

    @Autowired
    private AuditLogService auditLogService;

    @GetMapping("/recent")
    public ResponseEntity<List<ActivityLogResponse>> getRecentActivities(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "10") int limit) {

        UsersEntity currentUser = userDetails.getUser();
        List<ActivityLogResponse> activities = auditLogService.getRecentActivities(currentUser.getId(), limit);

        return ResponseEntity.ok(activities);
    }
}
